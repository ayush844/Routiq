export type PlanTier = "free" | "pro";

export interface PlanLimits {
  activeTunnels: number;
  httpPerMin: number;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: { activeTunnels: 3, httpPerMin: 100 },
  pro: { activeTunnels: 25, httpPerMin: 2000 },
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
