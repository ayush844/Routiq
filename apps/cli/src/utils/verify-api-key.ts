import { getRelayHttpUrl } from "../config/env.js";

export type VerifyResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "invalid" | "unreachable" };

export async function verifyApiKey(token: string): Promise<VerifyResult> {
  const url = `${getRelayHttpUrl()}/auth/verify`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 401) {
      return { ok: false, reason: "invalid" };
    }

    if (!res.ok) {
      return { ok: false, reason: "unreachable" };
    }

    const data = (await res.json()) as { userId: string };
    return { ok: true, userId: data.userId };
  } catch {
    return { ok: false, reason: "unreachable" };
  }
}
