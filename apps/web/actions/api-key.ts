"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type ApiKeyMetadata = {
  exists: boolean;
  createdAt: Date | null;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  masked: string;
};

const MASKED_KEY = "••••••••••";

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

function createRawKey(): string {
  return `rtq_${crypto.randomBytes(32).toString("base64url")}`;
}

export async function getApiKey(): Promise<ApiKeyMetadata | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const apiKey = await prisma.apiKey.findUnique({
    where: { userId: session.user.id },
  });

  if (!apiKey || apiKey.revokedAt) {
    return {
      exists: false,
      createdAt: null,
      lastUsedAt: null,
      revokedAt: null,
      masked: MASKED_KEY,
    };
  }

  return {
    exists: true,
    createdAt: apiKey.createdAt,
    lastUsedAt: apiKey.lastUsedAt,
    revokedAt: apiKey.revokedAt,
    masked: MASKED_KEY,
  };
}

export async function generateApiKey():
  Promise<{ key: string } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const existing = await prisma.apiKey.findUnique({
    where: { userId: session.user.id },
  });

  if (existing && !existing.revokedAt) {
    return { error: "API key already exists. Use regenerate instead." };
  }

  const rawKey = createRawKey();

  await prisma.apiKey.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      keyHash: hashKey(rawKey),
    },
    update: {
      keyHash: hashKey(rawKey),
      revokedAt: null,
      lastUsedAt: null,
    },
  });

  revalidatePath("/dashboard");
  return { key: rawKey };
}

export async function regenerateApiKey():
  Promise<{ key: string } | { error: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const rawKey = createRawKey();

  await prisma.apiKey.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      keyHash: hashKey(rawKey),
    },
    update: {
      keyHash: hashKey(rawKey),
      revokedAt: null,
      lastUsedAt: null,
    },
  });

  revalidatePath("/dashboard");
  return { key: rawKey };
}
