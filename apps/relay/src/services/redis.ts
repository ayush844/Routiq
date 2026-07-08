import Redis from "ioredis";

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    throw new Error("Redis not connected. Call connectRedis() first.");
  }
  return redis;
}

export async function connectRedis(url: string): Promise<Redis> {
  if (redis) return redis;

  const client = new Redis(url);

  client.on("error", (err) => {
    console.error("Redis error:", err.message);
  });

  await client.ping();

  redis = client;
  console.log("Connected to Redis");

  return client;
}

export async function disconnectRedis(): Promise<void> {
  if (!redis) return;
  await redis.quit();
  redis = null;
}
