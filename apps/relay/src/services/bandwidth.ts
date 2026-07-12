import { getPlanLimits, resolvePlan } from "../config/limits.js";
import { getRedis } from "./redis.js";

const DAY_SECONDS = 86400;
const GB = 1024 * 1024 * 1024;

function bandwidthKey(userId: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return `bandwidth:${userId}:${day}`;
}

export function formatBytes(bytes: number): string {
  if (bytes >= GB) return `${(bytes / GB).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export async function getDailyUsage(userId: string): Promise<number> {
  const raw = await getRedis().get(bandwidthKey(userId));
  return raw ? parseInt(raw, 10) : 0;
}

export async function isOverBandwidthQuota(
  userId: string,
  plan: string
): Promise<boolean> {
  const usage = await getDailyUsage(userId);
  return usage >= getPlanLimits(plan).bandwidthPerDayBytes;
}

export async function buildBandwidthExceededMessage(
  userId: string,
  plan: string
): Promise<{ reason: string; usedBytes: number; limitBytes: number }> {
  const usedBytes = await getDailyUsage(userId);
  const limitBytes = getPlanLimits(plan).bandwidthPerDayBytes;
  const tier = resolvePlan(plan);

  const reason = `Daily bandwidth limit reached (${formatBytes(limitBytes)} on the ${tier} plan). Resets at midnight UTC.`;

  return { reason, usedBytes, limitBytes };
}

export async function recordBandwidth(
  userId: string,
  bytes: number
): Promise<void> {
  if (bytes <= 0) return;

  const redis = getRedis();
  const key = bandwidthKey(userId);

  const pipeline = redis.pipeline();
  pipeline.incrby(key, bytes);
  pipeline.expire(key, DAY_SECONDS);
  await pipeline.exec();
}
