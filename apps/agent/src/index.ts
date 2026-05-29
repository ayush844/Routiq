import WebSocket from "ws"
import dotenv from "dotenv"
import {AuthMessage, AuthSuccessMessage} from "@routiq/shared"

dotenv.config()

const RELAY_URL = process.env.RELAY_URL || "ws://localhost:8080"

const TOKEN = process.env.AGENT_TOKEN

if (!TOKEN) {
  throw new Error(
    "AGENT_TOKEN is missing"
  )
}

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

  ws.on("message", (data) => {
    try {
      const message = JSON.parse(
        data.toString()
      )

      switch (message.type) {
        case "AUTH_SUCCESS": {
          const authSuccess = message as AuthSuccessMessage

          console.log(`Authenticated as ${authSuccess.userId}`)
          break
        }

        case "AUTH_FAILED":
          console.log("Authentication failed")
          ws.close()
          break

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

    setTimeout(() => {
      console.log("Attempting to reconnect...")

      connect()
    }, 2000)
  })
}

connect()