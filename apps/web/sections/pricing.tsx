"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import Link from "next/link";
import { SectionHeader } from "@/components/section-header";
import { AnimatedButton } from "@/components/animated-button";
import { Button } from "@/components/ui/button";
import { staggerContainer, fadeInUp, viewportOnce } from "@/lib/animations";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Perfect for side projects and learning.",
    features: [
      "1 active tunnel",
      "100 requests/day",
      "Community support",
      "Basic request logging",
      "Random subdomain",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$12",
    period: "/month",
    description: "For developers who ship every day.",
    features: [
      "10 active tunnels",
      "Unlimited requests",
      "Custom subdomains",
      "Advanced analytics",
      "Priority support",
      "Team collaboration",
      "Webhook replay",
    ],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For teams with advanced security needs.",
    features: [
      "Unlimited tunnels",
      "Dedicated relay nodes",
      "SSO & SAML",
      "Audit logs",
      "SLA guarantee",
      "Custom domains",
      "Dedicated support",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="relative bg-lifted py-24 md:py-32">
      <div className="container mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
        >
          <SectionHeader
            eyebrow="Pricing"
            title="Simple, transparent pricing"
            description="Start for free, scale when you need to. No hidden fees, no surprises."
          />

          <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
            {plans.map((plan) => (
              <motion.div
                key={plan.name}
                variants={fadeInUp}
                whileHover={{ y: -6 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className={cn(
                  "relative flex flex-col rounded-[40px] border p-8 transition-all duration-300",
                  plan.highlighted
                    ? "border-ink bg-white shadow-card"
                    : "border-ink/10 bg-white hover:border-ink/20 hover:shadow-nav"
                )}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-ink px-4 py-1 text-xs font-medium text-canvas">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-medium text-ink">{plan.name}</h3>
                  <p className="mt-1 text-sm text-muted">{plan.description}</p>
                </div>

                <div className="mb-8">
                  <span className="text-4xl font-medium tracking-[-0.02em] text-ink">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-muted">{plan.period}</span>
                  )}
                </div>

                <ul className="mb-8 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-3 text-sm text-muted"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-signal" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {plan.highlighted ? (
                  <AnimatedButton className="w-full" asChild>
                    <Link href="#cta">{plan.cta}</Link>
                  </AnimatedButton>
                ) : (
                  <Button
                    variant={plan.name === "Enterprise" ? "secondary" : "outline"}
                    className="w-full"
                    asChild
                  >
                    <Link href="#cta">{plan.cta}</Link>
                  </Button>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
