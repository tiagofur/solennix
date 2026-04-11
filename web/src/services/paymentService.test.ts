import { describe, it, expect, vi, beforeEach } from 'vitest';
import { paymentService } from './paymentService';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('paymentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAll calls api.get', async () => {
    (api.get as any).mockResolvedValue([]);
    await paymentService.getAll();
    expect(api.get).toHaveBeenCalledWith('/payments');
  });

  it('getPage calls api.get with pagination params and returns envelope', async () => {
    const response = { data: [{ id: '1' }], total: 1, page: 5, limit: 40, total_pages: 1 };
    (api.get as any).mockResolvedValue(response);

    await expect(paymentService.getPage({ page: 5, limit: 40, sort: 'payment_date', order: 'desc' })).resolves.toEqual(response);
    expect(api.get).toHaveBeenCalledWith('/payments', { page: '5', limit: '40', sort: 'payment_date', order: 'desc' });
  });

  it('getByEventId calls api.get with params', async () => {
    (api.get as any).mockResolvedValue([]);
    await paymentService.getByEventId('event-1');
    expect(api.get).toHaveBeenCalledWith('/payments', { event_id: 'event-1' });
  });

  it('getByPaymentDateRange calls api.get with params', async () => {
    (api.get as any).mockResolvedValue([]);
    await paymentService.getByPaymentDateRange('start', 'end');
    expect(api.get).toHaveBeenCalledWith('/payments', { start: 'start', end: 'end' });
  });

  it('getByEventIds calls api.get with params', async () => {
    (api.get as any).mockResolvedValue([]);
    await paymentService.getByEventIds(['a', 'b']);
    expect(api.get).toHaveBeenCalledWith('/payments', { event_ids: 'a,b' });
  });

  it('create calls api.post', async () => {
    (api.post as any).mockResolvedValue({ id: '1' });
    await paymentService.create({ amount: 100 } as any);
    expect(api.post).toHaveBeenCalledWith('/payments', { amount: 100 });
  });

  it('update calls api.put', async () => {
    (api.put as any).mockResolvedValue({ id: '1' });
    await paymentService.update('1', { amount: 200 } as any);
    expect(api.put).toHaveBeenCalledWith('/payments/1', { amount: 200 });
  });

  it('delete calls api.delete', async () => {
    (api.delete as any).mockResolvedValue({});
    await paymentService.delete('1');
    expect(api.delete).toHaveBeenCalledWith('/payments/1');
  });

  it('getByEventIds returns empty array for empty input', async () => {
    const result = await paymentService.getByEventIds([]);
    expect(result).toEqual([]);
    expect(api.get).not.toHaveBeenCalled();
  });
});
