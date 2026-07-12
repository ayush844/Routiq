import { WebSocketServer, WebSocket } from "ws"
import { randomUUID } from "crypto"
import {
  AuthFailedMessage,
  AuthMessage,
  AuthSuccessMessage,
  BandwidthExceededMessage,
  CreateTunnelMessage,
  HttpRequestMessage,
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
  countUserTunnels,
  detachTunnel,
  findTunnelByUserAndPort,
  getTunnelIdBySubdomain,
  getTunnelMeta,
  isTunnelOnThisRelay,
  reattachTunnel,
  refreshTunnelsTTL,
  registerTunnel,
  resolveTunnel,
  resolveTunnelBySubdomain,
} from "./stores/tunnel-store.js"
import { pendingRequests } from "./stores/requests.js"
import { validateToken, validateApiKey } from "./services/auth.service.js"
import { connectRedis } from "./services/redis.js"
import { checkRateLimit, retryAfterSeconds } from "./services/rate-limit.js"
import { buildBandwidthExceededMessage, isOverBandwidthQuota, recordBandwidth } from "./services/bandwidth.js"
import { GLOBAL_LIMITS, getPlanLimits } from "./config/limits.js"
import { forwardRequest } from "./http/forward-request.js"
import { getRelayId, REDIS_URL, TOKEN_SECRET } from "./config/env.js"

if (!TOKEN_SECRET && !process.env.DATABASE_URL) {
    throw new Error("TOKEN_SECRET or DATABASE_URL is required")
}

if (!REDIS_URL) {
    throw new Error("REDIS_URL is required")
}

await connectRedis(REDIS_URL)

console.log(`Relay ID: ${getRelayId()}`)

const wss = new WebSocketServer({
    port: 8080
})


const ping:PingMessage = {
  type: "PING"
}

const app = Fastify()

wss.on("connection", (ws, req) => {
  console.log("Client connected");

  const clientIp =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown"

  const client: ClientState = {
    authenticated: false,
    plan: "free",
    tunnelIds: [],
    lastPongAt: Date.now()
  }

  const healthBeatInterval = setInterval(() => {

    ws.send(
      JSON.stringify(ping)
    )
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

    await refreshTunnelsTTL(client.tunnelIds)

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
  }, 60000)

  ws.on("message", async (data) => {
    client.lastPongAt = Date.now()

    try {
      const message = JSON.parse(
        data.toString()
      )

      switch (message.type) {
        case "AUTH": {
          const authMessage = message as AuthMessage
          const token = authMessage.token

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

            const createTunnel = message as CreateTunnelMessage
            const userId = client.user!.userId
            const localPort = createTunnel.localPort

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
                url: `${tunnelMeta.subdomain}.routiq.dev`,
                port: tunnelMeta.localPort,
              }

              ws.send(JSON.stringify(tunnelCreated))

              console.log(`Tunnel reattached: ${tunnelMeta.tunnelId}`)
              console.log(`Subdomain: ${tunnelMeta.subdomain}`)
              break
            }

            const activeTunnels = await countUserTunnels(userId);
            const planLimits = getPlanLimits(client.plan);

            if (activeTunnels >= planLimits.activeTunnels) {
              const rateLimited: RateLimitedMessage = {
                type: "RATE_LIMITED",
                scope: "tunnel",
                reason: `Active tunnel limit reached (${planLimits.activeTunnels} on the ${client.plan} plan).`
              }
              ws.send(JSON.stringify(rateLimited))
              return
            }

            const tunnelId = `tun_${randomUUID()}`.replaceAll("-","").slice(0, 16);
            const subdomain = randomUUID().replaceAll("-", "").slice(0, 8)

            const tunnelMeta = await registerTunnel(
              {
                tunnelId,
                subdomain,
                localPort: createTunnel.localPort,
                protocol: createTunnel.protocol,
                ownerId: client.user!.userId,
                plan: client.plan,
              },
              ws
            );

            client.tunnelIds.push(tunnelId);


            const tunnelCreated: TunnelCreatedMessage = {
              type: "TUNNEL_CREATED",
              tunnelId,
              url: `${subdomain}.routiq.dev`,
              port: tunnelMeta.localPort
            }

            ws.send(
              JSON.stringify(tunnelCreated)
            );

            console.log(`Tunnel created: ${tunnelId}`)

            console.log(`Owner: ${client.user!.userId}`)

            console.log(`Subdomain: ${subdomain}`)

            console.log(`Test URL: http://${subdomain}.localhost:3001`)

            break
        }

        case "HTTP_RESPONSE": {
          const pendingRequest = pendingRequests.get(message.requestId);
          if(!pendingRequest) {
            console.error(`No pending request found for requestId ${message.requestId}`);
            return;
          }

          clearTimeout(pendingRequest.timeout)

          const responseBytes = message.body
            ? Buffer.byteLength(message.body, "utf8")
            : 0

          await recordBandwidth(
            pendingRequest.ownerId,
            pendingRequest.requestBytes + responseBytes
          )

          pendingRequest.reply.status(message.status).headers(message.headers).send(message.body);

          pendingRequests.delete(message.requestId)

          break;
        }

        case "HTTP_RESPONSE_START": {
          let httpMessage = message as HttpResponseStartMessage
          const pendingRequest = pendingRequests.get(httpMessage.requestId);

          if(!pendingRequest){
            console.error(`no pending request found for ${httpMessage.requestId}`);
            return;
          }

          pendingRequest.reply.status(httpMessage.status).headers(httpMessage.headers);

          break;

        }

        case "HTTP_RESPONSE_CHUNK": {

          let httpMessage = message as HttpResponseChunkMessage;
          const pendingRequest = pendingRequests.get(httpMessage.requestId);

          if(!pendingRequest){
            return;
          }

          clearTimeout(
            pendingRequest.timeout
          )

          pendingRequest.timeout = setTimeout(()=>{

            const pending = pendingRequests.get(
              httpMessage.requestId
            )

            if (!pending) return

            pending.reply.status(504).send("Tunnel timeout")

            pendingRequests.delete(
              httpMessage.requestId
            )

          }, 30000)

          const chunk = Buffer.from(httpMessage.chunk, "base64")

          pendingRequest.reply.raw.write(chunk)
          pendingRequest.responseBytes += chunk.length

          break;

        }

        case "HTTP_RESPONSE_END": {
          let httpMessage = message as HttpResponseEndMessage;
          const pendingRequest = pendingRequests.get(httpMessage.requestId);

          if(!pendingRequest){
            return;
          }

          clearTimeout(pendingRequest.timeout);

          await recordBandwidth(
            pendingRequest.ownerId,
            pendingRequest.requestBytes + pendingRequest.responseBytes
          )

          pendingRequest.reply.raw.end();

          pendingRequests.delete(httpMessage.requestId);

          break;
        }

        case "PONG": {
          client.lastPongAt = Date.now()

          if (client.tunnelIds.length > 0) {
            await refreshTunnelsTTL(client.tunnelIds)
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
  })

  ws.on("close", async () => {

    clearInterval(healthBeatInterval);
    clearInterval(healthCheckInterval);
    clearInterval(tunnelHealthInterval);

    for (const tunnelId of client.tunnelIds) {
        await detachTunnel(tunnelId);
        console.log(`Detached tunnel ${tunnelId} (kept in Redis for 24h)`);
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

console.log("Relay running on ws://localhost:8080")

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
  if(!tunnel) {
    reply.status(404).send("Tunnel not found");
    return;
  }

  if (await isOverBandwidthQuota(tunnel.ownerId, tunnel.plan)) {
    return rejectBandwidthExceeded(tunnel, reply)
  }

  return forwardRequest(
    tunnel,
    req,
    reply
  )
}

app.all<{Params: TunnelParams;}>("/test/:tunnelId", handler);

app.all<{Params: TunnelParams;}>("/test/:tunnelId/*", handler);

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
  console.log("host is >>", host);

  if (!host) {
    return reply
      .status(400)
      .send("Host header missing")
  }
  const subdomain = host?.split(".")[0];
  console.log("subdomain is: ",subdomain);

  const tunnel = await resolveTunnelBySubdomain(subdomain!)

  if (!tunnel) {
    const tunnelId = await getTunnelIdBySubdomain(subdomain!)

    if (tunnelId) {
      const meta = await getTunnelMeta(tunnelId)

      if (meta && !isTunnelOnThisRelay(meta)) {
        return reply
          .status(503)
          .send("Tunnel is on another relay instance")
      }

      if (meta) {
        return reply
          .status(503)
          .send("Tunnel offline — run routiq http to reconnect")
      }
    }

    if (!tunnelId) {
      return reply
        .status(404)
        .send("Subdomain not found")
    }

    return reply
      .status(404)
      .send("Tunnel not found")
  }

  const httpLimit = await checkRateLimit(
    "http:tunnel",
    tunnel.tunnelId,
    getPlanLimits(tunnel.plan).httpPerMin,
    60
  );

  if (!httpLimit.allowed) {
    return reply
      .status(429)
      .header("Retry-After", retryAfterSeconds(httpLimit.resetAt))
      .send("Rate limit exceeded for this tunnel");
  }

  if (await isOverBandwidthQuota(tunnel.ownerId, tunnel.plan)) {
    return rejectBandwidthExceeded(tunnel, reply)
  }

  return forwardRequest(tunnel, req, reply);
})


await app.listen({
  port: 3001
})