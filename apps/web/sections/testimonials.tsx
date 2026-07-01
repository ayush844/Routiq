"use client";

import { motion } from "framer-motion";
import { SectionHeader } from "@/components/section-header";
import { staggerContainer, fadeInUp, viewportOnce } from "@/lib/animations";

const testimonials = [
  {
    quote:
      "Routiq replaced ngrok for our entire team. The CLI dashboard alone is worth it — I can see every request without switching tabs.",
    name: "Sarah Chen",
    role: "Staff Engineer at Vercel",
    initials: "SC",
    gradient: "from-signal to-clay",
  },
  {
    quote:
      "We use Routiq to demo features to clients in real-time. Setup takes 30 seconds and the tunnels are blazing fast.",
    name: "Marcus Rivera",
    role: "Founder at Stackline",
    initials: "MR",
    gradient: "from-signal-light to-signal",
  },
  {
    quote:
      "Finally a tunneling tool that feels like it was built by developers, for developers. Open source and self-hostable too.",
    name: "Priya Patel",
    role: "DevOps Lead at Railway",
    initials: "PP",
    gradient: "from-clay to-signal",
  },
];

export function Testimonials() {
  return (
    <section className="relative py-24 md:py-32">
      <div className="container mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
        >
          <SectionHeader
            eyebrow="Testimonials"
            title="Loved by developers everywhere"
            description="Join thousands of developers who trust Routiq to expose their localhost."
          />

          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <motion.div
                key={t.name}
                variants={fadeInUp}
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="flex flex-col rounded-[40px] border border-ink/10 bg-white p-8 transition-colors hover:border-signal/20 hover:shadow-card"
              >
                <blockquote className="mb-8 flex-1 text-base leading-relaxed text-charcoal">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>

                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ${t.gradient} text-sm font-semibold text-white`}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-ink">{t.name}</div>
                    <div className="text-xs text-muted">{t.role}</div>
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
