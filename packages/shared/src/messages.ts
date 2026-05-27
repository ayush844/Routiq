export interface AuthMessage {
  type: "AUTH"
  token: string
}

export interface AuthSuccessMessage {
  type: "AUTH_SUCCESS"
  userId: string
}

export interface CreateTunnelMessage {
  type: "CREATE_TUNNEL"
  localPort: number
}