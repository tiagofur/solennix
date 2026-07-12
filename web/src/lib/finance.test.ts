import { describe, it, expect, afterEach } from 'vitest';
import {
  getEventTaxAmount,
  getEventTotalCharged,
  getEventNetSales,
  formatCurrency,
  setDefaultCurrency,
  setDefaultLocale,
  localeFromLanguage,
} from './finance';

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

  describe('formatCurrency', () => {
    afterEach(() => {
      // Reset module-level defaults so tests are isolated
      setDefaultLocale('es-MX');
      setDefaultCurrency('MXN');
    });

    it('formats using the default es-MX locale and MXN currency', () => {
      // es-MX + MXN → bare $ symbol
      expect(formatCurrency(1500)).toBe('$1,500.00');
    });

    it('switches formatting when setDefaultLocale changes', () => {
      // en-US + MXN → Intl disambiguates with MX$ prefix
      setDefaultLocale('en-US');
      expect(formatCurrency(1500)).toBe('MX$1,500.00');
    });

    it('honors an explicit currency argument', () => {
      // en-US + USD → bare $ symbol
      setDefaultLocale('en-US');
      expect(formatCurrency(1500, 'USD')).toBe('$1,500.00');
    });

    it('returns $0.00 for NaN input', () => {
      expect(formatCurrency('not-a-number')).toBe('$0.00');
    });
  });

  describe('localeFromLanguage', () => {
    it('maps en to en-US', () => {
      expect(localeFromLanguage('en')).toBe('en-US');
    });

    it('maps es to es-MX', () => {
      expect(localeFromLanguage('es')).toBe('es-MX');
    });

    it('falls back to es-MX for unknown languages', () => {
      expect(localeFromLanguage('fr')).toBe('es-MX');
    });
  });
});
