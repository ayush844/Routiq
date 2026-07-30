"use client";

import Link from "next/link";
import type { Session } from "next-auth";
import { motion } from "framer-motion";
import { ArrowRight, Github } from "lucide-react";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { AnimatedButton } from "@/components/animated-button";
import { Button } from "@/components/ui/button";
import { fadeInUp, viewportOnce } from "@/lib/animations";

interface CtaProps {
  user?: Session["user"] | null;
  callbackUrl?: string;
}

const ctaButtonClass =
  "border-[1.5px] border-white bg-white text-ink hover:bg-canvas";

const ctaOutlineClass =
  "border-[1.5px] border-white bg-transparent text-white hover:bg-white/10";

export function Cta({ user, callbackUrl = "/dashboard" }: CtaProps) {
  return (
    <section id="cta" className="relative py-16 md:py-32">
      <div className="container mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={fadeInUp}
          className="relative overflow-hidden rounded-[40px] bg-ink px-6 py-10 text-center md:px-16 md:py-24"
        >
          <div className="absolute -left-20 -top-20 h-60 w-60 rounded-full bg-signal/10 blur-[80px]" />
          <div className="absolute -bottom-20 -right-20 h-60 w-60 rounded-full bg-signal-light/10 blur-[80px]" />

          <div className="relative">
            <h2 className="text-3xl font-medium tracking-[-0.02em] text-white md:text-5xl md:leading-[1.1]">
              Start exposing localhost
              <br />
              <span className="text-canvas/80">today.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-lg text-white/60">
              Start tunneling in seconds. Free to use, no credit card required.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              {user ? (
                <AnimatedButton
                  size="lg"
                  className={ctaButtonClass}
                  asChild
                  wrapperClassName="inline-flex"
                >
                  <Link href="/dashboard">
                    Go to Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </AnimatedButton>
              ) : (
                <GoogleSignInButton
                  callbackUrl={callbackUrl}
                  variant="secondary"
                  className={ctaButtonClass}
                />
              )}
              <Button
                variant="secondary"
                size="lg"
                className={ctaOutlineClass}
                asChild
              >
                <a
                  href="https://github.com/ayush844/Routiq"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="h-4 w-4" />
                  GitHub
                </a>
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
