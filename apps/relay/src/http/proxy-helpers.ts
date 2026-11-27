import type { FastifyReply } from "fastify"

export type ResponseHeaders = Record<string, string | string[]>

// Connection-level headers, never forwarded.
const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-connection",
  "transfer-encoding",
  "upgrade",
  "te",
  "trailer",
  "proxy-authenticate",
  "proxy-authorization",
])

// fetch() already decompressed the body, so these headers are wrong.
const STRIPPED_RESPONSE_HEADERS = new Set([
  ...HOP_BY_HOP,
  "content-encoding",
  "content-length",
])

export function sanitizeResponseHeaders(
  headers: ResponseHeaders | undefined
): ResponseHeaders {
  const clean: ResponseHeaders = {}
  if (!headers) return clean

  for (const [key, value] of Object.entries(headers)) {
    if (STRIPPED_RESPONSE_HEADERS.has(key.toLowerCase())) continue
    clean[key] = value
  }

  return clean
}

export type EncodedBody = {
  // Valid UTF-8 text.
  body?: string
  // Binary, as base64.
  bodyBase64?: string
  bytes: number
}

// Encode the raw body: text if valid UTF-8, otherwise base64.
export function encodeRequestBody(raw: unknown): EncodedBody {
  if (raw === undefined || raw === null) return { bytes: 0 }

  const buffer = Buffer.isBuffer(raw)
    ? raw
    : Buffer.from(typeof raw === "string" ? raw : JSON.stringify(raw))

  if (buffer.length === 0) return { bytes: 0 }

  const text = buffer.toString("utf8")
  if (Buffer.from(text, "utf8").equals(buffer)) {
    return { body: text, bytes: buffer.length }
  }

  return { bodyBase64: buffer.toString("base64"), bytes: buffer.length }
}

// Rough request size for bandwidth (body + ~headers).
export function estimateRequestBytes(
  headers: Record<string, unknown>,
  bodyBytes: number
): number {
  let size = bodyBytes

  const contentLength = headers["content-length"]
  if (typeof contentLength === "string") {
    size = Math.max(size, parseInt(contentLength, 10) || 0)
  }

  return size + 500
}

// Remove the `/test/:tunnelId` prefix.
export function requestPath(req: any): string {
  if (req.params?.tunnelId) {
    return req.url.replace(`/test/${req.params.tunnelId}`, "") || "/"
  }

  return req.url
}

// Start a streamed response. Hijack + writeHead, or the headers are lost.
export function startStreamedReply(
  reply: FastifyReply,
  status: number,
  headers: ResponseHeaders | undefined
): void {
  if (reply.raw.headersSent) return

  reply.hijack()
  reply.raw.writeHead(status, sanitizeResponseHeaders(headers))
}

// Send a full response, or cut the connection if streaming already started.
export function sendFullReply(
  reply: FastifyReply,
  status: number,
  headers: ResponseHeaders | undefined,
  body: string | undefined
): void {
  if (reply.raw.headersSent) {
    // Too late for a status code: cut the connection.
    reply.raw.destroy()
    return
  }

  if (reply.sent) return

  reply.status(status).headers(sanitizeResponseHeaders(headers)).send(body)
}

// Fail a request, whatever state the reply is in.
export function failReply(
  reply: FastifyReply,
  status: number,
  message: string
): void {
  sendFullReply(reply, status, undefined, message)
}
