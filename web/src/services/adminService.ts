import { api } from '@/lib/api';

export type AdminAccountType = 'users' | 'team' | 'assistants' | 'admins' | 'all';

// Types matching backend responses
export interface PlatformStats {
  total_users: number;
  basic_users: number;
  pro_users: number;
  business_users: number;
  /** Legacy 'premium' plan rows; zero in practice after migration 037. */
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
  account_status: string;
  deletion_eligible_at?: string | null;
  email_verified_at?: string | null;
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

  async getUsers(accountType: AdminAccountType = 'users', moderationStatus?: string) {
    const params: Record<string, string> = { account_type: accountType };
    if (moderationStatus) {
      params.moderation_status = moderationStatus;
    }
    return api.get<AdminUser[]>("/admin/users", params);
  },

  async getInactiveUsers(days = 30) {
    return api.get<AdminUser[]>("/admin/users/inactive", { days: String(days) });
  },

  async getUsersWithZeroResources() {
    return api.get<AdminUser[]>("/admin/users/zero-resources");
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

  async deleteUser(id: string) {
    return api.delete(`/admin/users/${id}`);
  },

  async verifyUserEmail(id: string) {
    return api.post<AdminUser>(`/admin/users/${id}/verify-email`);
  },
};
