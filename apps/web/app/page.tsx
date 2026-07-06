import { auth } from "@/lib/auth";
import { LandingPage } from "@/components/landing-page";

interface HomeProps {
  searchParams: Promise<{ callbackUrl?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const session = await auth();
  const { callbackUrl } = await searchParams;

  return (
    <LandingPage
      user={session?.user ?? null}
      callbackUrl={callbackUrl ?? "/dashboard"}
    />
  );
}
