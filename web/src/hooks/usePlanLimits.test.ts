import { renderHook, waitFor } from '@testing-library/react';
import { usePlanLimits } from './usePlanLimits';

let mockUser: any = null;

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

const mockGetByDateRange = vi.fn();
const mockGetAllClients = vi.fn();
const mockGetAllProducts = vi.fn();
const mockGetAllInventory = vi.fn();

vi.mock('../services/eventService', () => ({
  eventService: {
    getByDateRange: (...args: any[]) => mockGetByDateRange(...args),
  },
}));

vi.mock('../services/clientService', () => ({
  clientService: {
    getAll: () => mockGetAllClients(),
  },
}));

vi.mock('../services/productService', () => ({
  productService: {
    getAll: () => mockGetAllProducts(),
  },
}));

vi.mock('../services/inventoryService', () => ({
  inventoryService: {
    getAll: () => mockGetAllInventory(),
  },
}));

describe('usePlanLimits', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
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
    mockGetByDateRange.mockResolvedValue([{ id: 'e1' }, { id: 'e2' }]);
    mockGetAllClients.mockResolvedValue([{ id: 'c1' }]);
    mockGetAllProducts.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
    mockGetAllInventory.mockResolvedValue([{ id: 'i1' }]);

    const { result } = renderHook(() => usePlanLimits());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isBasicPlan).toBe(true);
    expect(result.current.eventsThisMonth).toBe(2);
    expect(result.current.clientsCount).toBe(1);
    expect(result.current.catalogCount).toBe(3); // 2 products + 1 inventory
    expect(result.current.canCreateEvent).toBe(true); // 2 < 3
    expect(result.current.canCreateClient).toBe(true); // 1 < 50
    expect(result.current.canCreateCatalogItem).toBe(true); // 3 < 20
    expect(result.current.limit).toBe(3);
    expect(result.current.clientLimit).toBe(50);
    expect(result.current.catalogLimit).toBe(20);
  });

  it('blocks event creation when limit reached on basic plan', async () => {
    mockUser = { id: '1', plan: 'basic' };
    mockGetByDateRange.mockResolvedValue([{ id: '1' }, { id: '2' }, { id: '3' }]);
    mockGetAllClients.mockResolvedValue([]);
    mockGetAllProducts.mockResolvedValue([]);
    mockGetAllInventory.mockResolvedValue([]);

    const { result } = renderHook(() => usePlanLimits());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.canCreateEvent).toBe(false); // 3 >= 3
  });

  it('only fetches events for pro plan user', async () => {
    mockUser = { id: '1', plan: 'pro' };
    mockGetByDateRange.mockResolvedValue([{ id: '1' }]);

    const { result } = renderHook(() => usePlanLimits());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isBasicPlan).toBe(false);
    expect(result.current.eventsThisMonth).toBe(1);
    expect(result.current.canCreateEvent).toBe(true); // pro has no limit
    expect(mockGetAllClients).not.toHaveBeenCalled();
    expect(mockGetAllProducts).not.toHaveBeenCalled();
  });

  it('treats null/undefined plan as basic', async () => {
    mockUser = { id: '1' };
    mockGetByDateRange.mockResolvedValue([]);
    mockGetAllClients.mockResolvedValue([]);
    mockGetAllProducts.mockResolvedValue([]);
    mockGetAllInventory.mockResolvedValue([]);

    const { result } = renderHook(() => usePlanLimits());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.isBasicPlan).toBe(true);
  });

  it('handles service errors gracefully for basic plan', async () => {
    mockUser = { id: '1', plan: 'basic' };
    mockGetByDateRange.mockRejectedValue(new Error('fail'));
    mockGetAllClients.mockRejectedValue(new Error('fail'));
    mockGetAllProducts.mockRejectedValue(new Error('fail'));
    mockGetAllInventory.mockRejectedValue(new Error('fail'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => usePlanLimits());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Errors are caught per-service with .catch(() => []), so counts default to 0
    expect(result.current.eventsThisMonth).toBe(0);

    consoleSpy.mockRestore();
  });

  it('handles null responses from services', async () => {
    mockUser = { id: '1', plan: 'basic' };
    mockGetByDateRange.mockResolvedValue(null);
    mockGetAllClients.mockResolvedValue(null);
    mockGetAllProducts.mockResolvedValue(null);
    mockGetAllInventory.mockResolvedValue(null);

    const { result } = renderHook(() => usePlanLimits());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.eventsThisMonth).toBe(0);
    expect(result.current.clientsCount).toBe(0);
    expect(result.current.catalogCount).toBe(0);
  });
});
