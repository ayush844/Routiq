export interface AuthMessage {
  type: "AUTH"
  token: string
}

export interface AuthSuccessMessage {
  type: "AUTH_SUCCESS"
  userId: string
}

export interface AuthFailedMessage {
  type: "AUTH_FAILED"
  reason: string
}

export interface RateLimitedMessage {
  type: "RATE_LIMITED"
  scope: "auth" | "tunnel"
  reason: string
  retryAfter?: number
}

export interface CreateTunnelMessage {
  type: "CREATE_TUNNEL"
  localPort: number
  protocol: "http"
}

export interface TunnelCreatedMessage {
  type: "TUNNEL_CREATED"
  tunnelId: string
  url: string
  port: number
}

export interface TunnelOfflineMessage {
  type: "TUNNEL_OFFLINE"
  reason: string
}

export interface TunnelExpiredMessage {
  type: "TUNNEL_EXPIRED"
  reason: string
  tunnelId?: string
}

export interface HttpRequestMessage{
  type: "HTTP_REQUEST",
  requestId: string,
  tunnelId: string,
  method: string,
  path: string,
  headers: Record<string, string>,
  body?: string
}

export interface HttpResponseMessage {
  type: "HTTP_RESPONSE",
  requestId: string,
  status: number,
  headers: Record<string, string>,
  body?: string
}

export interface PingMessage {
  type: "PING"
}

export interface PongMessage {
  type: "PONG"
}

export interface HttpResponseStartMessage {
  type: "HTTP_RESPONSE_START"
  requestId: string
  status: number
  headers: Record<string, string>
}

export interface HttpResponseChunkMessage {
  type: "HTTP_RESPONSE_CHUNK"
  requestId: string
  chunk: string
}

export interface HttpResponseEndMessage {
  type: "HTTP_RESPONSE_END"
  requestId: string
}
