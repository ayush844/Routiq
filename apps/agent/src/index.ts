import WebSocket from "ws"
import dotenv from "dotenv"
import {AuthMessage, AuthSuccessMessage, CreateTunnelMessage, HttpRequestMessage, HttpResponseMessage, TunnelCreatedMessage} from "@routiq/shared"

dotenv.config()

const RELAY_URL = process.env.RELAY_URL || "ws://localhost:8080"

const TOKEN = process.env.AGENT_TOKEN

if (!TOKEN) {
  throw new Error(
    "AGENT_TOKEN is missing"
  )
}

const tunnels = new Map<string, number>();

function connect() {
  console.log(`Connecting to ${RELAY_URL}...`)

  const ws = new WebSocket(RELAY_URL)

  ws.on("open", () => {
    console.log("Connected to relay server")

    const authMessage: AuthMessage = {
      type: "AUTH",
      token: TOKEN!
    }

    ws.send(JSON.stringify(authMessage))
  })

  ws.on("message", async (data) => {
    try {
      const message = JSON.parse(
        data.toString()
      )

      switch (message.type) {
        case "AUTH_SUCCESS": {
          const authSuccess = message as AuthSuccessMessage

          console.log(`Authenticated as ${authSuccess.userId}`)

            const createTunnelMessage: CreateTunnelMessage = {
                type: "CREATE_TUNNEL",
                localPort: 3000,
                protocol: "http"
            }

            ws.send(JSON.stringify(createTunnelMessage));

          break
        }

        case "AUTH_FAILED":
          console.log("Authentication failed")
          ws.close()
          break

        case "TUNNEL_CREATED": {
          const tunnel = message as TunnelCreatedMessage;
          tunnels.set(tunnel.tunnelId, tunnel.port);
          console.log(`${tunnel.tunnelId} Tunnel created: ${tunnel.url} -> localhost:${tunnel.port}`);

          break;
        }

        case "HTTP_REQUEST": {
          console.log("Received HTTP request:", message)

          try {

            const httpRequest = message as HttpRequestMessage
            const port = tunnels.get(httpRequest.tunnelId)

            const options: RequestInit = {
              method: httpRequest.method,
              headers: httpRequest.headers
            }

            if (httpRequest.method !== "GET" && httpRequest.method !== "HEAD") {
              options.body = httpRequest.body
            }

            const response = await fetch(`http://localhost:${port}${httpRequest.path}`,
              options
            )
            const body = await response.text()

            const httpResponse: HttpResponseMessage = {
              type: "HTTP_RESPONSE",

              requestId:
                message.requestId,

              status:
                response.status,

              headers:
                Object.fromEntries(
                  response.headers
                ),

              body
            }

            ws.send(JSON.stringify(httpResponse))
            
          } catch (error) {
            ws.send(JSON.stringify({
              type: "HTTP_RESPONSE",
              requestId: message.requestId,
              status: 502,
              headers: {},
              body: "Internal Server Error"
            }))
          }

          break;
        }

        default:
          console.log("Unknown message:", message)
      }
    } catch (error) {
      console.error("Failed to parse message:", error)
    }
  })

  ws.on("error", (err) => {
    console.error("WebSocket error:", err.message)
  })

  ws.on("close", () => {
    console.log("Disconnected from relay")
    tunnels.clear()
    setTimeout(() => {
      console.log("Attempting to reconnect...")

      connect()
    }, 2000)
  })
}

connect()