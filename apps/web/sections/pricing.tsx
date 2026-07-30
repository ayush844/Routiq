"use client";

import { motion } from "framer-motion";
import { Check, Github, Star } from "lucide-react";
import { SectionHeader } from "@/components/section-header";
import { AnimatedButton } from "@/components/animated-button";
import { Button } from "@/components/ui/button";
import { fadeInUp, viewportOnce } from "@/lib/animations";

const features = [
  "Expose localhost via CLI",
  "Live request logging",
  "No hidden fees today",
  "Open source",
  "No credit card to start",
];

const GITHUB_REPO = "https://github.com/ayush844/Routiq";
const GITHUB_PROFILE = "https://github.com/ayush844";
const TWITTER = "https://x.com/ayushuprush";

export function Pricing() {
  return (
    <section id="pricing" className="relative bg-lifted py-16 md:py-32">
      <div className="container mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={fadeInUp}
        >
          <SectionHeader
            eyebrow="Pricing"
            title="Free at the core"
            description="The essentials — tunneling, the CLI, and request logging — are free to use with no hidden charges. We may add optional paid plans later, but the heart of Routiq stays free."
          />

          <div className="mx-auto max-w-lg">
            <div className="rounded-[40px] border border-ink/10 bg-white p-6 text-center shadow-card md:p-10">
              <p className="text-5xl font-medium tracking-[-0.02em] text-ink">
                $0
              </p>
              <p className="mt-1 text-muted">to get started</p>

              <ul className="mt-6 space-y-3 text-left md:mt-8">
                {features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-3 text-sm text-muted"
                  >
                    <Check className="h-4 w-4 shrink-0 text-signal" />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-6 space-y-3 md:mt-8">
                <AnimatedButton variant="signal" className="w-full" asChild>
                  <a
                    href={GITHUB_REPO}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Star className="h-4 w-4" />
                    Star on GitHub
                  </a>
                </AnimatedButton>

                <p className="text-sm text-muted">
                  Routiq is open source — a star helps others find it and
                  supports what we build next.
                </p>
              </div>

              <div className="mt-6 border-t border-ink/10 pt-6 md:mt-8">
                <p className="text-sm text-muted">Follow the journey</p>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={GITHUB_PROFILE}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Github className="h-4 w-4" />
                      @ayush844
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={TWITTER}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      @ayushuprush
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
