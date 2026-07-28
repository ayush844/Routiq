import dotenv from "dotenv"
import { loadConfig } from "./store.js"

dotenv.config({ quiet: true })

const PROD_RELAY_WS = "wss://relay.routiq.dev"
const PROD_RELAY_HTTP = "https://relay.routiq.dev"

export function getToken(): string | null {
  const config = loadConfig()
  if (config?.apiKey) return config.apiKey

  return null
}

export function getRelayUrl(): string {
  const config = loadConfig()
  if (config?.relay) return config.relay

  return process.env.RELAY_URL || PROD_RELAY_WS
}

export function getRelayHttpUrl(): string {
  const config = loadConfig()
  if (config?.relayHttp) return config.relayHttp

  if (process.env.RELAY_HTTP_URL) return process.env.RELAY_HTTP_URL

  const relay = getRelayUrl()
  if (relay.includes("localhost")) {
    return process.env.RELAY_HTTP_URL || "http://localhost:3001"
  }

  return PROD_RELAY_HTTP
}
