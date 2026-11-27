import { randomBytes } from "node:crypto";
import { WebSocket } from "ws";
import { getRelayId } from "../config/env.js";
import { getRedis } from "../services/redis.js";
import { Tunnel, TunnelMeta } from "../types/relay.js";

const TUNNEL_TTL_SECONDS = 60 * 60 * 24;

// A tunnel counts as active if its socket was seen this recently.
const ACTIVE_WINDOW_MS = 3 * 60 * 1000;

// Count the user's active tunnels and create the new one in one atomic step,
// so parallel CREATE_TUNNELs can't go over the plan limit.
// Returns 1 = created, 0 = limit reached, -1 = subdomain taken.
const CREATE_TUNNEL_SCRIPT = `
local ids = redis.call('SMEMBERS', KEYS[1])
local limit = tonumber(ARGV[1])
local now = tonumber(ARGV[2])
local window = tonumber(ARGV[3])
local active = 0
for _, id in ipairs(ids) do
  local raw = redis.call('GET', 'tunnel:' .. id)
  if not raw then
    redis.call('SREM', KEYS[1], id)
  else
    local m = cjson.decode(raw)
    if m.connected == true and m.lastSeenAt and now - m.lastSeenAt < window then
      active = active + 1
    end
  end
end
if active >= limit then return 0 end
if not redis.call('SET', 'subdomain:' .. ARGV[5], ARGV[4], 'EX', ARGV[7], 'NX') then return -1 end
redis.call('SET', 'tunnel:' .. ARGV[4], ARGV[6], 'EX', ARGV[7])
redis.call('SADD', KEYS[1], ARGV[4])
return 1
`;

const localSockets = new Map<string, WebSocket>();

function tunnelKey(tunnelId: string) {
  return `tunnel:${tunnelId}`;
}

function subdomainKey(subdomain: string) {
  return `subdomain:${subdomain}`;
}

function userTunnelsKey(userId: string) {
  return `user:${userId}:tunnels`;
}

// Create a tunnel if the user is under `limit`. Returns null if over the limit.
export async function createTunnel(
  meta: Omit<TunnelMeta, "relayId" | "createdAt" | "subdomain" | "connected" | "lastSeenAt">,
  ws: WebSocket,
  limit: number
): Promise<TunnelMeta | null> {
  const redis = getRedis();

  for (let attempt = 0; attempt < 5; attempt++) {
    const now = Date.now();
    const record: TunnelMeta = {
      ...meta,
      subdomain: randomBytes(5).toString("hex"),
      relayId: getRelayId(),
      createdAt: now,
      connected: true,
      lastSeenAt: now,
    };

    const result = await redis.eval(
      CREATE_TUNNEL_SCRIPT,
      1,
      userTunnelsKey(record.ownerId),
      limit,
      now,
      ACTIVE_WINDOW_MS,
      record.tunnelId,
      record.subdomain,
      JSON.stringify(record),
      TUNNEL_TTL_SECONDS
    );

    if (result === 0) return null;
    if (result === 1) {
      localSockets.set(record.tunnelId, ws);
      return record;
    }
  }

  throw new Error("Could not allocate a unique subdomain");
}

export async function removeTunnel(tunnelId: string): Promise<void> {
  const redis = getRedis();
  localSockets.delete(tunnelId);

  const raw = await redis.get(tunnelKey(tunnelId));
  if (!raw) return;

  const meta = JSON.parse(raw) as TunnelMeta;

  const pipeline = redis.pipeline();
  pipeline.del(tunnelKey(tunnelId));
  pipeline.del(subdomainKey(meta.subdomain));
  pipeline.srem(userTunnelsKey(meta.ownerId), tunnelId);

  await pipeline.exec();
}

// Heartbeat: mark this socket's tunnels as alive and extend their TTL.
export async function refreshTunnelsTTL(
  tunnelIds: string[],
  ws: WebSocket
): Promise<void> {
  for (const tunnelId of tunnelIds) {
    if (localSockets.get(tunnelId) !== ws) continue;

    const meta = await getTunnelMeta(tunnelId);
    if (!meta || meta.relayId !== getRelayId()) continue;

    meta.connected = true;
    meta.lastSeenAt = Date.now();
    await refreshTunnelTTL(meta);
  }
}

async function refreshTunnelTTL(meta: TunnelMeta): Promise<void> {
  const redis = getRedis();
  const pipeline = redis.pipeline();

  pipeline.set(
    tunnelKey(meta.tunnelId),
    JSON.stringify(meta),
    "EX",
    TUNNEL_TTL_SECONDS
  );
  pipeline.set(
    subdomainKey(meta.subdomain),
    meta.tunnelId,
    "EX",
    TUNNEL_TTL_SECONDS
  );

  await pipeline.exec();
}

// Remove the local socket, keep Redis data for reconnect.
// Skip if the tunnel already moved to a newer socket.
export async function detachTunnel(
  tunnelId: string,
  ws?: WebSocket
): Promise<void> {
  if (ws && localSockets.get(tunnelId) !== ws) return;

  localSockets.delete(tunnelId);

  const meta = await getTunnelMeta(tunnelId);
  if (!meta) return;

  // Only mark offline if no other relay took the tunnel over.
  if (meta.relayId === getRelayId()) meta.connected = false;
  await refreshTunnelTTL(meta);
}

/** Re-bind a live WebSocket to an existing tunnel (same subdomain). */
export async function reattachTunnel(
  tunnelId: string,
  ws: WebSocket,
  plan?: string
): Promise<TunnelMeta | null> {
  const meta = await getTunnelMeta(tunnelId);
  if (!meta) return null;

  if (plan && meta.plan !== plan) {
    meta.plan = plan;
  }

  meta.relayId = getRelayId();
  meta.connected = true;
  meta.lastSeenAt = Date.now();
  localSockets.set(tunnelId, ws);
  await refreshTunnelTTL(meta);

  return meta;
}

export async function findTunnelByUserAndPort(
  userId: string,
  localPort: number
): Promise<TunnelMeta | null> {
  const redis = getRedis();
  const tunnelIds = await redis.smembers(userTunnelsKey(userId));

  for (const tunnelId of tunnelIds) {
    const raw = await redis.get(tunnelKey(tunnelId));
    if (!raw) {
      await redis.srem(userTunnelsKey(userId), tunnelId);
      continue;
    }

    const meta = JSON.parse(raw) as TunnelMeta;

    if (meta.localPort === localPort) {
      return meta;
    }
  }

  return null;
}

export async function removeDuplicateTunnels(
  ownerId: string,
  localPort: number
): Promise<void> {
  const redis = getRedis();
  const tunnelIds = await redis.smembers(userTunnelsKey(ownerId));

  for (const tunnelId of tunnelIds) {
    const raw = await redis.get(tunnelKey(tunnelId));
    if (!raw) {
      await redis.srem(userTunnelsKey(ownerId), tunnelId);
      continue;
    }

    const meta = JSON.parse(raw) as TunnelMeta;

    if (meta.localPort === localPort && meta.relayId === getRelayId()) {
      await detachTunnel(tunnelId);
    }
  }
}

export async function getTunnelMeta(
  tunnelId: string
): Promise<TunnelMeta | null> {
  const raw = await getRedis().get(tunnelKey(tunnelId));
  if (!raw) return null;
  return JSON.parse(raw) as TunnelMeta;
}

export async function getTunnelIdBySubdomain(
  subdomain: string
): Promise<string | null> {
  return getRedis().get(subdomainKey(subdomain));
}

export async function resolveTunnel(tunnelId: string): Promise<Tunnel | null> {
  const meta = await getTunnelMeta(tunnelId);
  if (!meta) return null;

  if (meta.relayId !== getRelayId()) {
    return null;
  }

  const ws = localSockets.get(tunnelId);
  if (!ws) return null;

  return { ...meta, ws };
}

export async function resolveTunnelBySubdomain(
  subdomain: string
): Promise<Tunnel | null> {
  const tunnelId = await getTunnelIdBySubdomain(subdomain);
  if (!tunnelId) return null;
  return resolveTunnel(tunnelId);
}

export function isTunnelOnThisRelay(meta: TunnelMeta): boolean {
  return meta.relayId === getRelayId();
}

export async function listUserTunnelIds(userId: string): Promise<string[]> {
  return getRedis().smembers(userTunnelsKey(userId));
}
