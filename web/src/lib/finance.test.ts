import { describe, it, expect } from 'vitest';
import { getEventNetSales, getEventTaxAmount, getEventTotalCharged } from './finance';
import { Event } from '../types/entities';

// type EventRow = Pick<Event, 'requires_invoice' | 'tax_amount'>;

describe('finance helpers', () => {
  describe('getEventTaxAmount', () => {
    it('returns 0 when invoice is not required', () => {
      const event = { requires_invoice: false, tax_amount: 100 } as Pick<Event, 'requires_invoice' | 'tax_amount'>;
      expect(getEventTaxAmount(event)).toBe(0);
    });

    it('returns 0 when tax_amount is null', () => {
      const event = { requires_invoice: true, tax_amount: null } as Pick<Event, 'requires_invoice' | 'tax_amount'>;
      expect(getEventTaxAmount(event)).toBe(0);
    });

    it('returns numeric tax amount when invoice is required', () => {
      const event = { requires_invoice: true, tax_amount: 160 } as Pick<Event, 'requires_invoice' | 'tax_amount'>;
      expect(getEventTaxAmount(event)).toBe(160);
    });

    it('coerces string tax amount', () => {
      const event = { requires_invoice: true, tax_amount: '150.50' } as unknown as Pick<Event, 'requires_invoice' | 'tax_amount'>;
      expect(getEventTaxAmount(event)).toBe(150.5);
    });
  });

  describe('getEventTotalCharged', () => {
    it('returns total_amount when present', () => {
      const event = { total_amount: 1160 } as Pick<Event, 'total_amount'>;
      expect(getEventTotalCharged(event)).toBe(1160);
    });

    it('returns 0 when total_amount is null', () => {
      const event = { total_amount: null } as Pick<Event, 'total_amount'>;
      expect(getEventTotalCharged(event)).toBe(0);
    });

    it('coerces string total_amount', () => {
      const event = { total_amount: '1000.25' } as unknown as Pick<Event, 'total_amount'>;
      expect(getEventTotalCharged(event)).toBe(1000.25);
    });
  });

  describe('getEventNetSales', () => {
    it('returns total when no invoice', () => {
      const event = { requires_invoice: false, total_amount: 1000, tax_amount: 160 } as Pick<Event, 'requires_invoice' | 'total_amount' | 'tax_amount'>;
      expect(getEventNetSales(event)).toBe(1000);
    });

    it('returns total minus tax', () => {
      const event = { requires_invoice: true, total_amount: 1160, tax_amount: 160 } as Pick<Event, 'requires_invoice' | 'total_amount' | 'tax_amount'>;
      expect(getEventNetSales(event)).toBe(1000);
    });

    it('never returns negative values', () => {
      const event = { requires_invoice: true, total_amount: 100, tax_amount: 160 } as Pick<Event, 'requires_invoice' | 'total_amount' | 'tax_amount'>;
      expect(getEventNetSales(event)).toBe(0);
    });
  });
});
