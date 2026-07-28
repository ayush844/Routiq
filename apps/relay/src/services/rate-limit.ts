import { getRedis } from "./redis.js";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export async function checkRateLimit(
  scope: string,
  id: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = Math.floor(now / (windowSeconds * 1000));
  const key = `ratelimit:${scope}:${id}:${windowStart}`;

  const redis = getRedis();

  const pipeline = redis.pipeline();
  pipeline.incr(key);
  pipeline.expire(key, windowSeconds);
  const results = await pipeline.exec();

  const count = (results?.[0]?.[1] as number) ?? 0;
  const resetAt = (windowStart + 1) * windowSeconds * 1000;
  const remaining = Math.max(0, limit - count);

  return {
    allowed: count <= limit,
    remaining,
    resetAt,
  };
}

export function retryAfterSeconds(resetAt: number): number {
  return Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
}
