import { FastifyReply } from "fastify"

export type CrossRelayInbound = {
  reply: FastifyReply
  timeout: NodeJS.Timeout
  ownerId: string
  requestBytes: number
  responseBytes: number
}

export type CrossRelayOutbound = {
  originRelayId: string
  ownerId: string
  requestBytes: number
  responseBytes: number
}

export const crossRelayInbound = new Map<string, CrossRelayInbound>()
export const crossRelayOutbound = new Map<string, CrossRelayOutbound>()
