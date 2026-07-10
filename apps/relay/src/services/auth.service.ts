import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { JwtPayload } from "../types/relay.js";
import { queryApiKeyUser, updateApiKeyLastUsed } from "./db.js";

export function validateToken(
  token: string,
  secret: string
): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, secret);

    if (
      typeof decoded === "object" &&
      "userId" in decoded &&
      "role" in decoded
    ) {
      return decoded as JwtPayload;
    }

    return null;
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}

export async function validateApiKey(
  token: string
): Promise<{ userId: string; plan: string } | null> {
  const hash = crypto.createHash("sha256").update(token).digest("hex");

  const user = await queryApiKeyUser(hash);

  if (!user) return null;

  updateApiKeyLastUsed(hash);

  return user;
}
