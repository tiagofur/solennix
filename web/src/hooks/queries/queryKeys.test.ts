import { describe, it, expect } from 'vitest';
import { queryKeys } from './queryKeys';

describe('queryKeys', () => {
  describe('clients', () => {
    it('all returns stable array', () => {
      expect(queryKeys.clients.all).toEqual(['clients']);
    });

    it('detail includes id', () => {
      expect(queryKeys.clients.detail('abc')).toEqual(['clients', 'abc']);
    });
  });

  describe('events', () => {
    it('all returns stable array', () => {
      expect(queryKeys.events.all).toEqual(['events']);
    });

    it('detail includes id', () => {
      expect(queryKeys.events.detail('e1')).toEqual(['events', 'e1']);
    });

    it('products scoped to event', () => {
      expect(queryKeys.events.products('e1')).toEqual(['events', 'e1', 'products']);
    });

    it('dateRange includes both dates', () => {
      expect(queryKeys.events.dateRange('2026-01-01', '2026-01-31')).toEqual([
        'events', 'range', '2026-01-01', '2026-01-31',
      ]);
    });

    it('byClient includes clientId', () => {
      expect(queryKeys.events.byClient('c1')).toEqual(['events', 'byClient', 'c1']);
    });
  });

  describe('products', () => {
    it('ingredients scoped to product', () => {
      expect(queryKeys.products.ingredients('p1')).toEqual(['products', 'p1', 'ingredients']);
    });

    it('ingredientsBatch includes all ids', () => {
      expect(queryKeys.products.ingredientsBatch(['p1', 'p2'])).toEqual([
        'products', 'ingredients', 'batch', 'p1', 'p2',
      ]);
    });
  });

  describe('payments', () => {
    it('byEvent includes eventId', () => {
      expect(queryKeys.payments.byEvent('e1')).toEqual(['payments', 'event', 'e1']);
    });

    it('byDateRange includes dates', () => {
      expect(queryKeys.payments.byDateRange('2026-01', '2026-02')).toEqual([
        'payments', 'range', '2026-01', '2026-02',
      ]);
    });
  });

  describe('hierarchical invalidation', () => {
    it('clients.all is prefix of clients.detail', () => {
      const all = queryKeys.clients.all;
      const detail = queryKeys.clients.detail('x');
      expect(detail.slice(0, all.length)).toEqual([...all]);
    });

    it('events.all is prefix of events.detail', () => {
      const all = queryKeys.events.all;
      const detail = queryKeys.events.detail('x');
      expect(detail.slice(0, all.length)).toEqual([...all]);
    });
  });
});
