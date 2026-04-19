import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { queryKeys } from './queryKeys';

const mockGetByEventId = vi.fn();
const mockGetByEventIds = vi.fn();
const mockGetByPaymentDateRange = vi.fn();
const mockCreate = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/services/paymentService', () => ({
  paymentService: {
    getByEventId: (...args: any[]) => mockGetByEventId(...args),
    getByEventIds: (...args: any[]) => mockGetByEventIds(...args),
    getByPaymentDateRange: (...args: any[]) => mockGetByPaymentDateRange(...args),
    create: (...args: any[]) => mockCreate(...args),
    delete: (...args: any[]) => mockDelete(...args),
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
  usePaymentsByEvent,
  usePaymentsByEventIds,
  usePaymentsByDateRange,
  useCreatePayment,
  useDeletePayment,
} from './usePaymentQueries';

const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

const createWrapperWithClient = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { wrapper, queryClient };
};

describe('usePaymentQueries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('usePaymentsByEvent', () => {
    it('does not fetch when eventId is undefined', () => {
      const { result } = renderHook(() => usePaymentsByEvent(undefined), { wrapper: createWrapper() });
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('fetches payments by event id', async () => {
      mockGetByEventId.mockResolvedValue([{ id: 'pay1', amount: 500 }]);
      const { result } = renderHook(() => usePaymentsByEvent('ev1'), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockGetByEventId).toHaveBeenCalledWith('ev1');
    });
  });

  describe('usePaymentsByEventIds', () => {
    it('does not fetch when eventIds is empty', () => {
      const { result } = renderHook(() => usePaymentsByEventIds([]), { wrapper: createWrapper() });
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('fetches payments by multiple event ids', async () => {
      mockGetByEventIds.mockResolvedValue([{ id: 'pay1' }, { id: 'pay2' }]);
      const { result } = renderHook(() => usePaymentsByEventIds(['ev1', 'ev2']), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockGetByEventIds).toHaveBeenCalledWith(['ev1', 'ev2']);
    });
  });

  describe('usePaymentsByDateRange', () => {
    it('does not fetch when start or end is empty', () => {
      const { result } = renderHook(() => usePaymentsByDateRange('', '2025-12-31'), { wrapper: createWrapper() });
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('fetches payments by date range', async () => {
      mockGetByPaymentDateRange.mockResolvedValue([]);
      const { result } = renderHook(
        () => usePaymentsByDateRange('2025-01-01', '2025-12-31'),
        { wrapper: createWrapper() },
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockGetByPaymentDateRange).toHaveBeenCalledWith('2025-01-01', '2025-12-31');
    });
  });

  describe('useCreatePayment', () => {
    it('creates a payment', async () => {
      mockCreate.mockResolvedValue({ id: 'pay1' });
      const { result } = renderHook(() => useCreatePayment(), { wrapper: createWrapper() });

      await act(async () => {
        result.current.mutate({ event_id: 'ev1', amount: 500, method: 'cash' } as any);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockCreate).toHaveBeenCalledWith({ event_id: 'ev1', amount: 500, method: 'cash' });
    });
  });

  describe('useDeletePayment', () => {
    it('deletes a payment', async () => {
      mockDelete.mockResolvedValue(undefined);
      const { result } = renderHook(() => useDeletePayment(), { wrapper: createWrapper() });

      await act(async () => {
        result.current.mutate({ id: 'pay1', eventId: 'ev1' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockDelete).toHaveBeenCalledWith('pay1');
    });
  });

  describe('byEventIds invalidation on mutations', () => {
    // Regression for the dashboard "saldo pendiente" stale-cache bug:
    // useCreatePayment / useDeletePayment must invalidate every active
    // ['payments', 'byEventIds', ...] query, not just the per-event one.
    it('useCreatePayment invalidates a seeded byEventIds query', async () => {
      mockCreate.mockResolvedValue({ id: 'pay-new' });
      const { wrapper, queryClient } = createWrapperWithClient();

      const seededKey = queryKeys.payments.byEventIds(['ev1', 'ev2']);
      queryClient.setQueryData(seededKey, [{ id: 'old', amount: 100 }]);
      expect(queryClient.getQueryState(seededKey)?.isInvalidated).toBe(false);

      const { result } = renderHook(() => useCreatePayment(), { wrapper });
      await act(async () => {
        result.current.mutate({ event_id: 'ev1', amount: 500 } as any);
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(queryClient.getQueryState(seededKey)?.isInvalidated).toBe(true);
    });

    it('useDeletePayment invalidates a seeded byEventIds query', async () => {
      mockDelete.mockResolvedValue(undefined);
      const { wrapper, queryClient } = createWrapperWithClient();

      const seededKey = queryKeys.payments.byEventIds(['ev1', 'ev2']);
      queryClient.setQueryData(seededKey, [{ id: 'old', amount: 100 }]);
      expect(queryClient.getQueryState(seededKey)?.isInvalidated).toBe(false);

      const { result } = renderHook(() => useDeletePayment(), { wrapper });
      await act(async () => {
        result.current.mutate({ id: 'pay1', eventId: 'ev1' });
      });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(queryClient.getQueryState(seededKey)?.isInvalidated).toBe(true);
    });
  });
});
