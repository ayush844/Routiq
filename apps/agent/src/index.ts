import WebSocket from "ws"
import {AuthMessage, AuthSuccessMessage, CreateTunnelMessage, HttpRequestMessage, HttpResponseMessage, PongMessage, TunnelCreatedMessage} from "@routiq/shared"
import { tunnels } from "./stores/tunnels.js"
import {RELAY_URL, TOKEN} from "./config/env.js"
import { handleHttpRequest } from "./services/local-request.service.js"
import {pong} from "./handlers/ping.handler.js"
import { createAuthMessage } from "./handlers/auth.handler.js"
import {createTunnel} from "./handlers/tunnel.handler.js"


if (!TOKEN) {
  throw new Error(
    "AGENT_TOKEN is missing"
  )
}

let reconnectDelay = 2000

const PORTS = [3000, 5173]

function connect() {
  console.log(`Connecting to ${RELAY_URL}...`)

  const ws = new WebSocket(RELAY_URL)

  ws.on("open", () => {
    reconnectDelay = 2000
    console.log("Connected to relay server")

    ws.send(JSON.stringify(createAuthMessage(TOKEN!)))
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

          // createTunnel(ws, 3000)
          // createTunnel(ws, 5173)

          for (const port of PORTS) {
            createTunnel(ws, port)
          }

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

            if (!port) {

              const httpResponse: HttpResponseMessage = {
                type: "HTTP_RESPONSE",
                requestId: httpRequest.requestId,
                status: 404,
                headers: {},
                body: "Tunnel not found"
              }

              ws.send(
                JSON.stringify(httpResponse)
              )

              break
            }

            console.log("HELLLLLLL")
            await handleHttpRequest(
              httpRequest, port, ws
            )

          } catch (error) {

            const errResponse: HttpResponseMessage = {
              type: "HTTP_RESPONSE",
              requestId: message.requestId,
              status: 502,
              headers: {},
              body: "Internal Server Error"
            }

            ws.send(JSON.stringify(errResponse))
          }

          break;
        }

        case "PING": {
          ws.send(JSON.stringify(pong));
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
    console.log(`Reconnecting in ${reconnectDelay / 1000}s`)
    setTimeout(() => {
      console.log("Attempting to reconnect...")

      connect()
    }, reconnectDelay);

    reconnectDelay = Math.min(reconnectDelay * 2, 30000);
  })
}

connect()