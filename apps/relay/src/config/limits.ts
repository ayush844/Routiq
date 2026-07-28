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

export function resolvePlan(plan: string | null | undefined): PlanTier {
  return plan === "pro" ? "pro" : "free";
}

export function getPlanLimits(plan: string | null | undefined): PlanLimits {
  return PLAN_LIMITS[resolvePlan(plan)];
}
