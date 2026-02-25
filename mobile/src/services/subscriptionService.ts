import { api } from '../lib/api';

/**
 * Subscription service for mobile.
 * Uses RevenueCat for in-app purchases instead of Stripe.
 * The debug endpoints remain for development testing.
 */
export const subscriptionService = {
    /**
     * Get current subscription status from the backend.
     */
    async getStatus(): Promise<{ plan: string; status: string }> {
        return api.get<{ plan: string; status: string }>('/subscriptions/status');
    },

    /**
     * Debug: upgrade to pro plan (development only).
     */
    debugUpgrade: async (): Promise<{ message: string }> => {
        return api.post<{ message: string }>('/subscriptions/debug-upgrade', {});
    },

    /**
     * Debug: downgrade to basic plan (development only).
     */
    debugDowngrade: async (): Promise<{ message: string }> => {
        return api.post<{ message: string }>('/subscriptions/debug-downgrade', {});
    },
};
