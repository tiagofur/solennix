import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockGetStats = vi.fn();
const mockGetUsers = vi.fn();
const mockGetSubscriptions = vi.fn();
const mockUpgradeUser = vi.fn();
const mockGetUsersWithZeroResources = vi.fn();

vi.mock('@/services/adminService', () => ({
  adminService: {
    getStats: (...args: any[]) => mockGetStats(...args),
    getUsers: (...args: any[]) => mockGetUsers(...args),
    getSubscriptions: (...args: any[]) => mockGetSubscriptions(...args),
    upgradeUser: (...args: any[]) => mockUpgradeUser(...args),
    getUsersWithZeroResources: (...args: any[]) => mockGetUsersWithZeroResources(...args),
  },
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

vi.mock('@/lib/errorHandler', () => ({
  logError: vi.fn(),
  getErrorMessage: (_err: any, fallback: string) => fallback,
}));

import {
  useAdminStats,
  useAdminUsers,
  useAdminSubscriptions,
  useUpgradeUser,
  useAdminZeroResourceUsers,
} from './useAdminQueries';

const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

describe('useAdminQueries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useAdminStats', () => {
    it('fetches admin stats', async () => {
      mockGetStats.mockResolvedValue({ total_users: 42, total_events: 100 });
      const { result } = renderHook(() => useAdminStats(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockGetStats).toHaveBeenCalledTimes(1);
      expect(result.current.data).toEqual({ total_users: 42, total_events: 100 });
    });
  });

  describe('useAdminUsers', () => {
    it('fetches admin users', async () => {
      mockGetUsers.mockResolvedValue([{ id: 'u1', name: 'Admin' }]);
      const { result } = renderHook(() => useAdminUsers(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockGetUsers).toHaveBeenCalledTimes(1);
    });
  });

  describe('useAdminZeroResourceUsers', () => {
    it('fetches admin users with zero resources', async () => {
      const mockUsers = [{ id: 'u3', name: 'Zero User' }];
      mockGetUsersWithZeroResources.mockResolvedValue(mockUsers);
      const { result } = renderHook(() => useAdminZeroResourceUsers(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockGetUsersWithZeroResources).toHaveBeenCalledTimes(1);
      expect(result.current.data).toEqual(mockUsers);
    });
  });

  describe('useAdminSubscriptions', () => {
    it('fetches admin subscriptions', async () => {
      mockGetSubscriptions.mockResolvedValue([{ plan: 'pro', count: 10 }]);
      const { result } = renderHook(() => useAdminSubscriptions(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockGetSubscriptions).toHaveBeenCalledTimes(1);
    });
  });

  describe('useUpgradeUser', () => {
    it('upgrades a user plan', async () => {
      mockUpgradeUser.mockResolvedValue({});
      const { result } = renderHook(() => useUpgradeUser(), { wrapper: createWrapper() });

      await act(async () => {
        result.current.mutate({ id: 'u1', plan: 'pro', expiresAt: '2026-01-01' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockUpgradeUser).toHaveBeenCalledWith('u1', 'pro', '2026-01-01');
    });

    it('upgrades with null expiresAt', async () => {
      mockUpgradeUser.mockResolvedValue({});
      const { result } = renderHook(() => useUpgradeUser(), { wrapper: createWrapper() });

      await act(async () => {
        result.current.mutate({ id: 'u2', plan: 'business', expiresAt: null });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockUpgradeUser).toHaveBeenCalledWith('u2', 'business', null);
    });
  });
});
