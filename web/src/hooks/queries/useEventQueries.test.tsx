import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockGetAll = vi.fn();
const mockGetPage = vi.fn();
const mockGetById = vi.fn();
const mockGetByClientId = vi.fn();
const mockGetUpcoming = vi.fn();
const mockGetByDateRange = vi.fn();
const mockGetProducts = vi.fn();
const mockGetExtras = vi.fn();
const mockGetEquipment = vi.fn();
const mockGetSupplies = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/services/eventService', () => ({
  eventService: {
    getAll: (...args: any[]) => mockGetAll(...args),
    getPage: (...args: any[]) => mockGetPage(...args),
    getById: (...args: any[]) => mockGetById(...args),
    getByClientId: (...args: any[]) => mockGetByClientId(...args),
    getUpcoming: (...args: any[]) => mockGetUpcoming(...args),
    getByDateRange: (...args: any[]) => mockGetByDateRange(...args),
    getProducts: (...args: any[]) => mockGetProducts(...args),
    getExtras: (...args: any[]) => mockGetExtras(...args),
    getEquipment: (...args: any[]) => mockGetEquipment(...args),
    getSupplies: (...args: any[]) => mockGetSupplies(...args),
    create: (...args: any[]) => mockCreate(...args),
    update: (...args: any[]) => mockUpdate(...args),
    delete: (...args: any[]) => mockDelete(...args),
  },
}));

vi.mock('@/hooks/useToast', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}));

vi.mock('@/lib/errorHandler', () => ({
  logError: vi.fn(),
  getErrorMessage: (_err: any, fallback: string) => fallback,
  getEventCompletionBlockedError: vi.fn(() => null),
}));

import {
  useEvents,
  useEventsPaginated,
  useEvent,
  useEventsByClient,
  useUpcomingEvents,
  useEventsByDateRange,
  useEventProducts,
  useEventExtras,
  useEventEquipment,
  useEventSupplies,
  useCreateEvent,
  useUpdateEvent,
  useUpdateEventStatus,
  useDeleteEvent,
} from './useEventQueries';

const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

describe('useEventQueries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Queries ──

  describe('useEvents', () => {
    it('fetches all events', async () => {
      mockGetAll.mockResolvedValue([{ id: 'ev1' }]);
      const { result } = renderHook(() => useEvents(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockGetAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('useEventsPaginated', () => {
    it('fetches paginated events', async () => {
      mockGetPage.mockResolvedValue({ data: [], total: 0, total_pages: 0 });
      const { result } = renderHook(
        () => useEventsPaginated({ page: 1, limit: 10, sort: 'event_date', order: 'desc' }),
        { wrapper: createWrapper() },
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockGetPage).toHaveBeenCalled();
    });
  });

  describe('useEvent', () => {
    it('does not fetch when id is undefined', () => {
      const { result } = renderHook(() => useEvent(undefined), { wrapper: createWrapper() });
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('fetches event by id', async () => {
      mockGetById.mockResolvedValue({ id: 'ev1', service_type: 'Boda' });
      const { result } = renderHook(() => useEvent('ev1'), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe('useEventsByClient', () => {
    it('does not fetch when clientId is undefined', () => {
      const { result } = renderHook(() => useEventsByClient(undefined), { wrapper: createWrapper() });
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('fetches events by client id', async () => {
      mockGetByClientId.mockResolvedValue([{ id: 'ev1' }]);
      const { result } = renderHook(() => useEventsByClient('cl1'), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe('useUpcomingEvents', () => {
    it('fetches upcoming events', async () => {
      mockGetUpcoming.mockResolvedValue([{ id: 'ev1' }]);
      const { result } = renderHook(() => useUpcomingEvents(3), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockGetUpcoming).toHaveBeenCalledWith(3);
    });
  });

  describe('useEventsByDateRange', () => {
    it('does not fetch when dates are empty', () => {
      const { result } = renderHook(() => useEventsByDateRange('', '2025-12-31'), { wrapper: createWrapper() });
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('fetches events by date range', async () => {
      mockGetByDateRange.mockResolvedValue([]);
      const { result } = renderHook(
        () => useEventsByDateRange('2025-01-01', '2025-12-31'),
        { wrapper: createWrapper() },
      );
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe('useEventProducts', () => {
    it('does not fetch when eventId is undefined', () => {
      const { result } = renderHook(() => useEventProducts(undefined), { wrapper: createWrapper() });
      expect(result.current.fetchStatus).toBe('idle');
    });

    it('fetches event products', async () => {
      mockGetProducts.mockResolvedValue([]);
      const { result } = renderHook(() => useEventProducts('ev1'), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe('useEventExtras', () => {
    it('fetches event extras', async () => {
      mockGetExtras.mockResolvedValue([]);
      const { result } = renderHook(() => useEventExtras('ev1'), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe('useEventEquipment', () => {
    it('fetches event equipment', async () => {
      mockGetEquipment.mockResolvedValue([]);
      const { result } = renderHook(() => useEventEquipment('ev1'), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe('useEventSupplies', () => {
    it('fetches event supplies', async () => {
      mockGetSupplies.mockResolvedValue([]);
      const { result } = renderHook(() => useEventSupplies('ev1'), { wrapper: createWrapper() });
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  // ── Mutations ──

  describe('useCreateEvent', () => {
    it('creates an event', async () => {
      mockCreate.mockResolvedValue({ id: 'new-ev' });
      const { result } = renderHook(() => useCreateEvent(), { wrapper: createWrapper() });

      await act(async () => {
        result.current.mutate({ service_type: 'Boda' } as any);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockCreate).toHaveBeenCalled();
    });
  });

  describe('useUpdateEvent', () => {
    it('updates an event', async () => {
      mockUpdate.mockResolvedValue({});
      const { result } = renderHook(() => useUpdateEvent(), { wrapper: createWrapper() });

      await act(async () => {
        result.current.mutate({ id: 'ev1', data: { service_type: 'XV' } as any });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockUpdate).toHaveBeenCalledWith('ev1', { service_type: 'XV' });
    });
  });

  describe('useUpdateEventStatus', () => {
    it('updates event status', async () => {
      mockUpdate.mockResolvedValue({});
      const { result } = renderHook(() => useUpdateEventStatus(), { wrapper: createWrapper() });

      await act(async () => {
        result.current.mutate({ id: 'ev1', status: 'confirmed' });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockUpdate).toHaveBeenCalledWith('ev1', { status: 'confirmed' });
    });
  });

  describe('useDeleteEvent', () => {
    it('deletes an event', async () => {
      mockDelete.mockResolvedValue(undefined);
      const { result } = renderHook(() => useDeleteEvent(), { wrapper: createWrapper() });

      await act(async () => {
        result.current.mutate('ev1');
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(mockDelete).toHaveBeenCalledWith('ev1');
    });
  });
});
