"use client";

import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Radio,
  BarChart3,
  ScrollText,
  KeyRound,
  Settings,
  ArrowUpRight,
  TrendingUp,
  Activity,
} from "lucide-react";
import { SectionHeader } from "@/components/section-header";
import { staggerContainer, fadeInUp, viewportOnce } from "@/lib/animations";
import { cn } from "@/lib/utils";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Overview", active: true },
  { icon: Radio, label: "Tunnels" },
  { icon: BarChart3, label: "Analytics" },
  { icon: ScrollText, label: "Requests" },
  { icon: KeyRound, label: "API Keys" },
  { icon: Settings, label: "Settings" },
];

const analyticsCards = [
  { label: "Total Requests", value: "12,847", change: "+18.2%", icon: Activity },
  { label: "Active Tunnels", value: "3", change: "2 online", icon: Radio },
  { label: "Bandwidth", value: "2.4 GB", change: "+5.1%", icon: TrendingUp },
];

const tunnels = [
  { name: "localhost:3000", url: "abc123.routiq.dev", status: "active", requests: 4821 },
  { name: "localhost:8080", url: "def456.routiq.dev", status: "active", requests: 2103 },
  { name: "localhost:5173", url: "ghi789.routiq.dev", status: "idle", requests: 892 },
];

const recentRequests = [
  { method: "GET", path: "/api/users", status: 200, time: "2s ago" },
  { method: "POST", path: "/api/auth", status: 201, time: "5s ago" },
  { method: "GET", path: "/health", status: 200, time: "12s ago" },
];

function MiniChart() {
  const bars = [40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88];
  return (
    <div className="flex h-24 items-end gap-1">
      {bars.map((h, i) => (
        <motion.div
          key={i}
          initial={{ height: 0 }}
          whileInView={{ height: `${h}%` }}
          viewport={viewportOnce}
          transition={{ duration: 0.5, delay: i * 0.05 }}
          className="flex-1 rounded-sm bg-gradient-to-t from-signal/40 to-signal-light/60"
        />
      ))}
    </div>
  );
}

export function DashboardPreview() {
  return (
    <section id="dashboard" className="relative bg-lifted py-24 md:py-32">
      <div className="container mx-auto max-w-7xl px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
        >
          <SectionHeader
            eyebrow="Web Dashboard"
            title="Manage everything from one place"
            description="A beautiful web dashboard for analytics, tunnel management, and team collaboration."
          />

          <motion.div variants={fadeInUp} className="relative">
            <div className="absolute -top-4 left-1/2 z-20 -translate-x-1/2">
              <span className="inline-flex items-center gap-2 rounded-full border border-signal/20 bg-white px-4 py-1.5 text-sm font-medium text-signal shadow-nav">
                <span className="h-1.5 w-1.5 rounded-full bg-signal" />
                Coming Soon
              </span>
            </div>

            <div className="overflow-hidden rounded-[40px] border border-ink/10 bg-white shadow-card">
              <div className="flex items-center gap-3 border-b border-ink/10 bg-lifted px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                  <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
                  <div className="h-3 w-3 rounded-full bg-[#28c840]" />
                </div>
                <div className="flex flex-1 items-center justify-center">
                  <div className="flex items-center gap-2 rounded-full border border-ink/10 bg-white px-4 py-1 font-mono text-xs text-muted">
                    dashboard.routiq.dev
                  </div>
                </div>
              </div>

              <div className="flex min-h-[480px] flex-col md:min-h-[520px] md:flex-row">
                <aside className="w-full border-b border-ink/10 bg-lifted p-4 md:w-56 md:border-b-0 md:border-r">
                  <div className="mb-6 flex items-center gap-2 px-2">
                    <div className="h-7 w-7 rounded-lg bg-ink" />
                    <span className="text-sm font-semibold text-ink">Routiq</span>
                  </div>
                  <nav className="flex gap-1 overflow-x-auto md:flex-col">
                    {sidebarItems.map((item) => (
                      <div
                        key={item.label}
                        className={cn(
                          "flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors",
                          item.active
                            ? "bg-signal/10 text-signal"
                            : "text-muted hover:text-ink"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </div>
                    ))}
                  </nav>
                </aside>

                <main className="flex-1 p-5 md:p-6">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium text-ink">Overview</h3>
                      <p className="text-sm text-muted">Last 24 hours</p>
                    </div>
                    <button
                      type="button"
                      className="flex items-center gap-1 text-sm text-link hover:text-signal"
                    >
                      View all
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="mb-6 grid gap-4 sm:grid-cols-3">
                    {analyticsCards.map((card) => (
                      <div
                        key={card.label}
                        className="rounded-2xl border border-ink/10 bg-lifted p-4"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs text-muted">{card.label}</span>
                          <card.icon className="h-4 w-4 text-signal/60" />
                        </div>
                        <div className="text-2xl font-medium text-ink">{card.value}</div>
                        <div className="mt-1 text-xs text-emerald-600">{card.change}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-ink/10 bg-lifted p-4">
                      <h4 className="mb-4 text-sm font-medium text-charcoal">
                        Traffic
                      </h4>
                      <MiniChart />
                    </div>

                    <div className="rounded-2xl border border-ink/10 bg-lifted p-4">
                      <h4 className="mb-4 text-sm font-medium text-charcoal">
                        Recent Requests
                      </h4>
                      <div className="space-y-2">
                        {recentRequests.map((req) => (
                          <div
                            key={req.path + req.time}
                            className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-link">{req.method}</span>
                              <span className="text-muted">{req.path}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-emerald-600">{req.status}</span>
                              <span className="text-whisper">{req.time}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-ink/10 bg-lifted p-4">
                    <h4 className="mb-4 text-sm font-medium text-charcoal">
                      Active Tunnels
                    </h4>
                    <div className="space-y-2">
                      {tunnels.map((tunnel) => (
                        <div
                          key={tunnel.url}
                          className="flex items-center justify-between rounded-lg bg-white px-3 py-2.5 text-sm"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={cn(
                                "h-2 w-2 rounded-full",
                                tunnel.status === "active"
                                  ? "bg-emerald-500"
                                  : "bg-whisper"
                              )}
                            />
                            <div>
                              <div className="text-ink">{tunnel.name}</div>
                              <div className="text-xs text-signal">
                                {tunnel.url}
                              </div>
                            </div>
                          </div>
                          <span className="text-xs text-muted">
                            {tunnel.requests.toLocaleString()} req
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </main>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
