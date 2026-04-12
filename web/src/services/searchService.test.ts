import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchService } from './searchService';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

describe('searchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty results for empty query', async () => {
    const result = await searchService.searchAll('');
    expect(result).toEqual({ clients: [], events: [], products: [], inventory: [] });
    expect(api.get).not.toHaveBeenCalled();
  });

  it('filters clients by name', async () => {
    (api.get as any).mockResolvedValue({
      clients: [
        { id: '1', name: 'Juan', email: 'juan@test.com', city: 'CDMX', phone: '123' },
      ],
      products: [],
      inventory: [],
      events: [],
    });

    const result = await searchService.searchAll('juan');
    expect(api.get).toHaveBeenCalledWith('/search?q=juan');
    expect(result.clients).toHaveLength(1);
    expect(result.clients[0].title).toBe('Juan');
  });

  it('maps and filters across entities', async () => {
    (api.get as any).mockResolvedValue({
      clients: [
        { id: '1', name: 'Maria', email: 'maria@test.com', city: 'GDL', phone: '555' },
      ],
      products: [],
      inventory: [],
      events: [
        { id: 'e1', service_type: 'Boda', event_date: '2024-01-02', status: 'confirmed', client: { name: 'Maria' } },
      ],
    });

    const result = await searchService.searchAll('ma', 1);

    expect(result.clients).toHaveLength(1);
    expect(result.clients[0].subtitle).toContain('maria@test.com');
    expect(result.products).toHaveLength(0);
    expect(result.inventory).toHaveLength(0);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].href).toBe('/events/e1/summary');
  });

  it('handles events with client shape and inventory equipment', async () => {
    (api.get as any).mockResolvedValue({
      clients: [],
      products: [],
      inventory: [
        { id: 'i2', ingredient_name: 'Horno', type: 'equipment', unit: 'pieza', current_stock: 1 },
      ],
      events: [],
    });

    const result = await searchService.searchAll('ho');

    expect(result.inventory[0].subtitle).toBe('Equipo - pieza');
    expect(result.products).toHaveLength(0);
    expect(result.events).toHaveLength(0);
  });

  it('maps product meta only when base price exists', async () => {
    (api.get as any).mockResolvedValue({
      clients: [],
      products: [
        { id: 'p1', name: 'Tacos', category: 'Comida', base_price: 0 },
      ],
      inventory: [],
      events: [],
    });

    const result = await searchService.searchAll('tacos');

    expect(result.products).toHaveLength(1);
    expect(result.products[0].meta).toBeUndefined();
  });

  it('maps product with base_price and without category', async () => {
    (api.get as any).mockResolvedValue({
      clients: [],
      products: [
        { id: 'p2', name: 'Sushi', category: '', base_price: 150.5 },
      ],
      inventory: [],
      events: [],
    });

    const result = await searchService.searchAll('sushi');

    expect(result.products).toHaveLength(1);
    expect(result.products[0].meta).toBe('$150.50');
    expect(result.products[0].subtitle).toBeUndefined();
  });

  it('maps client without city', async () => {
    (api.get as any).mockResolvedValue({
      clients: [
        { id: 'c1', name: 'Ana', email: '', phone: '555', city: '' },
      ],
      products: [],
      inventory: [],
      events: [],
    });

    const result = await searchService.searchAll('ana');

    expect(result.clients).toHaveLength(1);
    expect(result.clients[0].meta).toBeUndefined();
  });

  it('maps inventory item with ingredient type', async () => {
    (api.get as any).mockResolvedValue({
      clients: [],
      products: [],
      inventory: [
        { id: 'i1', ingredient_name: 'Harina', type: 'ingredient', unit: 'kg', current_stock: 10 },
      ],
      events: [],
    });

    const result = await searchService.searchAll('harina');

    expect(result.inventory).toHaveLength(1);
    expect(result.inventory[0].subtitle).toBe('Insumo - kg');
    expect(result.inventory[0].meta).toBe('Stock: 10 kg');
  });

  it('maps event without client', async () => {
    (api.get as any).mockResolvedValue({
      clients: [],
      products: [],
      inventory: [],
      events: [
        { id: 'e2', service_type: 'Cumple', event_date: '2024-05-01', status: 'quoted', client: null },
      ],
    });

    const result = await searchService.searchAll('cumple');

    expect(result.events).toHaveLength(1);
    expect(result.events[0].subtitle).toBeUndefined();
    expect(result.events[0].status).toBe('quoted');
  });

  it('handles response with missing/undefined arrays', async () => {
    (api.get as any).mockResolvedValue({});

    const result = await searchService.searchAll('test');

    expect(result.clients).toEqual([]);
    expect(result.products).toEqual([]);
    expect(result.inventory).toEqual([]);
    expect(result.events).toEqual([]);
  });

  it('returns empty results for whitespace-only query', async () => {
    const result = await searchService.searchAll('   ');
    expect(result).toEqual({ clients: [], events: [], products: [], inventory: [] });
    expect(api.get).not.toHaveBeenCalled();
  });
});
