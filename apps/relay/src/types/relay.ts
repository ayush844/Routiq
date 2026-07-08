import { WebSocket } from "ws"
import { FastifyReply } from "fastify"

export type JwtPayload = {
    userId: string
    role: string
}

export type ClientState = {
    authenticated: boolean
    user?: JwtPayload
    tunnelIds: string[]
    lastPongAt: number
}

export type TunnelMeta = {
  tunnelId: string
  subdomain: string
  localPort: number
  protocol: "http" | "tcp"
  ownerId: string
  relayId: string
  createdAt: number
}

export type Tunnel = TunnelMeta & {
  ws: WebSocket
}

export type TunnelParams = {
  tunnelId: string
  "*": string
}

export type PendingRequest = {
  reply: FastifyReply
  timeout: NodeJS.Timeout
  createdAt: number
}
