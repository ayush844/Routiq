"use server";

import { signIn, signOut } from "@/lib/auth";

export async function signInWithGoogle(callbackUrl?: string) {
  await signIn("google", {
    redirectTo: callbackUrl ?? "/dashboard",
  });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
