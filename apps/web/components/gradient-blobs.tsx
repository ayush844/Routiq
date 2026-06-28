"use client";

import { motion } from "framer-motion";

export function GradientBlobs() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
      <motion.div
        className="absolute -left-[20%] top-[10%] h-[500px] w-[500px] rounded-full bg-signal-light/10 blur-[120px]"
        animate={{
          x: [0, 40, 0],
          y: [0, -30, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute -right-[15%] top-[30%] h-[400px] w-[400px] rounded-full bg-signal/10 blur-[100px]"
        animate={{
          x: [0, -50, 0],
          y: [0, 40, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute bottom-[10%] left-[30%] h-[350px] w-[350px] rounded-full bg-clay/5 blur-[100px]"
        animate={{
          x: [0, 30, 0],
          y: [0, -20, 0],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}
