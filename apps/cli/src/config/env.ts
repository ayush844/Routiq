import { loadConfig } from "./store.js";

export function getToken(): string | null {
  const config = loadConfig();
  if (config?.apiKey) return config.apiKey;

  return null;
}

export function getRelayUrl(): string {
  const config = loadConfig();
  if (config?.relay) return config.relay;

  return process.env.RELAY_URL || "ws://localhost:8080";
}

export function getRelayHttpUrl(): string {
  const config = loadConfig();
  if (config?.relayHttp) return config.relayHttp;

  if (process.env.RELAY_HTTP_URL) return process.env.RELAY_HTTP_URL;

  const relay = getRelayUrl();
  if (relay.includes("localhost:8080")) {
    return "http://localhost:3001";
  }

  return relay.replace(/^ws(s?):\/\//, (_, s) => (s ? "https://" : "http://"));
}
