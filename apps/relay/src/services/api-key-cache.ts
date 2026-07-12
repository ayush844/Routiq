import { getRedis } from "./redis.js";

const CACHE_TTL_SECONDS = 60 * 60 * 24; // 24h — matches tunnel TTL; avoids Neon on wake after long idle
const NEGATIVE_CACHE_TTL_SECONDS = 60;

export type ApiKeyUser = { userId: string; plan: string };

function cacheKey(keyHash: string) {
  return `apikey:${keyHash}`;
}

export async function lookupApiKeyCache(
  keyHash: string
): Promise<"miss" | "invalid" | ApiKeyUser> {
  const raw = await getRedis().get(cacheKey(keyHash));

  if (raw === null) return "miss";
  if (raw === "0") return "invalid";

  const user = JSON.parse(raw) as ApiKeyUser;
  await getRedis().expire(cacheKey(keyHash), CACHE_TTL_SECONDS);

  return user;
}

export async function cacheApiKeyUser(
  keyHash: string,
  user: ApiKeyUser | null
): Promise<void> {
  const redis = getRedis();

  if (user === null) {
    await redis.set(cacheKey(keyHash), "0", "EX", NEGATIVE_CACHE_TTL_SECONDS);
    return;
  }

  await redis.set(
    cacheKey(keyHash),
    JSON.stringify(user),
    "EX",
    CACHE_TTL_SECONDS
  );
}
