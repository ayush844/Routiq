"use client";

import { cn } from "@/lib/utils";

interface EyebrowProps {
  children: React.ReactNode;
  className?: string;
}

export function Eyebrow({ children, className }: EyebrowProps) {
  return (
    <div
      className={cn(
        "mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.04em] text-signal",
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-signal" />
      {children}
    </div>
  );
}
