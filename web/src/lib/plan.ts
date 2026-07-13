/**
 * Plan tier normalization — mirrors backend `NormalizePlan`
 * (backend/internal/models/models.go). The backend persists raw plan
 * strings from legacy sources (grant flow, migrations, manual edits) and
 * normalizes them at read time; the web client must apply the same map so
 * `usePlanLimits().isBasicPlan` agrees with the backend's enforcement.
 *
 * Backend aliases → canonical tier:
 *   gratis | free | basic | plan_basic           → "basic"
 *   pro | plan_pro | premium                      → "pro"
 *   business | plan_business | enterprise         → "business"
 *   <other>                                       → lowercased + trimmed input
 *
 * Unknown values are passed through (NOT coerced to a tier) so the UI can
 * distinguish a genuinely unknown plan from a known free one — matching the
 * backend's deliberate non-coercion of unknowns.
 */
export type PlanTier = "basic" | "pro" | "business" | string;

const PLAN_ALIASES: Record<string, PlanTier> = {
  gratis: "basic",
  free: "basic",
  basic: "basic",
  plan_basic: "basic",
  pro: "pro",
  plan_pro: "pro",
  premium: "pro",
  business: "business",
  plan_business: "business",
  enterprise: "business",
};

export function normalizePlan(plan: string | undefined | null): PlanTier {
  if (!plan) return "basic";
  const key = plan.toLowerCase().trim();
  return PLAN_ALIASES[key] ?? key;
}

export function isBasicPlan(plan: string | undefined | null): boolean {
  return normalizePlan(plan) === "basic";
}
