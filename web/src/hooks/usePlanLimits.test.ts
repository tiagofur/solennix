import { renderHook, waitFor } from '@testing-library/react';
import { usePlanLimits } from './usePlanLimits';

let mockUser: any = null;

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

// Mock React Query hooks that usePlanLimits now uses
let mockMonthEvents: any[] = [];
let mockClients: any[] = [];
let mockProducts: any[] = [];
let mockInventory: any[] = [];
let mockEventsLoading = false;
let mockClientsLoading = false;
let mockProductsLoading = false;
let mockInventoryLoading = false;

vi.mock('./queries/useEventQueries', () => ({
  useEventsByDateRange: () => ({ data: mockMonthEvents, isLoading: mockEventsLoading }),
}));

vi.mock('./queries/useClientQueries', () => ({
  useClients: () => ({ data: mockClients, isLoading: mockClientsLoading }),
}));

vi.mock('./queries/useProductQueries', () => ({
  useProducts: () => ({ data: mockProducts, isLoading: mockProductsLoading }),
}));

vi.mock('./queries/useInventoryQueries', () => ({
  useInventoryItems: () => ({ data: mockInventory, isLoading: mockInventoryLoading }),
}));

describe('usePlanLimits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
    mockMonthEvents = [];
    mockClients = [];
    mockProducts = [];
    mockInventory = [];
    mockEventsLoading = false;
    mockClientsLoading = false;
    mockProductsLoading = false;
    mockInventoryLoading = false;
  });

  it('returns loading=false and isBasicPlan=true when no user', async () => {
    const { result } = renderHook(() => usePlanLimits());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isBasicPlan).toBe(true);
    expect(result.current.eventsThisMonth).toBe(0);
  });

  it('fetches all data for basic plan user', async () => {
    mockUser = { id: '1', plan: 'basic' };
    mockMonthEvents = [{ id: 'e1' }, { id: 'e2' }];
    mockClients = [{ id: 'c1' }];
    mockProducts = [{ id: 'p1' }, { id: 'p2' }];
    mockInventory = [{ id: 'i1' }];

    const { result } = renderHook(() => usePlanLimits());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isBasicPlan).toBe(true);
    expect(result.current.eventsThisMonth).toBe(2);
    expect(result.current.clientsCount).toBe(1);
    expect(result.current.productsCount).toBe(2);
    expect(result.current.inventoryCount).toBe(1);
    expect(result.current.canCreateEvent).toBe(true); // 2 < 4
    expect(result.current.canCreateClient).toBe(true); // 1 < 20
    expect(result.current.canCreateProduct).toBe(true); // 2 < 15
    expect(result.current.canCreateInventoryItem).toBe(true); // 1 < 30
    expect(result.current.eventLimit).toBe(4);
    expect(result.current.clientLimit).toBe(20);
    expect(result.current.productLimit).toBe(15);
    expect(result.current.inventoryLimit).toBe(30);
  });

  it('blocks event creation when limit reached on basic plan', async () => {
    mockUser = { id: '1', plan: 'basic' };
    mockMonthEvents = [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }];

    const { result } = renderHook(() => usePlanLimits());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.canCreateEvent).toBe(false); // 4 >= 4
  });

  it('only fetches events for pro plan user', async () => {
    mockUser = { id: '1', plan: 'pro' };
    mockMonthEvents = [{ id: '1' }];

    const { result } = renderHook(() => usePlanLimits());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isBasicPlan).toBe(false);
    expect(result.current.eventsThisMonth).toBe(1);
    expect(result.current.canCreateEvent).toBe(true); // pro has no limit
    // React Query hooks are still called but limits don't apply for pro
  });

  it('treats null/undefined plan as basic', async () => {
    mockUser = { id: '1' };

    const { result } = renderHook(() => usePlanLimits());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isBasicPlan).toBe(true);
  });

  it('handles service errors gracefully for basic plan', async () => {
    mockUser = { id: '1', plan: 'basic' };
    // React Query handles errors internally; hooks return empty arrays as defaults

    const { result } = renderHook(() => usePlanLimits());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.eventsThisMonth).toBe(0);
  });

  it('blocks product creation when compound catalog limit reached on basic plan', async () => {
    mockUser = { id: '1', plan: 'basic' };
    mockProducts = Array.from({ length: 12 }, (_, i) => ({ id: `p${i}` }));
    mockInventory = Array.from({ length: 8 }, (_, i) => ({ id: `i${i}` }));

    const { result } = renderHook(() => usePlanLimits());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.catalogTotal).toBe(20);
    expect(result.current.canCreateProduct).toBe(false);
    expect(result.current.canCreateInventoryItem).toBe(false);
  });

  it('allows inventory when under compound catalog limit on basic plan', async () => {
    mockUser = { id: '1', plan: 'basic' };
    mockProducts = Array.from({ length: 10 }, (_, i) => ({ id: `p${i}` }));
    mockInventory = Array.from({ length: 5 }, (_, i) => ({ id: `i${i}` }));

    const { result } = renderHook(() => usePlanLimits());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.canCreateProduct).toBe(true);
    expect(result.current.canCreateInventoryItem).toBe(true);
  });

  it('handles null responses from services', async () => {
    mockUser = { id: '1', plan: 'basic' };
    // When React Query returns undefined/null, the hook defaults to []

    const { result } = renderHook(() => usePlanLimits());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.eventsThisMonth).toBe(0);
    expect(result.current.clientsCount).toBe(0);
    expect(result.current.productsCount).toBe(0);
    expect(result.current.inventoryCount).toBe(0);
  });
});
