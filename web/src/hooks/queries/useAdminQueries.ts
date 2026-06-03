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

export function useAdminUsers(accountType: AdminAccountType = 'users', moderationStatus?: string) {
  return useQuery({
    queryKey: [...queryKeys.admin.users, accountType, moderationStatus || ''] as const,
    queryFn: () => adminService.getUsers(accountType, moderationStatus),
  });
}

export function useAdminUser(id: string) {
  return useQuery({
    queryKey: [...queryKeys.admin.users, 'detail', id] as const,
    queryFn: () => adminService.getUserById(id),
    enabled: !!id,
  });
}

export function useAdminInactiveUsers(days = 30) {
  return useQuery({
    queryKey: [...queryKeys.admin.users, 'inactive', days] as const,
    queryFn: () => adminService.getInactiveUsers(days),
  });
}

export function useAdminZeroResourceUsers() {
  return useQuery({
    queryKey: [...queryKeys.admin.users, 'zero-resources'] as const,
    queryFn: () => adminService.getUsersWithZeroResources(),
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

  return useMutation({
    mutationKey: ['admin', 'deleteUser'],
    mutationFn: (id: string) => adminService.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users, exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats });
      addToast('Usuario eliminado exitosamente', 'success');
    },
    onError: (error) => {
      logError('Error deleting user', error);
      addToast('No se pudo eliminar el usuario', 'error');
    },
  });
}

export function useVerifyUserEmail() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationKey: ['admin', 'verifyEmail'],
    mutationFn: (id: string) => adminService.verifyUserEmail(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users, exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats });
      addToast('Email verificado exitosamente', 'success');
    },
    onError: (error) => {
      logError('Error verifying user email', error);
      addToast(getErrorMessage(error, 'No se pudo verificar el email del usuario'), 'error');
    },
  });
}

export function useBlockUser() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationKey: ['admin', 'blockUser'],
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminService.blockUser(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users, exact: false });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats });
      addToast('Usuario bloqueado exitosamente', 'success');
    },
    onError: (error) => {
      logError('Error blocking user', error);
      addToast(getErrorMessage(error, 'No se pudo bloquear al usuario'), 'error');
    },
  });
}

