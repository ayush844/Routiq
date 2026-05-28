import WebSocket from "ws"

const ws = new WebSocket("ws://localhost:8080")

ws.on("open", () => {
  console.log("Connected to relay")

  ws.send(
    JSON.stringify({
      type: "HELLO_FROM_AGENT"
    })
  )
})

ws.on("message", (data) => {
  console.log(
    "Message from relay:",
    data.toString()
  )
})