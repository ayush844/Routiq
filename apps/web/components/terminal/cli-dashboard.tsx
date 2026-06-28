"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type RequestLog = {
  id: string;
  method: string;
  path: string;
  status: number;
  duration: number;
};

const FAKE_REQUESTS: Omit<RequestLog, "id">[] = [
  { method: "GET", path: "/api/users", status: 200, duration: 42 },
  { method: "POST", path: "/api/auth/login", status: 201, duration: 128 },
  { method: "GET", path: "/health", status: 200, duration: 8 },
  { method: "PUT", path: "/api/users/42", status: 200, duration: 95 },
  { method: "GET", path: "/api/products?page=1", status: 200, duration: 67 },
  { method: "DELETE", path: "/api/sessions/abc", status: 204, duration: 31 },
  { method: "POST", path: "/api/webhooks/stripe", status: 200, duration: 156 },
  { method: "GET", path: "/api/analytics", status: 200, duration: 203 },
];

function statusColor(status: number) {
  if (status >= 500) return "text-red-400";
  if (status >= 400) return "text-yellow-400";
  if (status >= 300) return "text-cyan-400";
  return "text-emerald-400";
}

function methodColor() {
  return "text-cyan-400";
}

function BoxPanel({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg border border-signal/30 bg-black/40 ${className ?? ""}`}
    >
      <div className="border-b border-signal/20 px-3 py-1.5">
        <span className="font-mono text-xs text-signal-light">{title}</span>
      </div>
      <div className="p-3 font-mono text-xs leading-relaxed">{children}</div>
    </div>
  );
}

export function CliDashboard() {
  const [requests, setRequests] = useState<RequestLog[]>([]);
  const [pulseRow, setPulseRow] = useState<string | null>(null);

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      const req = FAKE_REQUESTS[index % FAKE_REQUESTS.length];
      const id = `${Date.now()}-${index}`;
      const newReq = { ...req, id };

      setRequests((prev) => [newReq, ...prev].slice(0, 5));
      setPulseRow(id);
      index++;

      setTimeout(() => setPulseRow(null), 800);
    }, 2200);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full overflow-hidden rounded-[40px] border border-ink/10 bg-terminal shadow-card">
      <div className="border-b border-signal/20 bg-gradient-to-r from-ink/80 to-transparent px-6 py-5">
        <pre className="font-mono text-xs leading-tight text-signal-light/80 md:text-sm">
        {`    ____                   __     _         
   / __ \\  ____   __  __  / /_   (_)  ____ _
  / /_/ / / __ \\ / / / / / __/  / /  / __ \`/
 / _, _/ / /_/ // /_/ / / /_   / /  / /_/ / 
/_/ |_|  \\____/ \\__,_/  \\__/  /_/   \\__, /  
                                      /_/   `}
        </pre>
        <p className="mt-2 font-mono text-xs text-zinc-500">
          Expose localhost to the internet
        </p>
        <p className="font-mono text-xs text-zinc-600">
          Fast • Secure • Simple
        </p>
      </div>

      <div className="p-4 md:p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <BoxPanel title=" Connection ">
            <div className="space-y-2">
              <div>
                <span className="text-emerald-400">●</span>{" "}
                <span className="text-zinc-400">Status</span>
                <div className="pl-4 text-zinc-200">Connected</div>
              </div>
              <div>
                <span className="text-cyan-400">●</span>{" "}
                <span className="text-zinc-400">Relay</span>
                <div className="pl-4 text-zinc-200">us-east-1.relay.routiq.dev</div>
              </div>
              <div>
                <span className="text-signal-light">●</span>{" "}
                <span className="text-zinc-400">User</span>
                <div className="pl-4 text-zinc-200">dev@routiq.dev</div>
              </div>
            </div>
          </BoxPanel>

          <BoxPanel title=" Active Tunnels ">
            <div className="space-y-3">
              <div>
                <div className="font-semibold text-zinc-200">localhost:3000</div>
                <div className="text-signal-light">https://abc123.routiq.dev</div>
              </div>
              <div>
                <div className="font-semibold text-zinc-200">localhost:8080</div>
                <div className="text-signal-light">https://def456.routiq.dev</div>
              </div>
            </div>
          </BoxPanel>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-signal/30">
          <div className="grid grid-cols-4 border-b border-signal/20 bg-ink/50 px-3 py-2 font-mono text-xs text-signal-light">
            <span>Method</span>
            <span className="col-span-1">Path</span>
            <span>Status</span>
            <span>Time</span>
          </div>
          <div className="min-h-[160px] bg-black/30">
            <AnimatePresence mode="popLayout">
              {requests.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="px-3 py-6 text-center font-mono text-xs text-zinc-600"
                >
                  Waiting for traffic...
                </motion.div>
              ) : (
                requests.map((req) => (
                  <motion.div
                    key={req.id}
                    layout
                    initial={{ opacity: 0, y: -12, backgroundColor: "rgba(243, 115, 56, 0.15)" }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      backgroundColor:
                        pulseRow === req.id
                          ? "rgba(243, 115, 56, 0.12)"
                          : "transparent",
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35 }}
                    className="grid grid-cols-4 border-b border-white/5 px-3 py-2 font-mono text-xs last:border-0"
                  >
                    <span className={methodColor()}>{req.method}</span>
                    <span className="truncate text-zinc-400">{req.path}</span>
                    <span className={statusColor(req.status)}>{req.status}</span>
                    <span className="text-zinc-500">{req.duration} ms</span>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

        <p className="mt-4 text-center font-mono text-xs text-zinc-600">
          Press Ctrl+C to stop • Built with ❤️ by Ayush Sharma
        </p>
      </div>

      <motion.div
        className="pointer-events-none absolute right-4 top-1/2 h-32 w-1 rounded-full bg-gradient-to-b from-transparent via-signal-light/50 to-transparent"
        animate={{ opacity: [0.3, 0.8, 0.3], y: [-20, 20, -20] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
