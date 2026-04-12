import { api } from '@/lib/api';

// Types matching backend responses
export interface PlatformStats {
  total_users: number;
  basic_users: number;
  pro_users: number;
  premium_users: number;
  total_events: number;
  total_clients: number;
  total_products: number;
  new_users_today: number;
  new_users_week: number;
  new_users_month: number;
  active_subscriptions: number;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  business_name?: string;
  plan: string;
  role: string;
  stripe_customer_id?: string;
  has_paid_subscription: boolean;
  plan_expires_at?: string | null;
  events_count: number;
  clients_count: number;
  products_count: number;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionOverview {
  total_active: number;
  total_canceled: number;
  total_trialing: number;
  total_past_due: number;
  stripe_count: number;
  apple_count: number;
  google_count: number;
}

export const adminService = {
  async getStats() {
    return api.get<PlatformStats>("/admin/stats");
  },

  async getUsers() {
    return api.get<AdminUser[]>("/admin/users");
  },

  async getUserById(id: string) {
    return api.get<AdminUser>(`/admin/users/${id}`);
  },

  async upgradeUser(id: string, plan = "pro", expiresAt?: string | null) {
    return api.put<AdminUser>(`/admin/users/${id}/upgrade`, {
      plan,
      expires_at: expiresAt ?? null,
    });
  },

  async getSubscriptions() {
    return api.get<SubscriptionOverview>("/admin/subscriptions");
  },
};
