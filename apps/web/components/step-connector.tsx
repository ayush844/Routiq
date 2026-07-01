"use client";

import { motion } from "framer-motion";
import { viewportOnce } from "@/lib/animations";

const easeOut = [0.22, 1, 0.36, 1] as const;

interface StepConnectorProps {
  index: number;
}

function ConnectorSvg({
  delay,
  axis,
}: {
  delay: number;
  axis: "vertical" | "horizontal";
}) {
  const isVertical = axis === "vertical";
  const pathId = isVertical ? "v-path" : "h-path";

  const arcPath = isVertical
    ? "M12 0 Q 20 16 12 32"
    : "M0 12 Q 18 2 36 12";

  const arrowPath = isVertical
    ? "M6 28 L12 38 L18 28"
    : "M32 6 L40 12 L32 18";

  const viewBox = isVertical ? "0 0 24 48" : "0 0 48 24";
  const width = isVertical ? 24 : undefined;
  const height = isVertical ? 48 : 24;

  return (
    <svg
      width={width}
      height={height}
      viewBox={viewBox}
      fill="none"
      className={
        isVertical
          ? "overflow-visible"
          : "w-12 overflow-visible lg:w-16"
      }
    >
      <defs>
        <linearGradient id={`${pathId}-grad`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#F37338" stopOpacity="0.2" />
          <stop offset="50%" stopColor="#F37338" stopOpacity="1" />
          <stop offset="100%" stopColor="#CF4500" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      {/* Glow trail behind arc */}
      <motion.path
        d={arcPath}
        stroke={`url(#${pathId}-grad)`}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 0.35 }}
        viewport={viewportOnce}
        transition={{ duration: 0.9, delay, ease: easeOut }}
      />

      {/* Main arc — draws in */}
      <motion.path
        d={arcPath}
        stroke="#F37338"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={viewportOnce}
        transition={{ duration: 0.8, delay, ease: easeOut }}
      />

      {/* Flowing dashes along the arc */}
      <motion.path
        d={arcPath}
        stroke="#CF4500"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="3 8"
        fill="none"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 0.7 }}
        viewport={viewportOnce}
        animate={{ strokeDashoffset: [0, -22] }}
        transition={{
          strokeDashoffset: {
            duration: 1.8,
            repeat: Infinity,
            ease: "linear",
            delay: delay + 0.8,
          },
          opacity: { duration: 0.3, delay: delay + 0.6 },
        }}
      />

      {/* Arrow head — pops in with pulse */}
      <motion.g
        initial={{ opacity: 0, scale: 0.6 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={viewportOnce}
        animate={{ scale: [1, 1.15, 1] }}
        style={{ transformOrigin: isVertical ? "12px 33px" : "36px 12px" }}
        transition={{
          opacity: { duration: 0.35, delay: delay + 0.55, ease: easeOut },
          scale: {
            duration: 2,
            repeat: Infinity,
            repeatDelay: 1.2,
            delay: delay + 1,
            ease: "easeInOut",
          },
        }}
      >
        <path
          d={arrowPath}
          stroke="#CF4500"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </motion.g>

      {/* Traveling dot with glow halo */}
      <motion.circle
        r="6"
        fill="#F37338"
        opacity="0.15"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 0.15 }}
        viewport={viewportOnce}
        animate={{ offsetDistance: ["0%", "100%", "0%"] }}
        transition={{
          duration: 2.8,
          delay: delay + 0.9,
          repeat: Infinity,
          repeatDelay: 0.4,
          ease: "easeInOut",
        }}
        style={{
          offsetPath: `path('${arcPath}')`,
          offsetRotate: "0deg",
        }}
      />
      <motion.circle
        r="3.5"
        fill="#CF4500"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={viewportOnce}
        animate={{ offsetDistance: ["0%", "100%", "0%"] }}
        transition={{
          duration: 2.8,
          delay: delay + 0.9,
          repeat: Infinity,
          repeatDelay: 0.4,
          ease: "easeInOut",
        }}
        style={{
          offsetPath: `path('${arcPath}')`,
          offsetRotate: "0deg",
        }}
      />
    </svg>
  );
}

export function StepConnector({ index }: StepConnectorProps) {
  const delay = 0.35 + index * 0.35;

  return (
    <>
      <div
        className="flex items-center justify-center py-3 md:hidden"
        aria-hidden="true"
      >
        <ConnectorSvg delay={delay} axis="vertical" />
      </div>

      <div
        className="hidden items-center justify-center self-center px-1 md:flex lg:px-2"
        aria-hidden="true"
      >
        <ConnectorSvg delay={delay} axis="horizontal" />
      </div>
    </>
  );
}
