import { WebSocketServer, WebSocket } from "ws"
import { randomUUID } from "crypto"
import {
  AuthFailedMessage,
  AuthMessage,
  AuthSuccessMessage,
  BandwidthExceededMessage,
  CreateTunnelMessage,
  HttpResponseChunkMessage,
  HttpResponseEndMessage,
  HttpResponseMessage,
  HttpResponseStartMessage,
  PingMessage,
  RateLimitedMessage,
  TunnelCreatedMessage,
  TunnelExpiredMessage,
  TunnelOfflineMessage,
} from "@routiq/shared"
import Fastify from "fastify"
import { ClientState, Tunnel, TunnelParams } from "./types/relay.js"
import {
  createTunnel,
  detachTunnel,
  findTunnelByUserAndPort,
  getTunnelIdBySubdomain,
  getTunnelMeta,
  reattachTunnel,
  refreshTunnelsTTL,
  resolveTunnel,
  resolveTunnelBySubdomain,
} from "./stores/tunnel-store.js"
import { pendingRequests } from "./stores/requests.js"
import { armPendingTimeout, failPendingRequestsFor } from "./http/forward-request.js"
import { sendFullReply, startStreamedReply } from "./http/proxy-helpers.js"
import { validateToken, validateApiKey } from "./services/auth.service.js"
import { connectRedis, disconnectRedis } from "./services/redis.js"
import {
  connectPubSub,
  disconnectPubSub,
  requestsChannel,
} from "./services/redis-pubsub.js"
import {
  failOutboundRequestsFor,
  handleIncomingRelayRequest,
  handleIncomingRelayResponse,
  relayForwardResponse,
  relayForwardResponseChunk,
  relayForwardResponseEnd,
  relayForwardResponseStart,
  routeHttpRequest,
} from "./services/relay-http.js"
import { checkRateLimit, retryAfterSeconds } from "./services/rate-limit.js"
import { renderErrorPage } from "./http/error-page.js"
import { buildBandwidthExceededMessage, isOverBandwidthQuota, recordBandwidth } from "./services/bandwidth.js"
import {
  AUTH_TIMEOUT_MS,
  GLOBAL_LIMITS,
  MAX_REQUEST_BODY_BYTES,
  MAX_WS_MESSAGE_BYTES,
  getPlanLimits,
} from "./config/limits.js"
import {
  buildTunnelUrl,
  getRelayId,
  HTTP_PORT,
  REDIS_URL,
  TOKEN_SECRET,
  WS_PORT,
} from "./config/env.js"

if (!TOKEN_SECRET && !process.env.DATABASE_URL) {
    throw new Error("TOKEN_SECRET or DATABASE_URL is required")
}

if (!REDIS_URL) {
    throw new Error("REDIS_URL is required")
}

await connectRedis(REDIS_URL)

await connectPubSub(REDIS_URL, getRelayId(), (channel, payload) => {
  try {
    if (channel === requestsChannel(getRelayId())) {
      void handleIncomingRelayRequest(JSON.parse(payload))
      return
    }

    void handleIncomingRelayResponse(payload)
  } catch (error) {
    console.error("Pub/sub message handler error:", error)
  }
})

console.log(`Relay ID: ${getRelayId()}`)

const wss = new WebSocketServer({
  port: WS_PORT,
  host: "0.0.0.0",
  // Default is 100 MB.
  maxPayload: MAX_WS_MESSAGE_BYTES,
})


const ping:PingMessage = {
  type: "PING"
}

// Trust only NGINX, so a fake X-Forwarded-For can't change req.ip.
const app = Fastify({ trustProxy: 1, bodyLimit: MAX_REQUEST_BODY_BYTES })

// Accept any body as raw bytes so it is forwarded unchanged.
app.removeAllContentTypeParsers()
app.addContentTypeParser(
  "*",
  { parseAs: "buffer" },
  (_req, body, done) => done(null, body)
)

// NGINX sets X-Real-IP, so the client can't spoof it.
function getClientIp(req: { headers: Record<string, unknown>; socket: { remoteAddress?: string } }): string {
  const realIp = req.headers["x-real-ip"]
  if (typeof realIp === "string" && realIp) return realIp
  return req.socket.remoteAddress || "unknown"
}

function isValidPort(port: unknown): port is number {
  return Number.isInteger(port) && (port as number) >= 1 && (port as number) <= 65535
}

wss.on("connection", (ws, req) => {
  console.log("Client connected");

  const clientIp = getClientIp(req)

  const client: ClientState = {
    authenticated: false,
    plan: "free",
    tunnelIds: [],
    lastPongAt: Date.now()
  }

  // Close sockets that never authenticate.
  const authTimeout = setTimeout(() => {
    if (!client.authenticated) ws.terminate()
  }, AUTH_TIMEOUT_MS)

  const healthBeatInterval = setInterval(() => {
    if (ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify(ping))
  }, 30000)

  const healthCheckInterval = setInterval(() => {
    const age = Date.now() - client.lastPongAt;
    if (age > 120000) {
      console.log(`Heartbeat timeout for ${client.user?.userId}`)

      if (
        ws.readyState === WebSocket.OPEN &&
        client.tunnelIds.length > 0
      ) {
        const offline: TunnelOfflineMessage = {
          type: "TUNNEL_OFFLINE",
          reason: "Connection lost. Tunnel is temporarily offline.",
        }
        ws.send(JSON.stringify(offline))
      }

      setTimeout(() => ws.terminate(), 100)
    }
  }, 10000)

  const tunnelHealthInterval = setInterval(async () => {
    if (!client.authenticated || client.tunnelIds.length === 0) return

    // Catch errors, or an unhandled rejection crashes the relay.
    try {
      await checkTunnelsStillRegistered()
    } catch (error) {
      console.error("Tunnel health check failed:", error)
    }
  }, 60000)

  async function checkTunnelsStillRegistered() {
    await refreshTunnelsTTL(client.tunnelIds, ws)

    for (const tunnelId of client.tunnelIds) {
      const meta = await getTunnelMeta(tunnelId)
      if (meta) continue

      console.log(`Tunnel expired in Redis: ${tunnelId}`)

      if (ws.readyState === WebSocket.OPEN) {
        const expired: TunnelExpiredMessage = {
          type: "TUNNEL_EXPIRED",
          reason:
            "Tunnel expired after 24 hours. Run routiq http again for a new URL.",
          tunnelId,
        }
        ws.send(JSON.stringify(expired))
      }

      setTimeout(() => ws.close(), 100)
      return
    }
  }

  const handleMessage = async (message: any) => {
    try {
      switch (message.type) {
        case "AUTH": {
          if (client.authenticated) break

          const authMessage = message as AuthMessage
          const token = authMessage.token
          if (typeof token !== "string") break

          const authLimit = await checkRateLimit(
            "auth:ip",
            clientIp,
            GLOBAL_LIMITS.wsAuthPerMin,
            60
          )

          if (!authLimit.allowed) {
            const rateLimited: RateLimitedMessage = {
              type: "RATE_LIMITED",
              scope: "auth",
              reason: "Too many authentication attempts. Try again shortly.",
              retryAfter: retryAfterSeconds(authLimit.resetAt)
            }
            ws.send(JSON.stringify(rateLimited))

            setTimeout(() => {
              ws.close()
            }, 100)

            return
          }

          let userId: string | null = null
          let plan = "free"

          if (token.startsWith("rtq_")) {
            const result = await validateApiKey(token)
            if (result) {
              userId = result.userId
              plan = result.plan
            }
          } else if (TOKEN_SECRET) {
            const jwtResult = validateToken(token, TOKEN_SECRET)
            if (jwtResult) userId = jwtResult.userId
          }

          if (!userId) {
            const authFailed: AuthFailedMessage = {
              type: "AUTH_FAILED",
              reason: "Invalid token"
            }
            ws.send(JSON.stringify(authFailed))

            setTimeout(() => {
              ws.close()
            }, 100)

            return
          }

          clearTimeout(authTimeout)
          client.authenticated = true
          client.user = { userId, role: "user" }
          client.plan = plan

          console.log(`Authenticated user: ${userId} (plan: ${plan})`)

          const response: AuthSuccessMessage = {
            type: "AUTH_SUCCESS",
            userId
          }

          ws.send(JSON.stringify(response))

          break
        }

        case "CREATE_TUNNEL": {
            if (!client.authenticated) {
              
              const authFailed:AuthFailedMessage = {
                type: "AUTH_FAILED",
                reason: "Invalid token"
              }
              ws.send(
                  JSON.stringify(authFailed)
              )

              setTimeout(() => {
                ws.close()
              }, 100)
              return
            }

            const createMsg = message as CreateTunnelMessage
            const userId = client.user!.userId
            const localPort = createMsg.localPort

            if (!isValidPort(localPort) || createMsg.protocol !== "http") {
              console.warn(`Rejected CREATE_TUNNEL with invalid port/protocol from ${userId}`)
              break
            }

            const existing = await findTunnelByUserAndPort(userId, localPort)

            if (existing) {
              const tunnelMeta = await reattachTunnel(
                existing.tunnelId,
                ws,
                client.plan
              )

              if (!tunnelMeta) break

              if (!client.tunnelIds.includes(existing.tunnelId)) {
                client.tunnelIds.push(existing.tunnelId)
              }

              const tunnelCreated: TunnelCreatedMessage = {
                type: "TUNNEL_CREATED",
                tunnelId: tunnelMeta.tunnelId,
                url: buildTunnelUrl(tunnelMeta.subdomain),
                port: tunnelMeta.localPort,
              }

              ws.send(JSON.stringify(tunnelCreated))

              console.log(`Tunnel reattached: ${tunnelMeta.tunnelId}`)
              console.log(`Subdomain: ${tunnelMeta.subdomain}`)
              break
            }

            const planLimits = getPlanLimits(client.plan)
            const tunnelId = `tun_${randomUUID().replaceAll("-", "")}`

            const tunnelMeta = await createTunnel(
              {
                tunnelId,
                localPort,
                protocol: createMsg.protocol,
                ownerId: userId,
                plan: client.plan,
              },
              ws,
              planLimits.activeTunnels
            )

            if (!tunnelMeta) {
              const rateLimited: RateLimitedMessage = {
                type: "RATE_LIMITED",
                scope: "tunnel",
                reason: `Active tunnel limit reached (${planLimits.activeTunnels} on the ${client.plan} plan). Port ${localPort} was not exposed.`
              }
              ws.send(JSON.stringify(rateLimited))
              break
            }

            const subdomain = tunnelMeta.subdomain
            client.tunnelIds.push(tunnelId);


            const tunnelCreated: TunnelCreatedMessage = {
              type: "TUNNEL_CREATED",
              tunnelId,
              url: buildTunnelUrl(subdomain),
              port: tunnelMeta.localPort
            }

            ws.send(
              JSON.stringify(tunnelCreated)
            );

            console.log(`Tunnel created: ${tunnelId}`)

            console.log(`Owner: ${client.user!.userId}`)

            console.log(`Subdomain: ${subdomain}`)

            console.log(`Test URL: ${buildTunnelUrl(subdomain)}`)

            break
        }

        case "HTTP_RESPONSE":
        case "HTTP_RESPONSE_START":
        case "HTTP_RESPONSE_CHUNK":
        case "HTTP_RESPONSE_END": {
          // Only the agent a request was sent to may answer it.
          if (!client.authenticated) break
          await handleAgentResponse(ws, message)
          break
        }

        case "PONG": {
          client.lastPongAt = Date.now()

          if (client.tunnelIds.length > 0) {
            await refreshTunnelsTTL(client.tunnelIds, ws)
          }

          break
        }

        default: {
          if (!client.authenticated) {
            const authFailed:AuthFailedMessage = {
              type: "AUTH_FAILED",
              reason: "Invalid token"
            }
            ws.send(
              JSON.stringify(authFailed)
            )

            setTimeout(() => {
              ws.close()
            }, 100)
            return
          }

          console.log(
            "Received authenticated message:",
            message
          )
        }
      }
    } catch (error) {
      console.error("WebSocket message handler error:", error)
    }
  }

  // AUTH and CREATE_TUNNEL run one at a time, in order.
  let controlQueue = Promise.resolve()

  ws.on("message", (data) => {
    client.lastPongAt = Date.now()

    let message: any
    try {
      message = JSON.parse(data.toString())
    } catch {
      return
    }

    if (message?.type === "AUTH" || message?.type === "CREATE_TUNNEL") {
      controlQueue = controlQueue.then(() => handleMessage(message))
    } else {
      void handleMessage(message)
    }
  })

  ws.on("close", async () => {

    clearTimeout(authTimeout);
    clearInterval(healthBeatInterval);
    clearInterval(healthCheckInterval);
    clearInterval(tunnelHealthInterval);

    // Answer waiting visitors now instead of after the timeout.
    failPendingRequestsFor(ws, "Tunnel disconnected")
    failOutboundRequestsFor(ws, "Tunnel disconnected")

    for (const tunnelId of client.tunnelIds) {
      try {
        // Pass ws so an old socket can't detach a reconnected tunnel.
        await detachTunnel(tunnelId, ws);
        console.log(`Detached tunnel ${tunnelId} (kept in Redis for 24h)`);
      } catch (error) {
        console.error(`Failed to detach tunnel ${tunnelId}:`, error)
      }
    }
    console.log(
      "Client disconnected"
    )
  })

  ws.on("error", (error) => {
    console.error(
      "WebSocket error:",
      error
    )
  })
})

console.log(`Relay ${getRelayId()} listening on ws://0.0.0.0:${WS_PORT} and http://0.0.0.0:${HTTP_PORT}`)

// Send an agent's response to the waiting visitor.
async function handleAgentResponse(
  ws: WebSocket,
  message:
    | HttpResponseMessage
    | HttpResponseStartMessage
    | HttpResponseChunkMessage
    | HttpResponseEndMessage
): Promise<void> {
  // Request came from another relay: send it back there.
  switch (message.type) {
    case "HTTP_RESPONSE":
      if (relayForwardResponse(ws, message.requestId, message.status, message.headers, message.body)) return
      break
    case "HTTP_RESPONSE_START":
      if (relayForwardResponseStart(ws, message.requestId, message.status, message.headers)) return
      break
    case "HTTP_RESPONSE_CHUNK":
      if (relayForwardResponseChunk(ws, message.requestId, message.chunk)) return
      break
    case "HTTP_RESPONSE_END":
      if (relayForwardResponseEnd(ws, message.requestId)) return
      break
  }

  // Request is waiting on this relay.
  const pending = pendingRequests.get(message.requestId)
  if (!pending || pending.ws !== ws) return

  switch (message.type) {
    case "HTTP_RESPONSE": {
      clearTimeout(pending.timeout)
      pendingRequests.delete(message.requestId)

      const responseBytes = message.body
        ? Buffer.byteLength(message.body, "utf8")
        : 0

      await recordBandwidth(pending.ownerId, pending.requestBytes + responseBytes)
      sendFullReply(pending.reply, message.status, message.headers, message.body)
      return
    }

    case "HTTP_RESPONSE_START": {
      armPendingTimeout(message.requestId)
      startStreamedReply(pending.reply, message.status, message.headers)
      return
    }

    case "HTTP_RESPONSE_CHUNK": {
      armPendingTimeout(message.requestId)

      const chunk = Buffer.from(message.chunk, "base64")
      pending.reply.raw.write(chunk)
      pending.responseBytes += chunk.length
      return
    }

    case "HTTP_RESPONSE_END": {
      clearTimeout(pending.timeout)
      pendingRequests.delete(message.requestId)

      await recordBandwidth(pending.ownerId, pending.requestBytes + pending.responseBytes)
      pending.reply.raw.end()
      return
    }
  }
}

async function rejectBandwidthExceeded(tunnel: Tunnel, reply: any) {
  if (tunnel.ws.readyState === WebSocket.OPEN) {
    const payload = await buildBandwidthExceededMessage(
      tunnel.ownerId,
      tunnel.plan
    )

    const msg: BandwidthExceededMessage = {
      type: "BANDWIDTH_EXCEEDED",
      ...payload,
    }

    tunnel.ws.send(JSON.stringify(msg))
  }

  return reply.status(429).send("Daily bandwidth limit exceeded")
}


const handler = async (req: any, reply: any) => {

  const tunnel = await resolveTunnel(req.params.tunnelId);
  const meta = tunnel ? null : await getTunnelMeta(req.params.tunnelId);

  if (!tunnel && !meta) {
    reply.status(404).send("Tunnel not found");
    return;
  }

  const tunnelId = tunnel?.tunnelId ?? meta!.tunnelId
  const ownerId = tunnel?.ownerId ?? meta!.ownerId
  const plan = tunnel?.plan ?? meta!.plan

  // Same rate limit as the subdomain route.
  const httpLimit = await checkRateLimit(
    "http:tunnel",
    tunnelId,
    getPlanLimits(plan).httpPerMin,
    60
  )

  if (!httpLimit.allowed) {
    return reply
      .status(429)
      .header("Retry-After", retryAfterSeconds(httpLimit.resetAt))
      .send("Rate limit exceeded for this tunnel")
  }

  if (await isOverBandwidthQuota(ownerId, plan)) {
    if (tunnel) {
      return rejectBandwidthExceeded(tunnel, reply)
    }

    return reply.status(429).send("Daily bandwidth limit exceeded")
  }

  return routeHttpRequest(tunnel, meta, req, reply)
}

app.all<{Params: TunnelParams;}>("/test/:tunnelId", handler);

app.all<{Params: TunnelParams;}>("/test/:tunnelId/*", handler);

app.get("/health", async (_req, reply) => {
  return reply.send({ ok: true, relayId: getRelayId() })
})

app.get("/auth/verify", async (req, reply) => {
  const verifyLimit = await checkRateLimit(
    "verify:ip",
    req.ip,
    GLOBAL_LIMITS.verifyPerMin,
    60
  );

  if (!verifyLimit.allowed) {
    return reply
      .status(429)
      .header("Retry-After", retryAfterSeconds(verifyLimit.resetAt))
      .send({ error: "Too many requests" });
  }

  const auth = req.headers.authorization;

  if (!auth?.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "Missing token" });
  }

  const token = auth.slice("Bearer ".length).trim();
  let userId: string | null = null;

  if (token.startsWith("rtq_")) {
    const result = await validateApiKey(token);
    if (result) userId = result.userId;
  } else if (TOKEN_SECRET) {
    const jwtResult = validateToken(token, TOKEN_SECRET);
    if (jwtResult) userId = jwtResult.userId;
  }

  if (!userId) {
    return reply.status(401).send({ error: "Invalid token" });
  }

  return reply.send({ userId });
});

app.all("/*", async (req, reply) => {
  const host = req.headers.host;

  if (!host) {
    return reply
      .status(400)
      .send("Host header missing")
  }
  // Hostnames are case-insensitive; subdomains are stored lowercase.
  const subdomain = host.split(".")[0].toLowerCase();

  const tunnel = await resolveTunnelBySubdomain(subdomain!)

  let meta = null

  if (!tunnel) {
    const tunnelId = await getTunnelIdBySubdomain(subdomain!)

    if (!tunnelId) {
      return reply
        .status(404)
        .type("text/html")
        .send(
          renderErrorPage(
            404,
            "Subdomain not found",
            "There's no active Routiq tunnel at this address. Double-check the URL, or if this one's yours, make sure <code>routiq http</code> is still running."
          )
        )
    }

    meta = await getTunnelMeta(tunnelId)

    if (!meta) {
      return reply
        .status(404)
        .type("text/html")
        .send(
          renderErrorPage(
            404,
            "Tunnel not found",
            "This tunnel no longer exists — it may have expired or been closed."
          )
        )
    }
  }

  const tunnelId = tunnel?.tunnelId ?? meta!.tunnelId
  const plan = tunnel?.plan ?? meta!.plan
  const ownerId = tunnel?.ownerId ?? meta!.ownerId

  const httpLimit = await checkRateLimit(
    "http:tunnel",
    tunnelId,
    getPlanLimits(plan).httpPerMin,
    60
  );

  if (!httpLimit.allowed) {
    return reply
      .status(429)
      .header("Retry-After", retryAfterSeconds(httpLimit.resetAt))
      .send("Rate limit exceeded for this tunnel");
  }

  if (await isOverBandwidthQuota(ownerId, plan)) {
    if (tunnel) {
      return rejectBandwidthExceeded(tunnel, reply)
    }

    return reply.status(429).send("Daily bandwidth limit exceeded")
  }

  return routeHttpRequest(tunnel, meta, req, reply);
})


await app.listen({
  port: HTTP_PORT,
  host: "0.0.0.0",
})

let shuttingDown = false

async function shutdown(signal: string) {
  if (shuttingDown) return
  shuttingDown = true

  console.log(`${signal} received — shutting down relay ${getRelayId()}`)

  // Ask agents to reconnect to another relay now.
  for (const socket of wss.clients) {
    socket.close(1001, "Relay shutting down")
  }

  wss.close()
  await app.close()
  // Let close handlers update Redis first.
  await new Promise((resolve) => setTimeout(resolve, 500))
  await disconnectPubSub()
  await disconnectRedis()

  process.exit(0)
}

process.on("SIGTERM", () => void shutdown("SIGTERM"))
process.on("SIGINT", () => void shutdown("SIGINT"))