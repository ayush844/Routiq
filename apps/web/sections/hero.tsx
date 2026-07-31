"use client";

import Link from "next/link";
import type { Session } from "next-auth";
import { motion } from "framer-motion";
import { Github, Copy, Check, ArrowRight } from "lucide-react";
import { useState } from "react";
import { HeroTerminal } from "@/components/terminal/hero-terminal";
import { Button } from "@/components/ui/button";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { fadeInUp, slideInLeft, slideInRight } from "@/lib/animations";

interface HeroProps {
  user?: Session["user"] | null;
  callbackUrl?: string;
}

export function Hero({ user, callbackUrl = "/dashboard" }: HeroProps) {
  const [copied, setCopied] = useState(false);

  const copyInstall = async () => {
    await navigator.clipboard.writeText("npm install -g routiq");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="relative overflow-hidden pt-28 pb-10 lg:min-h-screen lg:pt-40 lg:pb-32">
      <div className="container mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.12 } },
            }}
          >
            <motion.div variants={fadeInUp}>
              <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-signal/20 bg-signal/5 px-4 py-1.5 text-sm text-signal lg:mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal-light opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-signal" />
                </span>
                Developer tunneling, reimagined
              </span>
            </motion.div>

            <motion.h1
              variants={slideInLeft}
              className="text-4xl font-medium leading-[1.05] tracking-[-0.02em] text-ink sm:text-5xl md:text-6xl lg:text-[4rem]"
            >
              Expose localhost
              <br />
              <span className="text-gradient">to the internet.</span>
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="mt-4 max-w-lg text-base leading-relaxed text-muted lg:mt-6 lg:text-lg"
            >
              Securely share your local development server with the world.
              One command. Zero configuration. Built for developers who ship fast.
            </motion.p>

            <motion.div variants={fadeInUp} className="mt-7 lg:mt-9">
              <button
                type="button"
                onClick={copyInstall}
                className="group flex w-full max-w-lg items-center gap-3 rounded-[24px] border-[1.5px] border-ink/15 bg-white px-6 py-4 font-mono text-base shadow-card transition-all hover:border-signal/40 hover:shadow-nav md:px-7 md:py-5 md:text-lg"
              >
                <span className="text-signal">$</span>
                <span className="flex-1 text-left font-medium text-ink">
                  npm install -g routiq
                </span>
                {copied ? (
                  <Check className="h-5 w-5 shrink-0 text-emerald-600" />
                ) : (
                  <Copy className="h-5 w-5 shrink-0 text-muted opacity-60 transition-opacity group-hover:opacity-100" />
                )}
              </button>
            </motion.div>

            <motion.div
              variants={fadeInUp}
              className="mt-5 flex flex-wrap items-center gap-2 lg:mt-6"
            >
              {user ? (
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard">
                    Go to dashboard
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              ) : (
                <GoogleSignInButton
                  callbackUrl={callbackUrl}
                  size="sm"
                  variant="ghost"
                  label="Sign in to manage tunnels"
                />
              )}
              <Button variant="ghost" size="sm" asChild>
                <a
                  href="https://github.com/ayush844/Routiq"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="h-4 w-4" />
                  GitHub
                </a>
              </Button>
            </motion.div>
          </motion.div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={slideInRight}
            className="hidden lg:block"
          >
            <HeroTerminal />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
