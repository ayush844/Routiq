"use client";

import { motion } from "framer-motion";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AnimatedButtonProps extends ButtonProps {
  glow?: boolean;
  wrapperClassName?: string;
}

export function AnimatedButton({
  children,
  className,
  wrapperClassName,
  glow = false,
  ...props
}: AnimatedButtonProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn("inline-flex", glow && "relative", wrapperClassName)}
    >
      {glow && (
        <div className="absolute -inset-1 rounded-[24px] bg-ink/10 blur-lg" />
      )}
      <Button className={cn("relative", className)} {...props}>
        {children}
      </Button>
    </motion.div>
  );
}
