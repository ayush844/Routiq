"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { fadeInUp } from "@/lib/animations";
import { Eyebrow } from "./eyebrow";

interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "center",
  className,
}: SectionHeaderProps) {
  return (
    <motion.div
      variants={fadeInUp}
      className={cn(
        "mb-16 max-w-2xl",
        align === "center" && "mx-auto text-center",
        className
      )}
    >
      <Eyebrow className={align === "center" ? "justify-center" : undefined}>
        {eyebrow}
      </Eyebrow>
      <h2 className="text-3xl font-medium tracking-[-0.02em] text-ink md:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
        {title}
      </h2>
      {description && (
        <p className="mt-4 text-lg leading-relaxed text-muted">
          {description}
        </p>
      )}
    </motion.div>
  );
}
