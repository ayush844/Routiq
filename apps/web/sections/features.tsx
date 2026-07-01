"use client";

import { motion } from "framer-motion";
import {
  Layers,
  Zap,
  KeyRound,
  ScrollText,
  Terminal,
  Github,
} from "lucide-react";
import { SectionHeader } from "@/components/section-header";
import { staggerContainer, fadeInUp, viewportOnce } from "@/lib/animations";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Layers,
    title: "Multiple Tunnels",
    description:
      "Run several tunnels simultaneously. Expose multiple ports from a single CLI session.",
  },
  {
    icon: Zap,
    title: "Fast Relay",
    description:
      "Global edge network with sub-50ms latency. Your localhost feels like production.",
  },
  {
    icon: KeyRound,
    title: "Secure API Keys",
    description:
      "Authenticate with scoped API keys. Control access to your tunnels with precision.",
  },
  {
    icon: ScrollText,
    title: "Request Logging",
    description:
      "Inspect every request in real-time. Method, path, status, and timing at a glance.",
  },
  {
    icon: Terminal,
    title: "Developer CLI",
    description:
      "Beautiful terminal UI with live dashboards. Built for the command line you already love.",
  },
  {
    icon: Github,
    title: "Open Source",
    description:
      "Fully open source and self-hostable. Audit the code, contribute, or run your own relay.",
  },
];

export function Features() {
  return (
    <section id="features" className="relative py-24 md:py-32">
      <div className="container mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
        >
          <SectionHeader
            eyebrow="Features"
            title="Everything you need to ship locally"
            description="Powerful tunneling infrastructure wrapped in a developer experience you'll actually enjoy."
          />

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={fadeInUp}
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="group relative"
              >
                <div
                  className={cn(
                    "relative h-full overflow-hidden rounded-[40px] border border-ink/10 bg-white p-8",
                    "transition-all duration-300 hover:border-signal/20 hover:shadow-card"
                  )}
                >
                  <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-signal-light/5 blur-2xl transition-all group-hover:bg-signal-light/10" />

                  <div className="relative">
                    <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-signal/15 bg-signal/5 text-signal transition-colors group-hover:border-signal/30 group-hover:bg-signal/10">
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <h3 className="mb-2 text-xl font-medium tracking-[-0.02em] text-ink">
                      {feature.title}
                    </h3>
                    <p className="text-base leading-relaxed text-muted">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
