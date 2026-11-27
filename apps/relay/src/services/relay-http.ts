import { randomUUID } from "crypto"
import { WebSocket } from "ws"
import {
  HttpRequestMessage,
  RelayHttpErrorMessage,
  RelayHttpRequestMessage,
  RelayHttpResponseChunkMessage,
  RelayHttpResponseEndMessage,
  RelayHttpResponseMessage,
  RelayHttpResponseStartMessage,
  RelayPubSubMessage,
} from "@routiq/shared"
import { getRelayId } from "../config/env.js"
import { REQUEST_TIMEOUT_MS } from "../config/limits.js"
import { forwardRequest } from "../http/forward-request.js"
import {
  encodeRequestBody,
  estimateRequestBytes,
  failReply,
  requestPath,
  ResponseHeaders,
  sendFullReply,
  startStreamedReply,
} from "../http/proxy-helpers.js"
import { recordBandwidth } from "./bandwidth.js"
import {
  crossRelayInbound,
  crossRelayOutbound,
} from "../stores/relay-forward.js"
import {
  isTunnelOnThisRelay,
  resolveTunnel,
} from "../stores/tunnel-store.js"
import { Tunnel, TunnelMeta } from "../types/relay.js"
import {
  publish,
  requestsChannel,
  responsesChannel,
} from "./redis-pubsub.js"

function publishToOrigin(originRelayId: string, message: RelayPubSubMessage): void {
  publish(responsesChannel(originRelayId), JSON.stringify(message))
}

function publishRelayError(
  originRelayId: string,
  requestId: string,
  status: number,
  body: string
): void {
  const message: RelayHttpErrorMessage = {
    type: "RELAY_HTTP_ERROR",
    requestId,
    status,
    body,
  }

  publishToOrigin(originRelayId, message)
}

// --- Relay that received the visitor's request ---

function inboundTimeout(requestId: string): NodeJS.Timeout {
  return setTimeout(() => {
    const pending = crossRelayInbound.get(requestId)
    if (!pending) return

    crossRelayInbound.delete(requestId)
    failReply(pending.reply, 504, "Cross-relay timeout")
  }, REQUEST_TIMEOUT_MS)
}

function resetInboundTimeout(requestId: string): void {
  const inbound = crossRelayInbound.get(requestId)
  if (!inbound) return

  clearTimeout(inbound.timeout)
  inbound.timeout = inboundTimeout(requestId)
}

export async function routeHttpRequest(
  tunnel: Tunnel | null,
  meta: TunnelMeta | null,
  req: any,
  reply: any
): Promise<any> {
  if (tunnel) {
    return forwardRequest(tunnel, req, reply)
  }

  if (meta) {
    if (isTunnelOnThisRelay(meta)) {
      return reply
        .status(503)
        .send("Tunnel offline — run routiq http to reconnect")
    }

    return forwardCrossRelay(meta, req, reply)
  }

  return reply.status(404).send("Tunnel not found")
}

export async function forwardCrossRelay(
  meta: TunnelMeta,
  req: any,
  reply: any
): Promise<any> {
  const requestId = randomUUID()
  const encoded = encodeRequestBody(req.body)

  crossRelayInbound.set(requestId, {
    reply,
    timeout: inboundTimeout(requestId),
    ownerId: meta.ownerId,
    requestBytes: estimateRequestBytes(req.headers, encoded.bytes),
    responseBytes: 0,
  })

  reply.raw.on("close", () => {
    if (reply.raw.writableFinished) return

    const pending = crossRelayInbound.get(requestId)
    if (!pending) return

    clearTimeout(pending.timeout)
    crossRelayInbound.delete(requestId)
  })

  const message: RelayHttpRequestMessage = {
    type: "RELAY_HTTP_REQUEST",
    requestId,
    originRelayId: getRelayId(),
    tunnelId: meta.tunnelId,
    method: req.method,
    path: requestPath(req),
    headers: req.headers,
    body: encoded.body,
    bodyBase64: encoded.bodyBase64,
    ownerId: meta.ownerId,
  }

  publish(requestsChannel(meta.relayId), JSON.stringify(message))

  return reply
}

export async function handleIncomingRelayResponse(payload: string): Promise<void> {
  let message: RelayPubSubMessage

  try {
    message = JSON.parse(payload) as RelayPubSubMessage
  } catch {
    console.error("Invalid relay pub/sub payload")
    return
  }

  switch (message.type) {
    case "RELAY_HTTP_ERROR":
    case "RELAY_HTTP_RESPONSE": {
      const inbound = crossRelayInbound.get(message.requestId)
      if (!inbound) return

      clearTimeout(inbound.timeout)
      crossRelayInbound.delete(message.requestId)

      const responseBytes = message.body
        ? Buffer.byteLength(message.body, "utf8")
        : 0

      await recordBandwidth(
        inbound.ownerId,
        inbound.requestBytes + responseBytes
      )

      const headers =
        message.type === "RELAY_HTTP_RESPONSE" ? message.headers : undefined

      sendFullReply(inbound.reply, message.status, headers, message.body)
      break
    }

    case "RELAY_HTTP_RESPONSE_START": {
      const start = message as RelayHttpResponseStartMessage
      const inbound = crossRelayInbound.get(start.requestId)
      if (!inbound) return

      resetInboundTimeout(start.requestId)
      startStreamedReply(inbound.reply, start.status, start.headers)
      break
    }

    case "RELAY_HTTP_RESPONSE_CHUNK": {
      const chunkMessage = message as RelayHttpResponseChunkMessage
      const inbound = crossRelayInbound.get(chunkMessage.requestId)
      if (!inbound) return

      resetInboundTimeout(chunkMessage.requestId)

      const chunk = Buffer.from(chunkMessage.chunk, "base64")
      inbound.reply.raw.write(chunk)
      inbound.responseBytes += chunk.length
      break
    }

    case "RELAY_HTTP_RESPONSE_END": {
      const end = message as RelayHttpResponseEndMessage
      const inbound = crossRelayInbound.get(end.requestId)
      if (!inbound) return

      clearTimeout(inbound.timeout)
      crossRelayInbound.delete(end.requestId)

      await recordBandwidth(
        inbound.ownerId,
        inbound.requestBytes + inbound.responseBytes
      )

      inbound.reply.raw.end()
      break
    }

    default:
      break
  }
}

// --- Relay that holds the agent's socket ---

function outboundTimeout(requestId: string): NodeJS.Timeout {
  return setTimeout(() => {
    // Agent never finished: drop the entry so it can't leak.
    crossRelayOutbound.delete(requestId)
  }, REQUEST_TIMEOUT_MS)
}

export async function handleIncomingRelayRequest(
  message: RelayHttpRequestMessage
): Promise<void> {
  const tunnel = await resolveTunnel(message.tunnelId)

  if (!tunnel || tunnel.ws.readyState !== WebSocket.OPEN) {
    publishRelayError(
      message.originRelayId,
      message.requestId,
      503,
      "Tunnel offline — run routiq http to reconnect"
    )
    return
  }

  const bodyBytes = message.bodyBase64
    ? Buffer.from(message.bodyBase64, "base64").length
    : message.body
      ? Buffer.byteLength(message.body, "utf8")
      : 0

  crossRelayOutbound.set(message.requestId, {
    originRelayId: message.originRelayId,
    ws: tunnel.ws,
    timeout: outboundTimeout(message.requestId),
    ownerId: message.ownerId,
    requestBytes: estimateRequestBytes(message.headers, bodyBytes),
    responseBytes: 0,
  })

  const request: HttpRequestMessage = {
    type: "HTTP_REQUEST",
    requestId: message.requestId,
    tunnelId: message.tunnelId,
    method: message.method,
    path: message.path,
    headers: message.headers,
    body: message.body,
    bodyBase64: message.bodyBase64,
  }

  tunnel.ws.send(JSON.stringify(request))
}

// Entry only if `from` is the socket the request was sent to.
function ownedOutbound(requestId: string, from: WebSocket) {
  const outbound = crossRelayOutbound.get(requestId)
  if (!outbound || outbound.ws !== from) return null
  return outbound
}

// Fail all cross-relay requests served by this agent.
export function failOutboundRequestsFor(ws: WebSocket, reason: string): void {
  for (const [requestId, outbound] of crossRelayOutbound) {
    if (outbound.ws !== ws) continue

    clearTimeout(outbound.timeout)
    crossRelayOutbound.delete(requestId)
    publishRelayError(outbound.originRelayId, requestId, 502, reason)
  }
}

export function relayForwardResponse(
  from: WebSocket,
  requestId: string,
  status: number,
  headers: ResponseHeaders,
  body?: string
): boolean {
  const outbound = ownedOutbound(requestId, from)
  if (!outbound) return false

  clearTimeout(outbound.timeout)
  crossRelayOutbound.delete(requestId)

  const message: RelayHttpResponseMessage = {
    type: "RELAY_HTTP_RESPONSE",
    requestId,
    status,
    headers,
    body,
  }

  publishToOrigin(outbound.originRelayId, message)
  return true
}

export function relayForwardResponseStart(
  from: WebSocket,
  requestId: string,
  status: number,
  headers: ResponseHeaders
): boolean {
  const outbound = ownedOutbound(requestId, from)
  if (!outbound) return false

  clearTimeout(outbound.timeout)
  outbound.timeout = outboundTimeout(requestId)

  const message: RelayHttpResponseStartMessage = {
    type: "RELAY_HTTP_RESPONSE_START",
    requestId,
    status,
    headers,
  }

  publishToOrigin(outbound.originRelayId, message)
  return true
}

export function relayForwardResponseChunk(
  from: WebSocket,
  requestId: string,
  chunk: string
): boolean {
  const outbound = ownedOutbound(requestId, from)
  if (!outbound) return false

  clearTimeout(outbound.timeout)
  outbound.timeout = outboundTimeout(requestId)

  // Byte size of the base64 chunk.
  const padding = chunk.endsWith("==") ? 2 : chunk.endsWith("=") ? 1 : 0
  outbound.responseBytes += Math.floor((chunk.length * 3) / 4) - padding

  const message: RelayHttpResponseChunkMessage = {
    type: "RELAY_HTTP_RESPONSE_CHUNK",
    requestId,
    chunk,
  }

  publishToOrigin(outbound.originRelayId, message)
  return true
}

export function relayForwardResponseEnd(
  from: WebSocket,
  requestId: string
): boolean {
  const outbound = ownedOutbound(requestId, from)
  if (!outbound) return false

  clearTimeout(outbound.timeout)
  crossRelayOutbound.delete(requestId)

  const message: RelayHttpResponseEndMessage = {
    type: "RELAY_HTTP_RESPONSE_END",
    requestId,
  }

  publishToOrigin(outbound.originRelayId, message)
  return true
}
