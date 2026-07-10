import { WebSocket } from "ws";
import { getRelayId } from "../config/env.js";
import { getRedis } from "../services/redis.js";
import { Tunnel, TunnelMeta } from "../types/relay.js";

const TUNNEL_TTL_SECONDS = 60 * 60 * 24;

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

export async function registerTunnel(
  meta: Omit<TunnelMeta, "relayId" | "createdAt">,
  ws: WebSocket
): Promise<TunnelMeta> {
  const redis = getRedis();

  const record: TunnelMeta = {
    ...meta,
    relayId: getRelayId(),
    createdAt: Date.now(),
  };

  const pipeline = redis.pipeline();

  pipeline.set(
    tunnelKey(record.tunnelId),
    JSON.stringify(record),
    "EX",
    TUNNEL_TTL_SECONDS
  );
  pipeline.set(subdomainKey(record.subdomain), record.tunnelId, "EX", TUNNEL_TTL_SECONDS);
  pipeline.sadd(userTunnelsKey(record.ownerId), record.tunnelId);

  await pipeline.exec();

  localSockets.set(record.tunnelId, ws);

  return record;
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

export async function refreshTunnelsTTL(tunnelIds: string[]): Promise<void> {
  for (const tunnelId of tunnelIds) {
    const meta = await getTunnelMeta(tunnelId);
    if (meta) await refreshTunnelTTL(meta);
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

/** Remove local WebSocket only — keep Redis metadata alive for reconnect. */
export async function detachTunnel(tunnelId: string): Promise<void> {
  localSockets.delete(tunnelId);

  const meta = await getTunnelMeta(tunnelId);
  if (!meta) return;

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

    if (meta.localPort === localPort && meta.relayId === getRelayId()) {
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

export async function countUserTunnels(userId: string): Promise<number> {
  return getRedis().scard(userTunnelsKey(userId));
}
