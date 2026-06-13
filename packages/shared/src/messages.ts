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