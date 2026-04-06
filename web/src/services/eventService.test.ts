import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eventService } from './eventService';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('eventService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getAll calls api.get', async () => {
    (api.get as any).mockResolvedValue([]);
    await eventService.getAll();
    expect(api.get).toHaveBeenCalledWith('/events');
  });

  it('getByDateRange calls api.get with params', async () => {
    (api.get as any).mockResolvedValue([]);
    await eventService.getByDateRange('start', 'end');
    expect(api.get).toHaveBeenCalledWith('/events', { start: 'start', end: 'end' });
  });

  it('getByClientId calls api.get with params', async () => {
    (api.get as any).mockResolvedValue([]);
    await eventService.getByClientId('client-1');
    expect(api.get).toHaveBeenCalledWith('/events', { client_id: 'client-1' });
  });

  it('getById calls api.get', async () => {
    (api.get as any).mockResolvedValue({ id: '1' });
    await eventService.getById('1');
    expect(api.get).toHaveBeenCalledWith('/events/1');
  });

  it('create calls api.post', async () => {
    (api.post as any).mockResolvedValue({ id: '1' });
    await eventService.create({ service_type: 'Test' } as any);
    expect(api.post).toHaveBeenCalledWith('/events', { service_type: 'Test' });
  });

  it('update calls api.put', async () => {
    (api.put as any).mockResolvedValue({ id: '1' });
    await eventService.update('1', { service_type: 'Updated' } as any);
    expect(api.put).toHaveBeenCalledWith('/events/1', { service_type: 'Updated' });
  });

  it('delete calls api.delete', async () => {
    (api.delete as any).mockResolvedValue({});
    await eventService.delete('1');
    expect(api.delete).toHaveBeenCalledWith('/events/1');
  });

  it('getUpcoming calls api.get with limit', async () => {
    (api.get as any).mockResolvedValue([]);
    await eventService.getUpcoming(5);
    expect(api.get).toHaveBeenCalledWith('/events/upcoming', { limit: '5' });
  });

  it('getProducts calls api.get with event id', async () => {
    (api.get as any).mockResolvedValue([]);
    await eventService.getProducts('event-1');
    expect(api.get).toHaveBeenCalledWith('/events/event-1/products');
  });

  it('getExtras calls api.get with event id', async () => {
    (api.get as any).mockResolvedValue([]);
    await eventService.getExtras('event-1');
    expect(api.get).toHaveBeenCalledWith('/events/event-1/extras');
  });

  it('updateItems maps products and extras payloads', async () => {
    (api.put as any).mockResolvedValue({});

    await eventService.updateItems(
      'event-1',
      [{ productId: 'p1', quantity: 2, unitPrice: 100, discount: 5 }],
      [{ description: 'Transporte', cost: 50, price: 80, exclude_utility: true }],
    );

    expect(api.put).toHaveBeenCalledWith('/events/event-1/items', {
      products: [
        {
          product_id: 'p1',
          quantity: 2,
          unit_price: 100,
          discount: 5,
        },
      ],
      extras: [
        {
          description: 'Transporte',
          cost: 50,
          price: 80,
          exclude_utility: true,
          include_in_checklist: true,
        },
      ],
    });
  });

  it('addProducts merges existing products and extras', async () => {
    (api.get as any)
      .mockResolvedValueOnce([
        { product_id: 'p1', quantity: 1, unit_price: 50, discount: 0 },
      ])
      .mockResolvedValueOnce([
        { description: 'Extra', cost: 10, price: 15, exclude_utility: false },
      ]);
    (api.put as any).mockResolvedValue({});

    await eventService.addProducts('event-1', [
      { productId: 'p2', quantity: 2, unitPrice: 80, discount: 0 },
    ]);

    expect(api.put).toHaveBeenCalledWith('/events/event-1/items', {
      products: [
        { product_id: 'p1', quantity: 1, unit_price: 50, discount: 0 },
        { product_id: 'p2', quantity: 2, unit_price: 80, discount: 0 },
      ],
      extras: [
        { description: 'Extra', cost: 10, price: 15, exclude_utility: false, include_in_checklist: true },
      ],
    });
  });

  it('updateProducts keeps extras', async () => {
    (api.get as any).mockResolvedValue([
      { description: 'Extra', cost: 10, price: 15, exclude_utility: false },
    ]);
    (api.put as any).mockResolvedValue({});

    await eventService.updateProducts('event-1', [
      { productId: 'p2', quantity: 2, unitPrice: 80, discount: 0 },
    ]);

    expect(api.put).toHaveBeenCalledWith('/events/event-1/items', {
      products: [
        { product_id: 'p2', quantity: 2, unit_price: 80, discount: 0 },
      ],
      extras: [
        { description: 'Extra', cost: 10, price: 15, exclude_utility: false, include_in_checklist: true },
      ],
    });
  });

  it('updateExtras keeps products', async () => {
    (api.get as any).mockResolvedValue([
      { product_id: 'p1', quantity: 1, unit_price: 50, discount: 0 },
    ]);
    (api.put as any).mockResolvedValue({});

    await eventService.updateExtras('event-1', [
      { description: 'Transporte', cost: 50, price: 80, exclude_utility: true },
    ]);

    expect(api.put).toHaveBeenCalledWith('/events/event-1/items', {
      products: [
        { product_id: 'p1', quantity: 1, unit_price: 50, discount: 0 },
      ],
      extras: [
        { description: 'Transporte', cost: 50, price: 80, exclude_utility: true, include_in_checklist: true },
      ],
    });
  });

  it('updateItems includes equipment when provided', async () => {
    (api.put as any).mockResolvedValue({});

    await eventService.updateItems(
      'event-1',
      [{ productId: 'p1', quantity: 1, unitPrice: 100 }],
      [{ description: 'Extra', cost: 10, price: 20, exclude_utility: false }],
      [{ inventoryId: 'inv-1', quantity: 3, notes: 'fragile' }],
    );

    expect(api.put).toHaveBeenCalledWith('/events/event-1/items', {
      products: [{ product_id: 'p1', quantity: 1, unit_price: 100, discount: 0 }],
      extras: [{ description: 'Extra', cost: 10, price: 20, exclude_utility: false, include_in_checklist: true }],
      equipment: [{ inventory_id: 'inv-1', quantity: 3, notes: 'fragile' }],
    });
  });

  it('getEquipment calls api.get', async () => {
    (api.get as any).mockResolvedValue([]);
    await eventService.getEquipment('event-1');
    expect(api.get).toHaveBeenCalledWith('/events/event-1/equipment');
  });

  it('checkEquipmentConflicts calls api.post', async () => {
    (api.post as any).mockResolvedValue([]);
    const params = {
      event_date: '2024-01-01',
      start_time: '10:00',
      end_time: '14:00',
      inventory_ids: ['inv-1', 'inv-2'],
      exclude_event_id: 'event-1',
    };
    await eventService.checkEquipmentConflicts(params);
    expect(api.post).toHaveBeenCalledWith('/events/equipment/conflicts', params);
  });

  it('getEquipmentSuggestions calls api.post with products', async () => {
    (api.post as any).mockResolvedValue([]);
    const products = [{ product_id: 'p1', quantity: 2 }, { product_id: 'p2', quantity: 5 }];
    await eventService.getEquipmentSuggestions(products);
    expect(api.post).toHaveBeenCalledWith('/events/equipment/suggestions', { products });
  });
});
