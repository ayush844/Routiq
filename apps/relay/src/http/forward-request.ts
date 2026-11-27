import { randomUUID } from "crypto"
import { WebSocket } from "ws"
import { HttpRequestMessage } from "@routiq/shared"
import { Tunnel } from "../types/relay.js"
import { pendingRequests } from "../stores/requests.js"
import { REQUEST_TIMEOUT_MS } from "../config/limits.js"
import {
  encodeRequestBody,
  estimateRequestBytes,
  failReply,
  requestPath,
} from "./proxy-helpers.js"

export { estimateRequestBytes } from "./proxy-helpers.js"

function pendingTimeout(requestId: string): NodeJS.Timeout {
  return setTimeout(() => {
    const pending = pendingRequests.get(requestId)
    if (!pending) return

    pendingRequests.delete(requestId)
    failReply(pending.reply, 504, "Tunnel timeout")
  }, REQUEST_TIMEOUT_MS)
}

// Restart the timeout (called on every chunk).
export function armPendingTimeout(requestId: string): void {
  const pending = pendingRequests.get(requestId)
  if (!pending) return

  clearTimeout(pending.timeout)
  pending.timeout = pendingTimeout(requestId)
}

// Fail all requests waiting on this agent.
export function failPendingRequestsFor(ws: WebSocket, reason: string): void {
  for (const [requestId, pending] of pendingRequests) {
    if (pending.ws !== ws) continue

    clearTimeout(pending.timeout)
    pendingRequests.delete(requestId)
    failReply(pending.reply, 502, reason)
  }
}

export async function forwardRequest(
  tunnel: Tunnel,
  req: any,
  reply: any
) {
  if (tunnel.ws.readyState !== WebSocket.OPEN) {
    return reply
      .status(503)
      .send("Tunnel offline — run routiq http to reconnect")
  }

  const requestId = randomUUID()
  const encoded = encodeRequestBody(req.body)

  pendingRequests.set(requestId, {
    reply,
    ws: tunnel.ws,
    timeout: pendingTimeout(requestId),
    createdAt: Date.now(),
    ownerId: tunnel.ownerId,
    requestBytes: estimateRequestBytes(req.headers, encoded.bytes),
    responseBytes: 0,
  })

  // Visitor left: forget the request.
  reply.raw.on("close", () => {
    if (reply.raw.writableFinished) return

    const pending = pendingRequests.get(requestId)
    if (!pending) return

    clearTimeout(pending.timeout)
    pendingRequests.delete(requestId)
  })

  const message: HttpRequestMessage = {
    type: "HTTP_REQUEST",
    requestId,
    tunnelId: tunnel.tunnelId,
    method: req.method,
    path: requestPath(req),
    headers: req.headers,
    body: encoded.body,
    bodyBase64: encoded.bodyBase64,
  }

  tunnel.ws.send(JSON.stringify(message))

  return reply
}
