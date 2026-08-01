"use client";

import { motion } from "framer-motion";
import { SectionHeader } from "@/components/section-header";
import { staggerContainer, fadeInUp, viewportOnce } from "@/lib/animations";

const testimonials = [
  {
    quote:
      "Setting up Routiq took just couple of seconds. I use it to share my local projects with teammates and clients, and the experience has been smooth from day one. It's simple, reliable, and does exactly what I need.",
    name: "Monika Sharma",
    role: "Routiq User",
    initials: "MS",
    gradient: "from-signal to-clay",
  },
  {
    quote:
      "The ability to expose multiple local services at the same time is what made me switch. Managing different tunnels is much easier now, and the CLI is clean and straightforward to use.",
    name: "Vaibhav Jha",
    role: "Routiq User",
    initials: "VJ",
    gradient: "from-signal-light to-signal",
  },
  {
    quote:
      "I was looking for a lightweight alternative for exposing my local development server, and Routiq has been great so far. The setup is quick, performance is solid, and I haven't had to think about it after getting started.",
    name: "Avinash Pandey",
    role: "Routiq User",
    initials: "AP",
    gradient: "from-clay to-signal",
  },
];

export function Testimonials() {
  return (
    <section className="relative py-16 md:py-32">
      <div className="container mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
        >
          <SectionHeader
            eyebrow="Testimonials"
            title="What early users are saying"
            description="Real feedback from developers already using Routiq."
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
