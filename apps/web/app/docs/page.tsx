import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/sections/footer";
import { GradientBlobs } from "@/components/gradient-blobs";
import { GridPattern } from "@/components/grid-pattern";
import { Eyebrow } from "@/components/eyebrow";
import { AnimatedButton } from "@/components/animated-button";
import { Package, Github } from "lucide-react";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Docs — Routiq",
  description:
    "How to install and use the Routiq CLI to expose localhost to the internet.",
};

const NPM_PACKAGE = "https://www.npmjs.com/package/routiq";
const GITHUB_REPO = "https://github.com/ayush844/Routiq";

const commands = [
  {
    command: "routiq login",
    description: "Authenticate with your Routiq account",
  },
  {
    command: "routiq logout",
    description: "Remove stored credentials from this machine",
  },
  {
    command: "routiq http <port...>",
    description: "Expose one or more local ports and open the live dashboard",
  },
];

const limits = [
  { label: "Active tunnels", value: "3" },
  { label: "Requests / min per tunnel", value: "2,000" },
  { label: "Bandwidth / day", value: "5 GB" },
];

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="mt-3 flex items-center gap-3 overflow-x-auto rounded-[20px] border border-ink/10 bg-terminal px-5 py-3.5 font-mono text-sm text-zinc-200">
      <span className="shrink-0 text-signal-light">$</span>
      <span className="whitespace-pre">{children}</span>
    </div>
  );
}

export default async function DocsPage() {
  const session = await auth();

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <GradientBlobs />
      <GridPattern />
      <Navbar user={session?.user ?? null} />

      <main className="relative pt-32 pb-24 md:pt-40 md:pb-32">
        <div className="container mx-auto max-w-3xl px-6 lg:px-8">
          <Eyebrow>Documentation</Eyebrow>
          <h1 className="text-4xl font-medium tracking-[-0.02em] text-ink md:text-5xl">
            Using the Routiq CLI
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-muted">
            Everything you need to install Routiq, log in, and expose a local
            port to the internet — in about a minute.
          </p>

          <section className="mt-12">
            <h2 className="text-xl font-medium text-ink">1. Install</h2>
            <p className="mt-2 text-muted">
              Install the CLI globally with npm.
            </p>
            <CodeBlock>npm install -g routiq</CodeBlock>
          </section>

          <section className="mt-10">
            <h2 className="text-xl font-medium text-ink">2. Log in</h2>
            <p className="mt-2 text-muted">
              Opens your dashboard to grab an API key — paste it back into the
              terminal when prompted.
            </p>
            <CodeBlock>routiq login</CodeBlock>
          </section>

          <section className="mt-10">
            <h2 className="text-xl font-medium text-ink">3. Expose a port</h2>
            <p className="mt-2 text-muted">
              Point Routiq at any local port to get a public HTTPS URL
              instantly.
            </p>
            <CodeBlock>routiq http 3000</CodeBlock>

            <p className="mt-6 text-muted">
              Need more than one port? Just list them:
            </p>
            <CodeBlock>routiq http 3000 4000 5173</CodeBlock>
            <p className="mt-2 text-sm text-muted">
              Each one gets its own tunnel URL, all shown side by side in the
              same live dashboard.
            </p>
          </section>

          <div className="mt-10 rounded-[24px] border border-signal/20 bg-signal/5 p-5">
            <p className="text-sm leading-relaxed text-charcoal">
              <span className="font-medium text-signal">Tip —</span> stop and
              restart on the same port within 24 hours and you get the same
              URL back, no need to re-share a link every time you restart
              your server.
            </p>
          </div>

          <section className="mt-16">
            <h2 className="text-2xl font-medium tracking-[-0.02em] text-ink">
              Commands
            </h2>
            <div className="mt-6 overflow-hidden rounded-[24px] border border-ink/10 bg-white">
              {commands.map((c, i) => (
                <div
                  key={c.command}
                  className={cn(
                    "flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:gap-6",
                    i !== commands.length - 1 && "border-b border-ink/10"
                  )}
                >
                  <code className="w-full shrink-0 font-mono text-sm text-signal sm:w-56">
                    {c.command}
                  </code>
                  <span className="text-sm text-muted">{c.description}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm text-muted">
              Press{" "}
              <kbd className="rounded border border-ink/15 bg-lifted px-1.5 py-0.5 font-mono text-xs">
                Ctrl+C
              </kbd>{" "}
              at any time to stop a tunnel.
            </p>
          </section>

          <section className="mt-16">
            <h2 className="text-2xl font-medium tracking-[-0.02em] text-ink">
              Free, with sane limits
            </h2>
            <p className="mt-2 text-muted">
              Routiq is free to use — no credit card required to start. Each
              account gets:
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {limits.map((l) => (
                <div
                  key={l.label}
                  className="rounded-2xl border border-ink/10 bg-white p-5 text-center"
                >
                  <div className="text-2xl font-medium text-ink">
                    {l.value}
                  </div>
                  <div className="mt-1 text-sm text-muted">{l.label}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-16 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <AnimatedButton variant="signal" asChild>
              <a href={NPM_PACKAGE} target="_blank" rel="noopener noreferrer">
                <Package className="h-4 w-4" />
                View on npm
              </a>
            </AnimatedButton>
            <AnimatedButton variant="secondary" asChild>
              <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer">
                <Github className="h-4 w-4" />
                View source on GitHub
              </a>
            </AnimatedButton>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
