import { WebSocketServer, WebSocket } from "ws"
import dotenv from "dotenv"
import jwt from "jsonwebtoken"
import { randomUUID } from "crypto"
import {
  AuthMessage,
  AuthSuccessMessage,
  CreateTunnelMessage
} from "@routiq/shared"

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

const tunnels = new Map<string,Tunnel>()

const subdomainToTunnelId = new Map<string, string>()

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