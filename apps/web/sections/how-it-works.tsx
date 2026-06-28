"use client";

import { motion } from "framer-motion";
import { Download, ShieldCheck, Globe } from "lucide-react";
import { SectionHeader } from "@/components/section-header";
import { StepConnector } from "@/components/step-connector";
import { staggerContainer, fadeInUp, viewportOnce } from "@/lib/animations";

const steps = [
  {
    icon: Download,
    step: "01",
    title: "Install",
    description:
      "Install the Routiq CLI globally with npm. One package, zero dependencies beyond Node.js.",
    command: "npm install -g routiq",
  },
  {
    icon: ShieldCheck,
    step: "02",
    title: "Authenticate",
    description:
      "Sign in with your API key or OAuth. Your credentials are encrypted and never stored in plain text.",
    command: "routiq auth login",
  },
  {
    icon: Globe,
    step: "03",
    title: "Expose",
    description:
      "Point Routiq at any local port and get a public URL instantly. Share it with your team or clients.",
    command: "routiq http 3000",
  },
];

export function HowItWorks() {
  return (
    <section className="relative bg-lifted py-24 md:py-32">
      <div className="container mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
        >
          <SectionHeader
            eyebrow="How it works"
            title="Three steps to a public URL"
            description="From install to live tunnel in under 60 seconds. No account setup required to get started."
          />

          <div className="flex flex-col md:grid md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-stretch md:gap-y-0">
            {steps.map((step, i) => (
              <div key={step.title} className="contents">
                <motion.div variants={fadeInUp} className="relative">
                  <motion.div
                    whileHover={{ y: -6 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="relative h-full overflow-hidden rounded-[40px] border border-ink/10 bg-white p-8 transition-colors hover:border-signal/20 hover:shadow-card"
                  >
                    <div className="mb-6 flex items-center justify-between">
                      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-signal/15 bg-signal/5 text-signal">
                        <step.icon className="h-6 w-6" />
                      </div>
                      <span className="font-mono text-sm text-whisper">
                        {step.step}
                      </span>
                    </div>

                    <h3 className="mb-3 text-2xl font-medium tracking-[-0.02em] text-ink">
                      {step.title}
                    </h3>
                    <p className="mb-6 text-base leading-relaxed text-muted">
                      {step.description}
                    </p>

                    <div className="rounded-[20px] border border-ink/10 bg-terminal px-4 py-3 font-mono text-sm text-signal-light">
                      <span className="text-whisper">$ </span>
                      {step.command}
                    </div>
                  </motion.div>
                </motion.div>

                {i < steps.length - 1 && <StepConnector index={i} />}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
