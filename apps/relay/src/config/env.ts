import dotenv from "dotenv"
import { randomUUID } from "node:crypto"

dotenv.config()

export const TOKEN_SECRET = process.env.TOKEN_SECRET
export const REDIS_URL = process.env.REDIS_URL

let relayId: string | undefined

export function getRelayId(): string {
  if (!relayId) {
    relayId =
      process.env.RELAY_ID ||
      `relay-${randomUUID().replaceAll("-", "").slice(0, 8)}`
  }
  return relayId
}
