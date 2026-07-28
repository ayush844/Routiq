import { randomUUID } from "crypto"
import {
  RelayHttpErrorMessage,
  RelayHttpRequestMessage,
  RelayHttpResponseChunkMessage,
  RelayHttpResponseEndMessage,
  RelayHttpResponseMessage,
  RelayHttpResponseStartMessage,
  RelayPubSubMessage,
} from "@routiq/shared"
import { getRelayId } from "../config/env.js"
import { estimateRequestBytes, forwardRequest } from "../http/forward-request.js"
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

const CROSS_RELAY_TIMEOUT_MS = 30_000

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

function resetInboundTimeout(requestId: string): void {
  const inbound = crossRelayInbound.get(requestId)
  if (!inbound) return

  clearTimeout(inbound.timeout)

  inbound.timeout = setTimeout(() => {
    const pending = crossRelayInbound.get(requestId)
    if (!pending) return

    if (!pending.reply.sent) {
      pending.reply.status(504).send("Cross-relay timeout")
    }

    crossRelayInbound.delete(requestId)
  }, CROSS_RELAY_TIMEOUT_MS)
}

function requestPath(req: any): string {
  if (req.params?.tunnelId) {
    return req.url.replace(`/test/${req.params.tunnelId}`, "") || "/"
  }

  return req.url
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
  const body = req.body ? JSON.stringify(req.body) : undefined
  const requestBytes = estimateRequestBytes(req, body)

  const timeout = setTimeout(() => {
    const pending = crossRelayInbound.get(requestId)
    if (!pending) return

    if (!pending.reply.sent) {
      pending.reply.status(504).send("Cross-relay timeout")
    }

    crossRelayInbound.delete(requestId)
  }, CROSS_RELAY_TIMEOUT_MS)

  crossRelayInbound.set(requestId, {
    reply,
    timeout,
    ownerId: meta.ownerId,
    requestBytes,
    responseBytes: 0,
  })

  const message: RelayHttpRequestMessage = {
    type: "RELAY_HTTP_REQUEST",
    requestId,
    originRelayId: getRelayId(),
    tunnelId: meta.tunnelId,
    method: req.method,
    path: requestPath(req),
    headers: req.headers,
    body,
    ownerId: meta.ownerId,
  }

  publish(requestsChannel(meta.relayId), JSON.stringify(message))

  return reply
}

export async function handleIncomingRelayRequest(
  message: RelayHttpRequestMessage
): Promise<void> {
  const tunnel = await resolveTunnel(message.tunnelId)

  if (!tunnel) {
    publishRelayError(
      message.originRelayId,
      message.requestId,
      503,
      "Tunnel offline — run routiq http to reconnect"
    )
    return
  }

  crossRelayOutbound.set(message.requestId, {
    originRelayId: message.originRelayId,
    ownerId: message.ownerId,
    requestBytes: estimateRequestBytes({ headers: message.headers }, message.body),
    responseBytes: 0,
  })

  tunnel.ws.send(
    JSON.stringify({
      type: "HTTP_REQUEST",
      requestId: message.requestId,
      tunnelId: message.tunnelId,
      method: message.method,
      path: message.path,
      headers: message.headers,
      body: message.body,
    })
  )
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

      const responseBytes =
        message.type === "RELAY_HTTP_RESPONSE" && message.body
          ? Buffer.byteLength(message.body, "utf8")
          : message.type === "RELAY_HTTP_ERROR"
            ? Buffer.byteLength(message.body, "utf8")
            : 0

      await recordBandwidth(
        inbound.ownerId,
        inbound.requestBytes + responseBytes
      )

      inbound.reply.status(message.status)

      if (message.type === "RELAY_HTTP_RESPONSE" && message.headers) {
        inbound.reply.headers(message.headers)
      }

      inbound.reply.send(message.body)
      crossRelayInbound.delete(message.requestId)
      break
    }

    case "RELAY_HTTP_RESPONSE_START": {
      const start = message as RelayHttpResponseStartMessage
      const inbound = crossRelayInbound.get(start.requestId)
      if (!inbound) return

      inbound.reply.status(start.status).headers(start.headers)
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

      await recordBandwidth(
        inbound.ownerId,
        inbound.requestBytes + inbound.responseBytes
      )

      inbound.reply.raw.end()
      crossRelayInbound.delete(end.requestId)
      break
    }

    default:
      break
  }
}

export function relayForwardResponse(
  requestId: string,
  status: number,
  headers: Record<string, string>,
  body?: string
): boolean {
  const outbound = crossRelayOutbound.get(requestId)
  if (!outbound) return false

  const message: RelayHttpResponseMessage = {
    type: "RELAY_HTTP_RESPONSE",
    requestId,
    status,
    headers,
    body,
  }

  publishToOrigin(outbound.originRelayId, message)
  crossRelayOutbound.delete(requestId)
  return true
}

export function relayForwardResponseStart(
  requestId: string,
  status: number,
  headers: Record<string, string>
): boolean {
  const outbound = crossRelayOutbound.get(requestId)
  if (!outbound) return false

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
  requestId: string,
  chunk: string
): boolean {
  const outbound = crossRelayOutbound.get(requestId)
  if (!outbound) return false

  const chunkBuffer = Buffer.from(chunk, "base64")
  outbound.responseBytes += chunkBuffer.length

  const message: RelayHttpResponseChunkMessage = {
    type: "RELAY_HTTP_RESPONSE_CHUNK",
    requestId,
    chunk,
  }

  publishToOrigin(outbound.originRelayId, message)
  return true
}

export function relayForwardResponseEnd(requestId: string): boolean {
  const outbound = crossRelayOutbound.get(requestId)
  if (!outbound) return false

  const message: RelayHttpResponseEndMessage = {
    type: "RELAY_HTTP_RESPONSE_END",
    requestId,
  }

  publishToOrigin(outbound.originRelayId, message)
  crossRelayOutbound.delete(requestId)
  return true
}
