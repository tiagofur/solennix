import { api } from '../lib/api';

export const subscriptionService = {
  createCheckoutSession: async (): Promise<{ url: string }> => {
    return await api.post<{ url: string }>('/subscriptions/checkout-session', {});
  },

  debugUpgrade: async (): Promise<{ message: string }> => {
    return await api.post<{ message: string }>('/subscriptions/debug-upgrade', {});
  }
};
