import { WebSocketServer } from "ws"
import dotenv from "dotenv"
import jwt from "jsonwebtoken"

import {
  AuthMessage,
  AuthSuccessMessage
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
}

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
    authenticated: false
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

            ws.close()

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

        default: {
          if (!client.authenticated) {

            ws.send(
              JSON.stringify({
                type: "AUTH_FAILED",
                reason:
                  "Invalid token"
              })
            )

            ws.close()
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