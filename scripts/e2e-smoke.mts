// End-to-end test: local apps <- agent <- WebSocket <- relay(s) <- HTTP visitor.
//
// Starts local test servers, two relays (to test cross-relay forwarding over
// Redis pub/sub) and agents, then sends real requests. Uses JWT auth, so no
// Postgres is needed. Needs Docker for the Redis container.
//
//   docker run -d --rm -p 127.0.0.1:6390:6379 --name routiq-test-redis redis:7-alpine
//   cd apps/agent && ../../node_modules/.bin/tsx ../../scripts/e2e-smoke.mts
//
// Env: E2E_REDIS_URL, E2E_REDIS_CONTAINER, E2E_SKIP_SLOW=1 (skips the 30s timeout test).
import { spawn, execSync, ChildProcess } from "node:child_process"
import http from "node:http"
import net from "node:net"
import zlib from "node:zlib"
import crypto from "node:crypto"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { createRequire } from "node:module"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const require = createRequire(`${ROOT}/apps/relay/package.json`)
const jwt = require("jsonwebtoken")
const WebSocket = require("ws")
const { startAgent } = await import(`${ROOT}/apps/agent/src/agent.ts`)

const SECRET = "e2e-secret"
const REDIS_URL = process.env.E2E_REDIS_URL ?? "redis://127.0.0.1:6390"
const REDIS_CONTAINER = process.env.E2E_REDIS_CONTAINER ?? "routiq-test-redis"
const SKIP_SLOW = process.env.E2E_SKIP_SLOW === "1"
const PORT_A = 4567
const PORT_B = 4568
const DEAD_PORT = 4599
const R1 = { ws: "ws://127.0.0.1:18081", http: 13001 }
const R2 = { ws: "ws://127.0.0.1:18082", http: 13002 }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const tokenFor = (userId: string) => jwt.sign({ userId, role: "user" }, SECRET)
const redisCli = (...args: string[]) =>
  execSync(`docker exec ${REDIS_CONTAINER} redis-cli ${args.map((a) => `'${a}'`).join(" ")}`).toString().trim()

const results: { name: string; ok: boolean; detail: string }[] = []
function check(name: string, ok: boolean, detail = "") {
  results.push({ name, ok, detail })
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  -> ${detail}`}`)
}

// ---------- local apps ----------
const BIG = crypto.randomBytes(20 * 1024 * 1024)
const BIG_SHA = crypto.createHash("sha256").update(BIG).digest("hex")
const serverBHits: string[] = []

const appA = http.createServer((req, res) => {
  const chunks: Buffer[] = []
  req.on("data", (c) => chunks.push(c))
  req.on("end", () => {
    const body = Buffer.concat(chunks)
    const url = new URL(req.url!, "http://x")
    switch (url.pathname) {
      case "/json":
        res.setHeader("content-type", "application/json")
        res.setHeader("x-custom", "yes")
        res.setHeader("set-cookie", ["a=1; Path=/", "b=2; Path=/"])
        return res.end(JSON.stringify({ hello: "world" }))
      case "/inspect":
        res.setHeader("content-type", "application/json")
        return res.end(JSON.stringify({ method: req.method, url: req.url, headers: req.headers }))
      case "/redirect":
        res.writeHead(302, { location: "/json" })
        return res.end()
      case "/nocontent":
        res.writeHead(204)
        return res.end()
      case "/gzip": {
        const gz = zlib.gzipSync("x".repeat(5000))
        res.writeHead(200, { "content-type": "text/plain", "content-encoding": "gzip", "content-length": gz.length })
        return res.end(gz)
      }
      case "/echo":
        res.setHeader("content-type", "application/octet-stream")
        return res.end(body)
      case "/upload-size":
        return res.end(JSON.stringify({ bytes: body.length, sha: crypto.createHash("sha256").update(body).digest("hex") }))
      case "/big":
        res.writeHead(200, { "content-type": "application/octet-stream" })
        return res.end(BIG)
      case "/slow-stream":
        res.writeHead(200, { "content-type": "text/plain" })
        res.write("part1-")
        return setTimeout(() => res.end("part2"), 300)
      case "/id": {
        const n = url.searchParams.get("n")
        return setTimeout(() => res.end(`id-${n}`), Math.random() * 50)
      }
      case "/hang":
        return // never answers
      default:
        res.writeHead(404)
        return res.end("nope")
    }
  })
})
const appB = http.createServer((req, res) => {
  serverBHits.push(req.url!)
  res.end("server-b")
})
await new Promise<void>((r) => appA.listen(PORT_A, r))
await new Promise<void>((r) => appB.listen(PORT_B, r))

// ---------- relays ----------
const relays: Record<string, ChildProcess> = {}
// Never leave relays running, even if the test crashes.
process.on("exit", () => {
  for (const p of Object.values(relays)) p.kill("SIGKILL")
})
function startRelay(id: string, wsPort: number, httpPort: number) {
  // Run node directly (not the tsx CLI wrapper) so signals reach the relay.
  const p = spawn(process.execPath, ["--import", "tsx", "src/index.ts"], {
    cwd: `${ROOT}/apps/relay`,
    env: {
      ...process.env,
      TOKEN_SECRET: SECRET,
      DATABASE_URL: "",
      REDIS_URL,
      RELAY_ID: id,
      WS_PORT: String(wsPort),
      HTTP_PORT: String(httpPort),
      PUBLIC_HTTP_PORT: String(httpPort),
      TUNNEL_DOMAIN: "localhost",
      PUBLIC_TUNNEL_SCHEME: "http",
    },
    stdio: ["ignore", "pipe", "pipe"],
  })
  p.stderr!.on("data", (d) => {
    const s = String(d)
    if (!s.includes("Token verification failed") && !s.includes("JsonWebTokenError") && !s.trim().startsWith("at ")) {
      process.stderr.write(`[${id} err] ${s}`)
    }
  })
  relays[id] = p
  return new Promise<void>((resolve) => {
    p.stdout!.on("data", (d) => {
      if (String(d).includes("listening")) resolve()
    })
  })
}
await Promise.all([startRelay("e2e-r1", 18081, R1.http), startRelay("e2e-r2", 18082, R2.http)])
await sleep(300)

// ---------- agents ----------
type AgentHandle = {
  agent: any
  tunnels: Map<number, { url: string; tunnelId: string; sub: string }>
  events: string[]
}
// All test agents share 127.0.0.1, so reset the per-IP login limit first.
const resetAuthLimit = () =>
  redisCli("EVAL", 'for _,k in ipairs(redis.call("KEYS","ratelimit:auth:*")) do redis.call("DEL",k) end', "0")

function newAgent(userId: string, ports: number[], relayWs: string, expected = ports.length) {
  resetAuthLimit()
  return new Promise<AgentHandle>((resolve, reject) => {
    const handle: AgentHandle = { agent: null, tunnels: new Map(), events: [] }
    const done = () => {
      if (handle.tunnels.size + handle.events.filter((e) => e.startsWith("rate")).length >= expected) resolve(handle)
    }
    handle.agent = startAgent({
      ports,
      relayUrl: relayWs,
      token: tokenFor(userId),
      onTunnelCreated(t: any) {
        handle.tunnels.set(t.port, { url: t.url, tunnelId: t.tunnelId, sub: new URL(t.url).hostname.split(".")[0] })
        done()
      },
      onRateLimited(info: any) { handle.events.push(`rate:${info.scope}`); done() },
      onBandwidthExceeded() { handle.events.push("bandwidth") },
      onTunnelOffline() { handle.events.push("offline") },
      onReconnect() { handle.events.push("reconnect") },
      onAuthFailed() { reject(new Error("auth failed")) },
      onStopped() { handle.events.push("stopped") },
    })
    setTimeout(() => reject(new Error(`agent ${userId} timed out`)), 10_000)
  })
}

type Res = { status: number; headers: http.IncomingHttpHeaders; body: Buffer; ms: number }
function visit(port: number, sub: string, p: string, init: { method?: string; headers?: Record<string, string>; body?: Buffer | string; host?: string } = {}) {
  const started = Date.now()
  return new Promise<Res>((resolve, reject) => {
    const req = http.request(
      { host: "127.0.0.1", port, path: p, method: init.method ?? "GET", headers: { host: init.host ?? `${sub}.localhost`, ...(init.headers ?? {}) } },
      (res) => {
        const chunks: Buffer[] = []
        res.on("data", (c) => chunks.push(c))
        res.on("end", () => resolve({ status: res.statusCode!, headers: res.headers, body: Buffer.concat(chunks), ms: Date.now() - started }))
        res.on("error", reject)
      }
    )
    req.on("error", reject)
    if (init.body) req.write(init.body)
    req.end()
  })
}
const sha = (b: Buffer) => crypto.createHash("sha256").update(b).digest("hex")

const main = await newAgent("user-main", [PORT_A], R1.ws)
const SUB = main.tunnels.get(PORT_A)!.sub
const TUNNEL_ID = main.tunnels.get(PORT_A)!.tunnelId
console.log("tunnel:", main.tunnels.get(PORT_A)!.url)

// Long request timeout test runs in the background while the rest runs.
const slowTimeout = SKIP_SLOW ? null : visit(R1.http, SUB, "/hang")

const binary = Buffer.from([0x00, 0xff, 0xfe, 0x80, 0x41, 0x0a, 0xc3, 0x28])

// ---------- 1. proxy fidelity, both paths ----------
for (const [label, port] of [["same-relay", R1.http], ["cross-relay", R2.http]] as const) {
  const json = await visit(port, SUB, "/json")
  check(`${label}: status 200`, json.status === 200, String(json.status))
  check(`${label}: content-type forwarded`, json.headers["content-type"] === "application/json", String(json.headers["content-type"]))
  check(`${label}: custom header forwarded`, json.headers["x-custom"] === "yes", String(json.headers["x-custom"]))
  check(`${label}: both set-cookie headers`, (json.headers["set-cookie"] ?? []).length === 2, JSON.stringify(json.headers["set-cookie"]))

  const inspect = JSON.parse((await visit(port, SUB, "/inspect?a=1&b=x%20y", { method: "PATCH", headers: { "x-req": "hello" } })).body.toString())
  check(`${label}: method, path, query, request header kept`, inspect.method === "PATCH" && inspect.url === "/inspect?a=1&b=x%20y" && inspect.headers["x-req"] === "hello", JSON.stringify(inspect).slice(0, 200))

  const redirect = await visit(port, SUB, "/redirect")
  check(`${label}: 302 passed through`, redirect.status === 302 && redirect.headers.location === "/json", `${redirect.status} ${redirect.headers.location}`)

  const noContent = await visit(port, SUB, "/nocontent")
  check(`${label}: 204 works`, noContent.status === 204, String(noContent.status))

  const head = await visit(port, SUB, "/json", { method: "HEAD" })
  check(`${label}: HEAD works`, head.status === 200, String(head.status))

  const gz = await visit(port, SUB, "/gzip", { headers: { "accept-encoding": "gzip" } })
  check(`${label}: gzip body readable`, gz.status === 200 && gz.body.toString() === "x".repeat(5000) && !gz.headers["content-encoding"], `${gz.status} enc=${gz.headers["content-encoding"]} len=${gz.body.length}`)

  const text = await visit(port, SUB, "/echo", { method: "POST", headers: { "content-type": "text/plain" }, body: "hello" })
  check(`${label}: text body unchanged`, text.body.toString() === "hello", text.body.toString())

  const form = await visit(port, SUB, "/echo", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "a=1&b=2" })
  check(`${label}: form post`, form.status === 200 && form.body.toString() === "a=1&b=2", `${form.status} ${form.body.toString()}`)

  const json2 = await visit(port, SUB, "/echo", { method: "POST", headers: { "content-type": "application/json" }, body: '{"b":1,  "a":2}' })
  check(`${label}: JSON body byte-exact`, json2.body.toString() === '{"b":1,  "a":2}', json2.body.toString())

  const bin = await visit(port, SUB, "/echo", { method: "POST", headers: { "content-type": "application/octet-stream" }, body: binary })
  check(`${label}: binary body byte-exact`, bin.status === 200 && bin.body.equals(binary), `${bin.status} ${bin.body.toString("hex")}`)

  const multipart = await visit(port, SUB, "/echo", { method: "POST", headers: { "content-type": "multipart/form-data; boundary=XY" }, body: "--XY\r\nContent-Disposition: form-data; name=\"f\"\r\n\r\nv\r\n--XY--\r\n" })
  check(`${label}: multipart`, multipart.status === 200, String(multipart.status))

  const stream = await visit(port, SUB, "/slow-stream")
  check(`${label}: streamed body complete`, stream.body.toString() === "part1-part2", stream.body.toString())

  const big = await visit(port, SUB, "/big")
  check(`${label}: 20 MB download intact`, big.status === 200 && sha(big.body) === BIG_SHA, `${big.status} len=${big.body.length} in ${big.ms}ms`)

  const upload = crypto.randomBytes(9 * 1024 * 1024)
  const up = await visit(port, SUB, "/upload-size", { method: "POST", headers: { "content-type": "application/octet-stream" }, body: upload })
  const upInfo = up.status === 200 ? JSON.parse(up.body.toString()) : {}
  check(`${label}: 9 MB upload intact`, up.status === 200 && upInfo.sha === sha(upload), `${up.status} ${up.body.toString().slice(0, 100)}`)

  const tooBig = await visit(port, SUB, "/upload-size", { method: "POST", headers: { "content-type": "application/octet-stream" }, body: crypto.randomBytes(11 * 1024 * 1024) })
  check(`${label}: 11 MB upload rejected with 413`, tooBig.status === 413, String(tooBig.status))

  const many = await Promise.all(Array.from({ length: 100 }, (_, i) => visit(port, SUB, `/id?n=${i}`)))
  const mismatched = many.filter((r, i) => r.body.toString() !== `id-${i}`).length
  check(`${label}: 100 concurrent requests matched correctly`, mismatched === 0, `${mismatched} mismatched`)
}

// ---------- 2. routing edge cases ----------
const unknown = await visit(R1.http, "doesnotexist", "/")
check("unknown subdomain -> 404 page", unknown.status === 404 && unknown.body.toString().includes("<html"), String(unknown.status))

const upper = await visit(R1.http, SUB, "/json", { host: `${SUB.toUpperCase()}.LOCALHOST` })
check("uppercase Host header works", upper.status === 200, String(upper.status))

const viaTest = await visit(R1.http, "x", `/test/${TUNNEL_ID}/inspect?q=1`)
check("/test/:tunnelId route strips prefix", viaTest.status === 200 && JSON.parse(viaTest.body.toString()).url === "/inspect?q=1", `${viaTest.status} ${viaTest.body.toString().slice(0, 80)}`)

// Raw request target that would turn localhost:PORT into user@host.
const ssrfStatus = await new Promise<string>((resolve) => {
  const s = net.connect(R1.http, "127.0.0.1", () => {
    s.write(`GET @127.0.0.1:${PORT_B}/secret HTTP/1.1\r\nHost: ${SUB}.localhost\r\nConnection: close\r\n\r\n`)
  })
  let data = ""
  s.on("data", (d) => (data += d))
  s.on("close", () => resolve(data.split("\r\n")[0]))
  s.on("error", () => resolve("error"))
})
check("odd request target can't reach another local port", !serverBHits.some((h) => h.includes("secret")), `${ssrfStatus} hits=${JSON.stringify(serverBHits)}`)

// ---------- 3. multiple ports, local server down ----------
const multi = await newAgent("user-multi", [PORT_A, PORT_B, DEAD_PORT], R2.ws)
const rA = await visit(R1.http, multi.tunnels.get(PORT_A)!.sub, "/id?n=7")
const rB = await visit(R1.http, multi.tunnels.get(PORT_B)!.sub, "/anything")
check("multi-port: each URL hits its own port", rA.body.toString() === "id-7" && rB.body.toString() === "server-b", `${rA.body} / ${rB.body}`)
const dead = await visit(R1.http, multi.tunnels.get(DEAD_PORT)!.sub, "/")
check("local server down -> 502 with hint", dead.status === 502 && dead.body.toString().includes("localhost:4599"), `${dead.status} ${dead.body.toString()}`)
multi.agent.stop()

// ---------- 4. plan limits ----------
// Free plan = 3 active tunnels. A 4th port must be refused without killing the other 3.
const limited = await newAgent("user-limit", [PORT_A, PORT_B, DEAD_PORT, 4598], R1.ws, 4)
await sleep(300)
const stillUp = limited.tunnels.size === 3 ? await visit(R1.http, limited.tunnels.get(PORT_A)!.sub, "/id?n=1") : null
check("4th tunnel refused, first 3 keep working", limited.tunnels.size === 3 && limited.events.includes("rate:tunnel") && stillUp?.status === 200 && !limited.events.includes("stopped"), `tunnels=${limited.tunnels.size} events=${limited.events} status=${stillUp?.status}`)
limited.agent.stop()

// Two CLIs for the same user at once must not beat the limit either.
const [raceA, raceB] = await Promise.all([
  newAgent("user-race", [4581, 4582], R1.ws),
  newAgent("user-race", [4583, 4584], R2.ws),
])
const raceTotal = raceA.tunnels.size + raceB.tunnels.size
check("parallel CLIs can't beat the tunnel limit", raceTotal === 3, `tunnels=${raceTotal}`)
raceA.agent.stop()
raceB.agent.stop()

// Stopped tunnels must not count: run 3 ports one after another, then a 4th.
for (const p of [4591, 4592, 4593]) {
  const a = await newAgent("user-seq", [p], R1.ws)
  a.agent.stop()
  await sleep(200)
}
const fourth = await newAgent("user-seq", [4594], R1.ws).catch((e) => ({ tunnels: new Map(), events: [String(e)], agent: null }) as any)
check("stopped tunnels don't count toward the limit", fourth.tunnels.size === 1, `events=${fourth.events}`)
fourth.agent?.stop()

// ---------- 5. rate limit + bandwidth ----------
const windowNo = Math.floor(Date.now() / 60000)
redisCli("SET", `ratelimit:http:tunnel:${TUNNEL_ID}:${windowNo}`, "2000", "EX", "60")
const limitedReq = await visit(R2.http, SUB, "/id?n=1")
check("per-tunnel rate limit -> 429 + Retry-After", limitedReq.status === 429 && !!limitedReq.headers["retry-after"], `${limitedReq.status} ${limitedReq.headers["retry-after"]}`)
redisCli("DEL", `ratelimit:http:tunnel:${TUNNEL_ID}:${windowNo}`)

const day = new Date().toISOString().slice(0, 10)
redisCli("SET", `bandwidth:user-main:${day}`, String(6 * 1024 ** 3))
const overQuota = await visit(R1.http, SUB, "/id?n=1")
await sleep(200)
check("bandwidth quota -> 429 and CLI notified", overQuota.status === 429 && main.events.includes("bandwidth"), `${overQuota.status} events=${main.events}`)
redisCli("DEL", `bandwidth:user-main:${day}`)

// ---------- 6. failures ----------
// Agent dies while a request is in flight: visitor must get 502 fast, not wait 30s.
const failer = await newAgent("user-failer", [PORT_A], R1.ws)
for (const [label, port] of [["same-relay", R1.http], ["cross-relay", R2.http]] as const) {
  const f = await newAgent(`user-failer-${label}`, [PORT_A], R1.ws)
  const pending = visit(port, f.tunnels.get(PORT_A)!.sub, "/hang")
  await sleep(300)
  f.agent.stop()
  const r = await pending
  check(`${label}: agent disconnect mid-request -> fast 502`, r.status === 502 && r.ms < 3000, `${r.status} in ${r.ms}ms`)
}
failer.agent.stop()

// Visitor aborts a big download: relay must stay healthy.
await new Promise<void>((resolve) => {
  const req = http.request({ host: "127.0.0.1", port: R2.http, path: "/big", headers: { host: `${SUB}.localhost` } }, (res) => {
    res.once("data", () => { req.destroy(); resolve() })
  })
  req.end()
})
await sleep(500)
const afterAbort = await visit(R2.http, SUB, "/id?n=3")
check("visitor abort mid-download: relay still fine", afterAbort.status === 200 && afterAbort.body.toString() === "id-3", String(afterAbort.status))

// Reconnect race: B reattaches the tunnel, then A's old socket closes.
const second = await newAgent("user-main", [PORT_A], R1.ws)
check("reconnect keeps the same URL", second.tunnels.get(PORT_A)!.sub === SUB)
main.agent.stop()
await sleep(500)
const afterOldClose = await visit(R1.http, SUB, "/json")
check("old socket closing doesn't take tunnel offline", afterOldClose.status === 200, String(afterOldClose.status))
second.agent.stop()
await sleep(500)
const offline = await visit(R1.http, SUB, "/json")
check("stopped tunnel -> 503", offline.status === 503, String(offline.status))

// ---------- 7. auth hardening ----------
let rateLimited = false
for (let i = 0; i < 11; i++) {
  const msg = await new Promise<string>((resolve) => {
    const ws = new WebSocket(R2.ws, { headers: { "x-forwarded-for": `10.0.0.${i}` } })
    ws.on("open", () => ws.send(JSON.stringify({ type: "AUTH", token: "bad" })))
    ws.on("message", (d: Buffer) => { resolve(JSON.parse(d.toString()).type); ws.terminate() })
    ws.on("error", () => resolve("error"))
  })
  if (msg === "RATE_LIMITED") rateLimited = true
}
check("spoofed X-Forwarded-For can't bypass auth rate limit", rateLimited)

const closedFast = await new Promise<boolean>((resolve) => {
  const ws = new WebSocket(R1.ws)
  const t = setTimeout(() => resolve(false), 13_000)
  ws.on("close", () => { clearTimeout(t); resolve(true) })
})
check("idle unauthenticated socket closed", closedFast)

const sneaky = await new Promise<string>((resolve) => {
  const ws = new WebSocket(R1.ws)
  ws.on("open", () => {
    ws.send(JSON.stringify({ type: "HTTP_RESPONSE", requestId: "x", status: 200, headers: {}, body: "hi" }))
    ws.send(JSON.stringify({ type: "CREATE_TUNNEL", localPort: 3000, protocol: "http" }))
  })
  ws.on("message", (d: Buffer) => { resolve(JSON.parse(d.toString()).type); ws.terminate() })
  setTimeout(() => resolve("none"), 2000)
})
check("unauthenticated CREATE_TUNNEL refused", sneaky === "AUTH_FAILED", sneaky)

// ---------- 8. slow local server ----------
if (slowTimeout) {
  // main was stopped above, so the hang ends either by timeout (504) or by disconnect (502).
  const r = await slowTimeout
  check("silent local server -> 504/502, never hangs", r.status === 504 || r.status === 502, `${r.status} in ${r.ms}ms`)
}
const slowAgent = SKIP_SLOW ? null : await newAgent("user-slow", [PORT_A], R1.ws)
if (slowAgent) {
  const r = await visit(R2.http, slowAgent.tunnels.get(PORT_A)!.sub, "/hang")
  check("30s inactivity -> 504 (cross-relay)", r.status === 504 && r.ms >= 29_000 && r.ms < 35_000, `${r.status} in ${r.ms}ms`)
  slowAgent.agent.stop()
}

// ---------- 9. Redis crash ----------
const survivor = await newAgent("user-survivor", [PORT_A], R2.ws)
execSync(`docker restart ${REDIS_CONTAINER}`)
await sleep(1500)
const afterRedis = await visit(R2.http, survivor.tunnels.get(PORT_A)!.sub, "/id?n=9").catch((e) => ({ status: -1, body: Buffer.from(String(e)) }) as any)
check("relays survive a Redis restart", relays["e2e-r1"].exitCode === null && relays["e2e-r2"].exitCode === null, `r1=${relays["e2e-r1"].exitCode} r2=${relays["e2e-r2"].exitCode}`)
check("after Redis data loss: clean 404, no crash", afterRedis.status === 404 || afterRedis.status === 200, `${afterRedis.status}`)
survivor.agent.stop()

// ---------- 10. graceful shutdown ----------
const draining = await newAgent("user-drain", [PORT_A], R2.ws)
const before = draining.events.length
relays["e2e-r2"].kill("SIGTERM")
await sleep(1500)
check("SIGTERM: agents told to reconnect right away", draining.events.slice(before).includes("reconnect"), `events=${draining.events}`)
const exited = await new Promise<number | null>((r) => (relays["e2e-r2"].exitCode !== null ? r(relays["e2e-r2"].exitCode) : relays["e2e-r2"].once("exit", (c) => r(c))))
check("SIGTERM: relay exits cleanly (code 0)", exited === 0, String(exited))
draining.agent.stop()

// ---------- report ----------
const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} passed`)
for (const f of failed) console.log(`FAILED: ${f.name} -> ${f.detail}`)

for (const p of Object.values(relays)) p.kill("SIGTERM")
appA.close()
appB.close()
process.exit(failed.length ? 1 : 0)
