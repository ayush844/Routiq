"use client";

import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "light" | "dark";
}

export function Logo({ className, size = "md", variant = "light" }: LogoProps) {
  const sizes = {
    sm: { icon: "h-6 w-6", text: "text-base" },
    md: { icon: "h-8 w-8", text: "text-lg" },
    lg: { icon: "h-10 w-10", text: "text-xl" },
  };

  const isDark = variant === "dark";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "relative flex items-center justify-center rounded-xl bg-signal shadow-md",
          sizes[size].icon
        )}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-[55%] w-[55%] text-white"
          aria-hidden="true"
        >
          <path
            d="M4 12h16M12 4l8 8-8 8"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <span
        className={cn(
          "font-semibold tracking-[-0.02em]",
          isDark ? "text-white" : "text-ink",
          sizes[size].text
        )}
      >
        Routiq
      </span>
    </div>
  );
}
