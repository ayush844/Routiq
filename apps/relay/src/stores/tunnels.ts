import { Tunnel } from "../types/relay.js"


export const tunnels = new Map<string,Tunnel>()

export const subdomainToTunnelId = new Map<string, string>()
