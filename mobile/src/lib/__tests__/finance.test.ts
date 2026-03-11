import { getEventTaxAmount, getEventTotalCharged, getEventNetSales } from '../finance';

describe('finance utilities', () => {
  describe('getEventTaxAmount', () => {
    it('returns tax_amount if requires_invoice is true', () => {
      expect(getEventTaxAmount({ requires_invoice: true, tax_amount: 50 })).toBe(50);
    });

    it('returns 0 if requires_invoice is false', () => {
      expect(getEventTaxAmount({ requires_invoice: false, tax_amount: 50 })).toBe(0);
    });
  });

  describe('getEventTotalCharged', () => {
    it('returns total_amount', () => {
      expect(getEventTotalCharged({ total_amount: 150 })).toBe(150);
    });
    
    it('returns 0 if total_amount is falsy', () => {
      expect(getEventTotalCharged({ total_amount: 0 })).toBe(0);
    });
  });

  describe('getEventNetSales', () => {
    it('returns total minus tax when invoice required', () => {
      expect(getEventNetSales({ requires_invoice: true, total_amount: 150, tax_amount: 50 })).toBe(100);
    });

    it('returns total when invoice not required', () => {
      expect(getEventNetSales({ requires_invoice: false, total_amount: 150, tax_amount: 50 })).toBe(150);
    });
    
    it('does not return negative net sales', () => {
      expect(getEventNetSales({ requires_invoice: true, total_amount: 50, tax_amount: 100 })).toBe(0);
    });
  });
});
