import dotenv from "dotenv"
import { randomUUID } from "node:crypto"

dotenv.config()

export const TOKEN_SECRET = process.env.TOKEN_SECRET
export const REDIS_URL = process.env.REDIS_URL

export const WS_PORT = parseInt(process.env.WS_PORT ?? "8080", 10)
export const HTTP_PORT = parseInt(process.env.HTTP_PORT ?? "3001", 10)

/** Port shown in tunnel URLs (NGINX public port when behind a load balancer). */
export const PUBLIC_HTTP_PORT = process.env.PUBLIC_HTTP_PORT ?? String(HTTP_PORT)

/** Base domain for tunnel subdomains (e.g. routiq.dev or localhost). */
export const TUNNEL_DOMAIN = process.env.TUNNEL_DOMAIN ?? "localhost"

/** https in production, http for local dev. */
export const PUBLIC_TUNNEL_SCHEME =
  process.env.PUBLIC_TUNNEL_SCHEME ??
  (TUNNEL_DOMAIN === "localhost" ? "http" : "https")

let relayId: string | undefined

export function getRelayId(): string {
  if (!relayId) {
    relayId =
      process.env.RELAY_ID ||
      `relay-${randomUUID().replaceAll("-", "").slice(0, 8)}`
  }
  return relayId
}

export function buildTunnelUrl(subdomain: string): string {
  if (TUNNEL_DOMAIN === "localhost") {
    return `${PUBLIC_TUNNEL_SCHEME}://${subdomain}.localhost:${PUBLIC_HTTP_PORT}`
  }

  return `${PUBLIC_TUNNEL_SCHEME}://${subdomain}.${TUNNEL_DOMAIN}`
}
