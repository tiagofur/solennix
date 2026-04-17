import { api } from "../lib/api";
import type { components } from "../types/api";

// Source of truth is backend/docs/openapi.yaml. Aliased here so callers keep
// using `SubscriptionInfo` / `SubscriptionStatus` and don't have to learn the
// `components['schemas'][...]` lookup syntax.
export type SubscriptionInfo = components["schemas"]["SubscriptionInfo"];
export type SubscriptionStatus =
  components["schemas"]["SubscriptionStatusResponse"];

export const subscriptionService = {
  getStatus: async (): Promise<SubscriptionStatus> => {
    return await api.get<SubscriptionStatus>("/subscriptions/status");
  },

  createCheckoutSession: async (
    plan: "pro" | "business" = "pro",
  ): Promise<{ url: string }> => {
    return await api.post<{ url: string }>(
      "/subscriptions/checkout-session",
      { plan },
    );
  },

  createPortalSession: async (): Promise<{ url: string }> => {
    return await api.post<{ url: string }>("/subscriptions/portal-session", {});
  },

  debugUpgrade: async (): Promise<{ message: string }> => {
    return await api.post<{ message: string }>(
      "/subscriptions/debug-upgrade",
      {},
    );
  },

  debugDowngrade: async (): Promise<{ message: string }> => {
    return await api.post<{ message: string }>(
      "/subscriptions/debug-downgrade",
      {},
    );
  },
};
