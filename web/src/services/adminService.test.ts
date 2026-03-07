import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminService } from './adminService';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('adminService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getStats calls the correct endpoint', async () => {
    const mockStats = { total_users: 10 };
    vi.mocked(api.get).mockResolvedValue(mockStats);

    const result = await adminService.getStats();

    expect(api.get).toHaveBeenCalledWith('/admin/stats');
    expect(result).toEqual(mockStats);
  });

  it('getUsers calls the correct endpoint', async () => {
    const mockUsers = [{ id: '1', email: 'test@admin.com' }];
    vi.mocked(api.get).mockResolvedValue(mockUsers);

    const result = await adminService.getUsers();

    expect(api.get).toHaveBeenCalledWith('/admin/users');
    expect(result).toEqual(mockUsers);
  });

  it('getUserById calls the correct endpoint', async () => {
    const mockUser = { id: '1', email: 'test@admin.com' };
    vi.mocked(api.get).mockResolvedValue(mockUser);

    const result = await adminService.getUserById('1');

    expect(api.get).toHaveBeenCalledWith('/admin/users/1');
    expect(result).toEqual(mockUser);
  });

  it('upgradeUser calls the correct endpoint with default plan', async () => {
    const mockUser = { id: '1', plan: 'pro' };
    vi.mocked(api.put).mockResolvedValue(mockUser);

    const result = await adminService.upgradeUser('1');

    expect(api.put).toHaveBeenCalledWith('/admin/users/1/upgrade', {
      plan: 'pro',
      expires_at: null,
    });
    expect(result).toEqual(mockUser);
  });

  it('upgradeUser calls the correct endpoint with custom plan and date', async () => {
    const mockUser = { id: '1', plan: 'premium' };
    const expiresAt = '2025-01-01';
    vi.mocked(api.put).mockResolvedValue(mockUser);

    const result = await adminService.upgradeUser('1', 'premium', expiresAt);

    expect(api.put).toHaveBeenCalledWith('/admin/users/1/upgrade', {
      plan: 'premium',
      expires_at: expiresAt,
    });
    expect(result).toEqual(mockUser);
  });

  it('getSubscriptions calls the correct endpoint', async () => {
    const mockSubs = { total_active: 5 };
    vi.mocked(api.get).mockResolvedValue(mockSubs);

    const result = await adminService.getSubscriptions();

    expect(api.get).toHaveBeenCalledWith('/admin/subscriptions');
    expect(result).toEqual(mockSubs);
  });
});
