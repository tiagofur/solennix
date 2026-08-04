import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService, type AdminAccountType } from '@/services/adminService';
import { queryKeys } from './queryKeys';
import { useToast } from '@/hooks/useToast';
import { logError, getErrorMessage } from '@/lib/errorHandler';
import { useTranslation } from 'react-i18next';
export { useAdminAuditLogs } from './useActivityQueries';

// ── Queries ──

export function useAdminStats() {
  return useQuery({
    queryKey: queryKeys.admin.stats,
    queryFn: () => adminService.getStats(),
  });
}

export function useAdminUsers(accountType: AdminAccountType = 'users', moderationStatus?: string, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.admin.users, accountType, moderationStatus || ''] as const,
    queryFn: () => adminService.getUsers(accountType, moderationStatus),
    enabled,
  });
}

/** Paginated user list for the admin users table (server-side search/plan). */
export function useAdminUsersPage(
  accountType: AdminAccountType = 'users',
  page = 1,
  limit = 50,
  moderationStatus?: string,
  enabled = true,
  search = '',
  plan = 'all',
) {
  return useQuery({
    queryKey: [
      ...queryKeys.admin.users,
      'page',
      accountType,
      page,
      limit,
      moderationStatus || '',
      search,
      plan,
    ] as const,
    queryFn: () =>
      adminService.getUsersPage(accountType, page, limit, moderationStatus, search, plan),
    enabled,
  });
}

export function useAdminUser(id: string) {
  return useQuery({
    queryKey: [...queryKeys.admin.users, 'detail', id] as const,
    queryFn: () => adminService.getUserById(id),
    enabled: !!id,
  });
}

export function useAdminInactiveUsers(days = 30, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.admin.users, 'inactive', days] as const,
    queryFn: () => adminService.getInactiveUsers(days),
    enabled,
  });
}

export function useAdminZeroResourceUsers(enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.admin.users, 'zero-resources'] as const,
    queryFn: () => adminService.getUsersWithZeroResources(),
    enabled,
  });
}

export function useAdminSubscriptions() {
  return useQuery({
    queryKey: [...queryKeys.admin.stats, 'subscriptions'] as const,
    queryFn: () => adminService.getSubscriptions(),
  });
}

// ── Mutations ──

export function useUpgradeUser() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { t } = useTranslation('admin');

  return useMutation({
    mutationKey: ['admin', 'upgradeUser'],
    mutationFn: ({ id, plan, expiresAt }: { id: string; plan: string; expiresAt: string | null }) =>
      adminService.upgradeUser(id, plan, expiresAt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users, exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats });
      addToast(t('users.plan_updated'), 'success');
    },
    onError: (error) => {
      logError('Error upgrading user', error);
      addToast(getErrorMessage(error, t('users.error_update_plan')), 'error');
    },
  });
}

export function useDeleteAdminUser() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { t } = useTranslation('admin');

  return useMutation({
    mutationKey: ['admin', 'deleteUser'],
    mutationFn: (id: string) => adminService.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users, exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats });
      addToast(t('users.messages.delete_success'), 'success');
    },
    onError: (error) => {
      logError('Error deleting user', error);
      addToast(t('users.errors.delete_failed'), 'error');
    },
  });
}

export function useVerifyUserEmail() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { t } = useTranslation('admin');

  return useMutation({
    mutationKey: ['admin', 'verifyEmail'],
    mutationFn: (id: string) => adminService.verifyUserEmail(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users, exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats });
      addToast(t('users.messages.verify_email_success'), 'success');
    },
    onError: (error) => {
      logError('Error verifying user email', error);
      addToast(getErrorMessage(error, t('users.errors.verify_email_failed')), 'error');
    },
  });
}

export function useBlockUser() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const { t } = useTranslation('admin');

  return useMutation({
    mutationKey: ['admin', 'blockUser'],
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminService.blockUser(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users, exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats });
      addToast(t('users.messages.block_success'), 'success');
    },
    onError: (error) => {
      logError('Error blocking user', error);
      addToast(getErrorMessage(error, t('users.errors.block_failed')), 'error');
    },
  });
}

