"use client";

import Link from "next/link";
import type { Session } from "next-auth";
import { motion } from "framer-motion";
import { Github, Copy, Check, ArrowRight } from "lucide-react";
import { useState } from "react";
import { HeroTerminal } from "@/components/terminal/hero-terminal";
import { AnimatedButton } from "@/components/animated-button";
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

            <motion.div
              variants={fadeInUp}
              className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 lg:mt-8"
            >
              {user ? (
                <AnimatedButton
                  size="lg"
                  asChild
                  className="w-full sm:w-auto"
                  wrapperClassName="w-full sm:w-auto"
                >
                  <Link href="/dashboard">
                    Go to Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </AnimatedButton>
              ) : (
                <GoogleSignInButton
                  callbackUrl={callbackUrl}
                  animated
                  className="w-full sm:w-auto"
                  wrapperClassName="w-full sm:w-auto"
                />
              )}
              <AnimatedButton
                size="lg"
                variant="secondary"
                asChild
                className="w-full sm:w-auto"
                wrapperClassName="w-full sm:w-auto"
              >
                <a
                  href="https://github.com/ayush844/Routiq"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="h-4 w-4" />
                  GitHub
                </a>
              </AnimatedButton>
            </motion.div>

            <motion.div variants={fadeInUp} className="mt-6 lg:mt-10">
              <button
                type="button"
                onClick={copyInstall}
                className="group flex w-full max-w-md items-center gap-3 rounded-[20px] border border-ink/15 bg-white px-5 py-3.5 font-mono text-sm text-muted transition-all hover:border-signal/30 hover:shadow-nav"
              >
                <span className="text-signal">$</span>
                <span className="flex-1 text-left text-ink">
                  npm install -g routiq
                </span>
                {copied ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                )}
              </button>
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
