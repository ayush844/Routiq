import { WebSocketServer, WebSocket } from "ws"
import dotenv from "dotenv"
import jwt from "jsonwebtoken"
import { randomUUID } from "crypto"
import {
  AuthMessage,
  AuthSuccessMessage,
  CreateTunnelMessage
} from "@routiq/shared"
import Fastify, { FastifyReply, FastifyRequest } from "fastify"


dotenv.config()

const TOKEN_SECRET = process.env.TOKEN_SECRET

if (!TOKEN_SECRET) {
    throw new Error("TOKEN_SECRET is missing")
}

const wss = new WebSocketServer({
    port: 8080
})

type JwtPayload = {
    userId: string
    role: string
}

type ClientState = {
    authenticated: boolean
    user?: JwtPayload
    tunnelIds: string[]
}

type Tunnel = {
  tunnelId: string
  subdomain: string
  localPort: number
  protocol: "http" | "tcp"
  ownerId: string
  ws: WebSocket
}

type TunnelParams = {
  tunnelId: string
  "*": string
}

type PendingRequest = {
  reply: FastifyReply
  timeout: NodeJS.Timeout
  createdAt: number
}

const tunnels = new Map<string,Tunnel>()

const subdomainToTunnelId = new Map<string, string>()

const pendingRequests = new Map<string, PendingRequest>()


const app = Fastify()

function validateToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, TOKEN_SECRET!)

    if (
      typeof decoded === "object" &&
      "userId" in decoded &&
      "role" in decoded
    ) {
      return decoded as JwtPayload
    }

    return null
  } catch (error) {
    console.error(
      "Token verification failed:",
      error
    )

    return null
  }
}

wss.on("connection", (ws) => {
  console.log("Client connected")

  const client: ClientState = {
    authenticated: false,
    tunnelIds: []
  }

  ws.on("message", (data) => {
    try {
      const message = JSON.parse(
        data.toString()
      )

      switch (message.type) {
        case "AUTH": {
          const authMessage =
            message as AuthMessage

          const user =
            validateToken(
              authMessage.token
            )

          if (!user) {
            console.log("hello1")
            ws.send(
              JSON.stringify({
                type: "AUTH_FAILED",
                reason:
                  "Invalid token"
              })
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
                ws.send(
                    JSON.stringify({
                        type: "AUTH_FAILED",
                        reason:
                        "Invalid token"
                    })
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

            ws.send(
                JSON.stringify({
                    type: "TUNNEL_CREATED",
                    tunnelId,
                    url: `${subdomain}.routiq.dev`,
                    port: tunnel.localPort
                })
            );

            console.log(`Tunnel created: ${tunnelId}`)

            console.log(`Owner: ${client.user!.userId}`)

            console.log(`Subdomain: ${subdomain}`)

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

        default: {
          if (!client.authenticated) {

            ws.send(
              JSON.stringify({
                type: "AUTH_FAILED",
                reason:
                  "Invalid token"
              })
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
  const requestId = randomUUID()

  const timeout = setTimeout(() => {
    const pending = pendingRequests.get(requestId)

    if (!pending) return

    pending.reply.status(504).send("Tunnel timeout")

    pendingRequests.delete(requestId)
  }, 30000)

  pendingRequests.set(requestId, {
    reply,
    timeout,
    createdAt: Date.now()
  })

  const tunnel = tunnels.get(req.params.tunnelId);
  if(!tunnel) {
    reply.status(404).send("Tunnel not found");
    return;
  }
  console.log(`Received request for tunnel ${req.params.tunnelId}`)
  console.log(`req url is ${req.url}`)
  // const path = "/" + (req.params["*"] ?? "")

  const path = req.url.replace(`/test/${req.params.tunnelId}`, "") || "/"

  const ws = tunnel.ws;

  console.log("req body in relay is: ", req.body)
  const body = req.body ? JSON.stringify(req.body) : undefined;

  // reply.hijack();

  ws.send(
    JSON.stringify({
      type: "HTTP_REQUEST",

      requestId,

      tunnelId: tunnel.tunnelId,

      method: req.method,

      path: path,
      // path: req.url,

      headers: req.headers,

      body
    })
  )

  return reply;
}

app.all<{Params: TunnelParams;}>("/test/:tunnelId", handler);

app.all<{Params: TunnelParams;}>("/test/:tunnelId/*", handler);

await app.listen({
  port: 3001
})