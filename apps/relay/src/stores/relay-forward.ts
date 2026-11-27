import { FastifyReply } from "fastify"
import { WebSocket } from "ws"

export type CrossRelayInbound = {
  reply: FastifyReply
  timeout: NodeJS.Timeout
  ownerId: string
  requestBytes: number
  responseBytes: number
}

export type CrossRelayOutbound = {
  originRelayId: string
  // Agent socket serving the request.
  ws: WebSocket
  // Removes the entry if the agent never finishes.
  timeout: NodeJS.Timeout
  ownerId: string
  requestBytes: number
  responseBytes: number
}

export const crossRelayInbound = new Map<string, CrossRelayInbound>()
export const crossRelayOutbound = new Map<string, CrossRelayOutbound>()
