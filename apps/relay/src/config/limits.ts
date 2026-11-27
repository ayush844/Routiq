export type PlanTier = "free" | "pro";

export interface PlanLimits {
  activeTunnels: number;
  httpPerMin: number;
  bandwidthPerDayBytes: number;
}

const GB = 1024 * 1024 * 1024;

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: { activeTunnels: 3, httpPerMin: 2000, bandwidthPerDayBytes: 5 * GB },
  pro: { activeTunnels: 25, httpPerMin: 5000, bandwidthPerDayBytes: 100 * GB },
};

export const GLOBAL_LIMITS = {
  wsAuthPerMin: 10,
  verifyPerMin: 30,
};

// Max visitor request body.
export const MAX_REQUEST_BODY_BYTES = 10 * 1024 * 1024;

// Max WebSocket message from an agent.
export const MAX_WS_MESSAGE_BYTES = 16 * 1024 * 1024;

// Max silence from the agent before a 504.
export const REQUEST_TIMEOUT_MS = 30_000;

// Close sockets that don't authenticate in time.
export const AUTH_TIMEOUT_MS = 10_000;

export function resolvePlan(plan: string | null | undefined): PlanTier {
  return plan === "pro" ? "pro" : "free";
}

export function getPlanLimits(plan: string | null | undefined): PlanLimits {
  return PLAN_LIMITS[resolvePlan(plan)];
}
