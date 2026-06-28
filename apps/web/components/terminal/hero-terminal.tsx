"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

type LineType = "command" | "output" | "blank";

interface TerminalLine {
  type: LineType;
  text: string;
  color?: "default" | "green" | "dim" | "accent";
}

const SCRIPT: TerminalLine[] = [
  { type: "command", text: "npm install -g routiq" },
  { type: "output", text: "Installing...", color: "dim" },
  { type: "output", text: "Done.", color: "green" },
  { type: "blank", text: "" },
  { type: "command", text: "routiq http 3000" },
  { type: "output", text: "Connecting...", color: "dim" },
  { type: "output", text: "Authenticating...", color: "dim" },
  { type: "output", text: "Tunnel Created", color: "green" },
  { type: "output", text: "https://abc123.routiq.dev", color: "accent" },
  { type: "blank", text: "" },
  { type: "output", text: "Incoming requests appear below.", color: "dim" },
];

const colorMap = {
  default: "text-zinc-300",
  green: "text-emerald-400",
  dim: "text-zinc-500",
  accent: "text-signal-light",
};

function TypingText({
  text,
  onDone,
}: {
  text: string;
  onDone: () => void;
}) {
  const [displayed, setDisplayed] = useState("");
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const interval = setInterval(() => {
      i++;
      if (i <= text.length) {
        setDisplayed(text.slice(0, i));
      } else {
        clearInterval(interval);
        onDoneRef.current();
      }
    }, 35);
    return () => clearInterval(interval);
  }, [text]);

  return (
    <span>
      {displayed}
      {displayed.length < text.length && (
        <span className="inline-block w-2 animate-pulse bg-signal-light">&nbsp;</span>
      )}
    </span>
  );
}

export function HeroTerminal() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [typingDone, setTypingDone] = useState(false);
  const [resetting, setResetting] = useState(false);

  const currentLine = SCRIPT[visibleCount];
  const allVisible = visibleCount >= SCRIPT.length;

  useEffect(() => {
    if (allVisible) {
      const timeout = setTimeout(() => {
        setResetting(true);
        setTimeout(() => {
          setVisibleCount(0);
          setTypingDone(false);
          setResetting(false);
        }, 500);
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [allVisible]);

  useEffect(() => {
    if (resetting || allVisible) return;

    const line = SCRIPT[visibleCount];
    if (!line) return;

    if (line.type === "command") {
      setTypingDone(false);
      return;
    }

    const delay = line.type === "blank" ? 150 : 500;
    const timeout = setTimeout(() => {
      setVisibleCount((c) => c + 1);
    }, delay);
    return () => clearTimeout(timeout);
  }, [visibleCount, typingDone, resetting, allVisible]);

  const handleTypingDone = () => {
    setTypingDone(true);
    setTimeout(() => setVisibleCount((c) => c + 1), 300);
  };

  const lines = SCRIPT.slice(0, visibleCount);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full"
    >
      <div className="absolute -inset-4 rounded-[44px] bg-ink/5 blur-2xl" />
      <div className="relative overflow-hidden rounded-[40px] border border-ink/10 bg-terminal shadow-card">
        <div className="flex items-center gap-2 border-b border-white/5 bg-white/[0.02] px-4 py-3">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
            <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
            <div className="h-3 w-3 rounded-full bg-[#28c840]" />
          </div>
          <span className="flex-1 text-center font-mono text-xs text-zinc-500">
            routiq — zsh
          </span>
        </div>

        <div className="min-h-[340px] p-5 font-mono text-sm leading-relaxed md:min-h-[380px] md:p-6 md:text-[0.9rem]">
          <AnimatePresence mode="popLayout">
            {lines.map((line, i) => {
              if (line.type === "blank") {
                return <div key={`b-${i}`} className="h-3" />;
              }
              if (line.type === "command") {
                return (
                  <motion.div
                    key={`c-${i}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="mb-1 flex gap-2"
                  >
                    <span className="text-signal-light">$</span>
                    <span className="text-zinc-200">{line.text}</span>
                  </motion.div>
                );
              }
              return (
                <motion.div
                  key={`o-${i}`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`mb-1 pl-4 ${colorMap[line.color ?? "default"]}`}
                >
                  {line.text}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {!allVisible && !resetting && currentLine?.type === "command" && (
            <div className="mb-1 flex gap-2">
              <span className="text-signal-light">$</span>
              <span className="text-zinc-200">
                <TypingText
                  key={`typing-${visibleCount}`}
                  text={currentLine.text}
                  onDone={handleTypingDone}
                />
              </span>
            </div>
          )}

          {(allVisible || (visibleCount > 0 && currentLine?.type !== "command")) && (
            <div className="mt-1 flex gap-2">
              <span className="text-signal-light">$</span>
              <span className="inline-block h-4 w-2 animate-pulse bg-signal-light/80" />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
