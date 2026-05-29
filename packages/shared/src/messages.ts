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
}