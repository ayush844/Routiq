import { randomUUID } from "crypto"
import { Tunnel } from "../types/relay.js"
import { pendingRequests } from "../stores/requests.js"

function estimateRequestBytes(req: any, body?: string): number {
  let size = body ? Buffer.byteLength(body, "utf8") : 0

  const contentLength = req.headers["content-length"]
  if (contentLength) {
    size = Math.max(size, parseInt(contentLength, 10) || 0)
  }

  return size + 500
}

export async function forwardRequest(
  tunnel: Tunnel,
  req: any,
  reply: any
) {
  const requestId = randomUUID()

  const timeout = setTimeout(() => {
    const pending = pendingRequests.get(requestId)

    if (!pending) return

    pending.reply.status(504).send("Tunnel timeout")

    pendingRequests.delete(requestId)
  }, 30000)

  const body = req.body ? JSON.stringify(req.body) : undefined
  const requestBytes = estimateRequestBytes(req, body)

  pendingRequests.set(requestId, {
    reply,
    timeout,
    createdAt: Date.now(),
    ownerId: tunnel.ownerId,
    requestBytes,
    responseBytes: 0,
  })

  const path = req.params?.tunnelId ? req.url.replace(`/test/${req.params.tunnelId}`,"") || "/" : req.url

  const ws = tunnel.ws;

  ws.send(
    JSON.stringify({
      type: "HTTP_REQUEST",

      requestId,

      tunnelId: tunnel.tunnelId,

      method: req.method,

      path: path,

      headers: req.headers,

      body
    })
  )

  return reply;

}
