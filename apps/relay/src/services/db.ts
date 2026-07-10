import pg from "pg";

let pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      idleTimeoutMillis: 30_000,
      max: 3,
    });
    pool.on("error", (err) => {
      console.error("Idle PG client error (connection recycled):", err.message);
    });
  }
  return pool;
}

export async function queryApiKeyUser(
  keyHash: string
): Promise<{ userId: string; plan: string } | null> {
  const result = await getPool().query(
    `SELECT k."userId", u."plan"
     FROM "ApiKey" k
     JOIN "User" u ON u."id" = k."userId"
     WHERE k."keyHash" = $1 AND k."revokedAt" IS NULL`,
    [keyHash]
  );

  if (result.rows.length === 0) return null;

  return { userId: result.rows[0].userId, plan: result.rows[0].plan };
}

export async function updateApiKeyLastUsed(keyHash: string): Promise<void> {
  getPool()
    .query(
      `UPDATE "ApiKey" SET "lastUsedAt" = NOW(), "updatedAt" = NOW() WHERE "keyHash" = $1`,
      [keyHash]
    )
    .catch(() => {});
}
