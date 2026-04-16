import { api } from "../lib/api";

export interface SubscriptionInfo {
  status: string;
  provider: string;
  current_period_end?: string;
  cancel_at_period_end: boolean;
}

export interface SubscriptionStatus {
  plan: string;
  has_stripe_account: boolean;
  subscription?: SubscriptionInfo;
}

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
