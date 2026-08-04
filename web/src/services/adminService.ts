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
  registrations_by_platform?: Record<string, number>;
  active_users_by_platform?: Record<string, number>;
  interactions_by_platform?: Record<string, number>;
  /** Product analytics slice 1 */
  dau?: number;
  wau?: number;
  mau?: number;
  dau_by_day?: Array<{ date: string; count: number }>;
  visitor_views_last_30d?: number;
  visitor_unique_last_30d?: number;
  visitor_views_by_day?: Array<{ date: string; count: number }>;
  landing_views_last_30d?: number;
  landing_unique_last_30d?: number;
  landing_views_by_day?: Array<{ date: string; count: number }>;
  visitor_by_device?: Record<string, number>;
  visitor_by_country?: Record<string, number>;
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
  registration_platform?: string;
  platform_activity?: Array<{
    user_id: string;
    platform: string;
    interaction_count: number;
    last_used_at: string;
  }>;
  active_platforms?: string[];
  last_active_at?: string | null;
  /** Last successful login (email/OAuth). Distinct from last_active_at (API activity). */
  last_login_at?: string | null;
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
  /** Cancellations in the last 30 days (period churn numerator). */
  canceled_last_30_days?: number;
}

export interface AdminUsersPage {
  data: AdminUser[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
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
    // Flat array (legacy) — used for small filtered sets / exports.
    return api.get<AdminUser[]>("/admin/users", params);
  },

  async getUsersPage(
    accountType: AdminAccountType = 'users',
    page = 1,
    limit = 50,
    moderationStatus?: string,
    search?: string,
    plan?: string,
  ) {
    const params: Record<string, string> = {
      account_type: accountType,
      page: String(page),
      limit: String(limit),
    };
    if (moderationStatus) {
      params.moderation_status = moderationStatus;
    }
    if (search?.trim()) {
      params.search = search.trim();
    }
    if (plan && plan !== 'all') {
      params.plan = plan;
    }
    return api.get<AdminUsersPage>("/admin/users", params);
  },

  async getInactiveUsers(days = 30) {
    return api.get<AdminUser[]>("/admin/users/inactive", { days: String(days) });
  },

  async getUsersWithZeroResources() {
    return api.get<AdminUser[]>("/admin/users/empty-resources");
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
    return api.post<AdminUser>(`/admin/users/${id}/verify-email`, {});
  },

  async blockUser(id: string, reason: string) {
    return api.put<AdminUser>(`/admin/users/${id}/block`, { reason });
  },
};
