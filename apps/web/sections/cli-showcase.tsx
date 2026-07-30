"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { SectionHeader } from "@/components/section-header";
import { CliDashboard } from "@/components/terminal/cli-dashboard";
import { staggerContainer, fadeInUp, viewportOnce } from "@/lib/animations";

export function CliShowcase() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [40, -40]);

  return (
    <section id="cli" ref={ref} className="relative py-16 md:py-32">
      <div className="container mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
        >
          <SectionHeader
            eyebrow="CLI Dashboard"
            title="Your terminal, supercharged"
            description="A live dashboard right in your terminal. Monitor connections, tunnels, and incoming requests without leaving the command line."
          />

          <motion.div variants={fadeInUp} style={{ y }} className="relative">
            <div className="absolute -inset-8 rounded-[48px] bg-signal/5 blur-3xl" />
            <CliDashboard />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
