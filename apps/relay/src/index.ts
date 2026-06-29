import { WebSocketServer, WebSocket } from "ws"
import dotenv from "dotenv"
import { randomUUID } from "crypto"
import {
  AuthFailedMessage,
  AuthMessage,
  AuthSuccessMessage,
  CreateTunnelMessage,
  HttpRequestMessage,
  HttpResponseChunkMessage,
  HttpResponseEndMessage,
  HttpResponseMessage,
  HttpResponseStartMessage,
  PingMessage,
  TunnelCreatedMessage
} from "@routiq/shared"
import Fastify from "fastify"
import { ClientState, Tunnel, TunnelParams } from "./types/relay.js"
import { subdomainToTunnelId, tunnels } from "./stores/tunnels.js"
import { pendingRequests } from "./stores/requests.js"
import { validateToken } from "./services/auth.service.js"
import { forwardRequest } from "./http/forward-request.js"
import { TOKEN_SECRET } from "./config/env.js"

dotenv.config()

if (!TOKEN_SECRET) {
    throw new Error("TOKEN_SECRET is missing")
}

const wss = new WebSocketServer({
    port: 8080
})


const ping:PingMessage = {
  type: "PING"
}

const app = Fastify()

wss.on("connection", (ws) => {
  console.log("Client connected");

  const client: ClientState = {
    authenticated: false,
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
    if(age > 60000){
      console.log(`Heartbeat timeout for ${client.user?.userId}`)

      ws.terminate()
    }
  }, 10000)

  ws.on("message", (data) => {
    client.lastPongAt = Date.now()

    try {
      const message = JSON.parse(
        data.toString()
      )

      switch (message.type) {
        case "AUTH": {
          const authMessage = message as AuthMessage

          const user = validateToken(
            authMessage.token, TOKEN_SECRET!
          )

          if (!user) {
            console.log("hello1")
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

          client.authenticated = true
          client.user = user

          console.log(
            `Authenticated user: ${user.userId}`
          )

          const response: AuthSuccessMessage =
            {
              type: "AUTH_SUCCESS",
              userId: user.userId
            }

          ws.send(
            JSON.stringify(response)
          )

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

            const tunnelId = `tun_${randomUUID()}`.replaceAll("-","").slice(0, 16);
            // const subdomain = Math.random().toString(36).substring(2, 10);
            const subdomain = randomUUID().replaceAll("-", "").slice(0, 8)

            const createTunnel = message as CreateTunnelMessage

            for (const [existingId, existing] of tunnels.entries()) {
              if (
                existing.ownerId === client.user!.userId &&
                existing.localPort === createTunnel.localPort
              ) {
                subdomainToTunnelId.delete(existing.subdomain);
                tunnels.delete(existingId);
              }
            }

            const tunnel: Tunnel = {
                tunnelId,
                subdomain,
                localPort: createTunnel.localPort,
                protocol: createTunnel.protocol,
                ownerId: client.user!.userId,
                ws
            }

            tunnels.set(tunnelId, tunnel);
            subdomainToTunnelId.set(subdomain, tunnelId);

            client.tunnelIds.push(tunnelId);


            const tunnelCreated: TunnelCreatedMessage = {
              type: "TUNNEL_CREATED",
              tunnelId,
              url: `${subdomain}.routiq.dev`,
              port: tunnel.localPort
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
          console.log("Received HTTP_RESPONSE", message)
          const pendingRequest = pendingRequests.get(message.requestId);
          if(!pendingRequest) {
            console.error(`No pending request found for requestId ${message.requestId}`);
            return;
          }

          clearTimeout(pendingRequest.timeout)

          pendingRequest.reply.status(message.status).headers(message.headers).send(message.body);

          pendingRequests.delete(message.requestId)


          // setTimeout(() => {
          //   const reply = pendingRequests.get(message.requestId)

          //   if (!reply) return

          //   reply
          //     .status(504)
          //     .send("Tunnel timeout")

          //     pendingRequests.delete(message.requestId)
          //   }, 30000)
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

          pendingRequest.reply.raw.write(
            Buffer.from(
              httpMessage.chunk,
              "base64"
            )
          )

          break;

        }

        case "HTTP_RESPONSE_END": {
          let httpMessage = message as HttpResponseEndMessage;
          const pendingRequest = pendingRequests.get(httpMessage.requestId);

          if(!pendingRequest){
            return;
          }

          clearTimeout(pendingRequest.timeout);

          pendingRequest.reply.raw.end();

          pendingRequests.delete(httpMessage.requestId);

          break;
        }

        case "PONG": {
          client.lastPongAt = Date.now()
          console.log(`PONG from ${client.user?.userId}`)

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
      console.error(
        "Failed to parse message:",
        error
      )
    }
  })

  ws.on("close", () => {

    clearInterval(healthBeatInterval);
    clearInterval(healthCheckInterval);

    for (const tunnelId of client.tunnelIds) {
        subdomainToTunnelId.delete(tunnels.get(tunnelId)!.subdomain);
        tunnels.delete(tunnelId);

        console.log(`Deleted tunnel ${tunnelId}`)
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


const handler = async (req: any, reply: any) => {

  const tunnel = tunnels.get(req.params.tunnelId);
  if(!tunnel) {
    reply.status(404).send("Tunnel not found");
    return;
  }
  console.log(`Received request for tunnel ${req.params.tunnelId}`)
  console.log(`req url is ${req.url}`)

  return forwardRequest(
    tunnel,
    req,
    reply
  )
}

app.all<{Params: TunnelParams;}>("/test/:tunnelId", handler);

app.all<{Params: TunnelParams;}>("/test/:tunnelId/*", handler);

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

  const tunnelId = subdomainToTunnelId.get(subdomain!)

  if (!tunnelId) {
    return reply
      .status(404)
      .send("Subdomain not found")
  }

  const tunnel = tunnels.get(tunnelId)

  if (!tunnel) {
    return reply
      .status(404)
      .send("Tunnel not found")
  }

  return forwardRequest(tunnel, req, reply);
})


await app.listen({
  port: 3001
})