"use client";

import { motion } from "framer-motion";
import type { Session } from "next-auth";
import { Navbar } from "@/components/navbar";
import { GradientBlobs } from "@/components/gradient-blobs";
import { GridPattern } from "@/components/grid-pattern";
import { Hero } from "@/sections/hero";
import { Features } from "@/sections/features";
import { HowItWorks } from "@/sections/how-it-works";
import { CliShowcase } from "@/sections/cli-showcase";
import { DashboardPreview } from "@/sections/dashboard-preview";
import { Pricing } from "@/sections/pricing";
import { Testimonials } from "@/sections/testimonials";
import { Cta } from "@/sections/cta";
import { Footer } from "@/sections/footer";

interface LandingPageProps {
  user: Session["user"] | null;
  callbackUrl: string;
}

export function LandingPage({ user, callbackUrl }: LandingPageProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative min-h-screen overflow-x-hidden"
    >
      <GradientBlobs />
      <GridPattern />
      <Navbar user={user} callbackUrl={callbackUrl} />

      <main>
        <Hero user={user} callbackUrl={callbackUrl} />
        <Features />
        <HowItWorks />
        <CliShowcase />
        <DashboardPreview />
        <Pricing />
        <Testimonials />
        <Cta user={user} callbackUrl={callbackUrl} />
      </main>

      <Footer />
    </motion.div>
  );
}
