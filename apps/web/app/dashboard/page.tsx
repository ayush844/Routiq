import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getApiKey } from "@/actions/api-key";
import { Logo } from "@/components/logo";
import { ApiKeySection } from "@/components/dashboard/api-key-section";
import { SignOutButton } from "@/components/dashboard/sign-out-button";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  const apiKeyData = await getApiKey();
  const { user } = session;

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-ink/10 bg-white">
        <div className="container mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/">
            <Logo size="sm" />
          </Link>
          <SignOutButton />
        </div>
      </header>

      <main className="container mx-auto max-w-4xl px-6 py-10 md:py-14">
        <div className="mb-10">
          <p className="text-sm font-medium uppercase tracking-wider text-signal">
            Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-medium tracking-[-0.02em] text-ink">
            Your account
          </h1>
        </div>

        <div className="mb-8 rounded-[32px] border border-ink/10 bg-white p-6 md:p-8">
          <div className="flex items-center gap-4">
            {user.image ? (
              <Image
                src={user.image}
                alt={user.name ?? "Profile"}
                width={64}
                height={64}
                className="rounded-2xl"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-ink text-xl font-medium text-canvas">
                {user.name?.charAt(0)?.toUpperCase() ?? "?"}
              </div>
            )}
            <div>
              <h2 className="text-xl font-medium text-ink">
                {user.name ?? "User"}
              </h2>
              <p className="text-muted">{user.email}</p>
            </div>
          </div>
        </div>

        {apiKeyData && <ApiKeySection initialData={apiKeyData} />}
      </main>
    </div>
  );
}
