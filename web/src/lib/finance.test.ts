import { describe, it, expect } from 'vitest';
import { getEventTaxAmount, getEventTotalCharged, getEventNetSales } from './finance';

describe('finance utils', () => {
  describe('getEventTaxAmount', () => {
    it('returns 0 when invoice not required', () => {
      expect(getEventTaxAmount({ requires_invoice: false, tax_amount: 1600 })).toBe(0);
    });

    it('returns tax amount when invoice required', () => {
      expect(getEventTaxAmount({ requires_invoice: true, tax_amount: 1600 })).toBe(1600);
    });

    it('returns 0 when tax_amount is null', () => {
      expect(getEventTaxAmount({ requires_invoice: true, tax_amount: 0 })).toBe(0);
    });
  });

  describe('getEventTotalCharged', () => {
    it('returns total amount', () => {
      expect(getEventTotalCharged({ total_amount: 15000 })).toBe(15000);
    });

    it('returns 0 for zero total', () => {
      expect(getEventTotalCharged({ total_amount: 0 })).toBe(0);
    });
  });

  describe('getEventNetSales', () => {
    it('returns total minus tax when invoice required', () => {
      expect(
        getEventNetSales({ total_amount: 11600, requires_invoice: true, tax_amount: 1600 }),
      ).toBe(10000);
    });

    it('returns total when no invoice', () => {
      expect(
        getEventNetSales({ total_amount: 10000, requires_invoice: false, tax_amount: 0 }),
      ).toBe(10000);
    });

    it('never returns negative', () => {
      expect(
        getEventNetSales({ total_amount: 100, requires_invoice: true, tax_amount: 200 }),
      ).toBe(0);
    });
  });
});
