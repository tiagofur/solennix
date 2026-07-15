import { describe, expect, it } from 'vitest';
import {
  computeEventFinancials,
  productUnitCostFromIngredients,
  round2,
} from './EventFinancials';

describe('EventFinancials', () => {
  it('excludes pass-through extras from margin denominator', () => {
    const result = computeEventFinancials({
      products: [{ quantity: 1, unitPrice: 1000, unitCost: 300 }],
      extras: [
        { price: 500, cost: 100, excludeUtility: false },
        { price: 200, cost: 0, excludeUtility: true },
      ],
      globalDiscountType: 'percent',
      globalDiscount: 0,
      requiresInvoice: false,
      taxRate: 16,
    });

    expect(result.discountableBase).toBe(1500);
    expect(result.passThroughExtrasSubtotal).toBe(200);
    expect(result.total).toBe(1700);
    expect(result.adjustedRevenue).toBe(1500);
    expect(result.totalCost).toBe(400);
    expect(result.profitMargin).toBeCloseTo((1300 / 1500) * 100, 2);
  });

  it('counts ingredient and supply costs', () => {
    const unitCost = productUnitCostFromIngredients([
      { type: 'ingredient', unit_cost: 10, quantity_required: 5 },
      { type: 'supply', unit_cost: 3, quantity_required: 2 },
      { type: 'equipment', unit_cost: 100, quantity_required: 1 },
    ]);
    expect(unitCost).toBe(56);

    const result = computeEventFinancials({
      products: [{ quantity: 2, unitPrice: 500, unitCost: 150 }],
      extras: [{ price: 200, cost: 50, excludeUtility: false }],
      supplies: [{ quantity: 3, unitCost: 20 }],
      globalDiscountType: 'fixed',
      globalDiscount: 0,
      requiresInvoice: false,
      taxRate: 16,
    });

    expect(result.productCost).toBe(300);
    expect(result.extrasCost).toBe(50);
    expect(result.suppliesCost).toBe(60);
    expect(result.totalCost).toBe(410);
  });

  it('ignores supplies with excludeCost', () => {
    const result = computeEventFinancials({
      products: [],
      extras: [],
      supplies: [
        { quantity: 5, unitCost: 100, excludeCost: false },
        { quantity: 5, unitCost: 100, excludeCost: true },
      ],
      globalDiscountType: 'fixed',
      globalDiscount: 0,
      requiresInvoice: false,
      taxRate: 16,
    });
    expect(result.suppliesCost).toBe(500);
  });

  it('clamps percent discount above 100', () => {
    const result = computeEventFinancials({
      products: [{ quantity: 1, unitPrice: 1000 }],
      extras: [],
      globalDiscountType: 'percent',
      globalDiscount: 150,
      requiresInvoice: false,
      taxRate: 16,
    });
    expect(result.discountAmount).toBe(1000);
    expect(result.total).toBe(0);
  });

  it('rounds to cent precision', () => {
    expect(round2(100.005)).toBe(100.01);
    expect(round2(100.4)).toBe(100.4);
  });

  // ── Parity tests: mirror iOS EventFinancialsTests + backend financial_test.go (#878) ──

  describe('tax / invoice combinations', () => {
    it('applies no tax when invoice not required', () => {
      const result = computeEventFinancials({
        products: [{ quantity: 1, unitPrice: 1000 }],
        extras: [],
        globalDiscountType: 'percent',
        globalDiscount: 0,
        requiresInvoice: false,
        taxRate: 16,
      });
      expect(result.taxAmount).toBe(0);
      expect(result.total).toBe(1000);
    });

    it('applies tax when invoice required', () => {
      const result = computeEventFinancials({
        products: [{ quantity: 1, unitPrice: 1000 }],
        extras: [],
        globalDiscountType: 'percent',
        globalDiscount: 0,
        requiresInvoice: true,
        taxRate: 16,
      });
      expect(result.taxAmount).toBe(160);
      expect(result.total).toBe(1160);
    });

    it('does not count tax as revenue when invoiced', () => {
      const result = computeEventFinancials({
        products: [{ quantity: 1, unitPrice: 1000, unitCost: 0 }],
        extras: [],
        globalDiscountType: 'percent',
        globalDiscount: 0,
        requiresInvoice: true,
        taxRate: 16,
      });
      expect(result.taxAmount).toBe(160);
      expect(result.revenue).toBe(1000);
    });

    it('applies discount before tax', () => {
      const result = computeEventFinancials({
        products: [{ quantity: 1, unitPrice: 1000 }],
        extras: [],
        globalDiscountType: 'percent',
        globalDiscount: 10,
        requiresInvoice: true,
        taxRate: 16,
      });
      expect(result.discountAmount).toBe(100);
      expect(result.taxAmount).toBe(144);
      expect(result.total).toBe(1044);
    });
  });

  describe('discount edge cases', () => {
    it('clamps negative percent discount to zero', () => {
      const result = computeEventFinancials({
        products: [{ quantity: 1, unitPrice: 1000 }],
        extras: [],
        globalDiscountType: 'percent',
        globalDiscount: -10,
        requiresInvoice: false,
        taxRate: 16,
      });
      expect(result.discountAmount).toBe(0);
      expect(result.total).toBe(1000);
    });

    it('clamps fixed discount above base to base', () => {
      const result = computeEventFinancials({
        products: [{ quantity: 1, unitPrice: 500 }],
        extras: [],
        globalDiscountType: 'fixed',
        globalDiscount: 9999,
        requiresInvoice: false,
        taxRate: 16,
      });
      expect(result.discountAmount).toBe(500);
      expect(result.total).toBe(0);
    });
  });

  describe('zero and negative revenue', () => {
    it('returns all zeros for empty inputs', () => {
      const result = computeEventFinancials({
        products: [],
        extras: [],
        globalDiscountType: 'percent',
        globalDiscount: 0,
        requiresInvoice: false,
        taxRate: 16,
      });
      expect(result.total).toBe(0);
      expect(result.profitMargin).toBe(0);
      expect(result.netProfit).toBe(0);
    });

    it('yields zero margin when adjusted revenue is zero (pass-through only)', () => {
      const result = computeEventFinancials({
        products: [],
        extras: [{ price: 100, cost: 0, excludeUtility: true }],
        globalDiscountType: 'percent',
        globalDiscount: 0,
        requiresInvoice: false,
        taxRate: 16,
      });
      expect(result.adjustedRevenue).toBe(0);
      expect(result.profitMargin).toBe(0);
    });
  });

  describe('pass-through with discount', () => {
    it('does not discount pass-through extras', () => {
      const result = computeEventFinancials({
        products: [{ quantity: 1, unitPrice: 800 }],
        extras: [{ price: 200, cost: 0, excludeUtility: true }],
        globalDiscountType: 'percent',
        globalDiscount: 50,
        requiresInvoice: false,
        taxRate: 16,
      });
      expect(result.discountAmount).toBe(400);
      expect(result.passThroughExtrasSubtotal).toBe(200);
      expect(result.total).toBe(600);
    });
  });

  describe('full margin chain', () => {
    it('computes revenue, netProfit, and margin consistently', () => {
      const result = computeEventFinancials({
        products: [{ quantity: 1, unitPrice: 1000, unitCost: 300 }],
        extras: [
          { price: 500, cost: 100, excludeUtility: false },
          { price: 200, cost: 0, excludeUtility: true },
        ],
        globalDiscountType: 'percent',
        globalDiscount: 0,
        requiresInvoice: false,
        taxRate: 16,
      });
      expect(result.revenue).toBe(1700);
      expect(result.netProfit).toBe(1300);
      expect(result.adjustedRevenue).toBe(1500);
      expect(result.profitMargin).toBeCloseTo((1300 / 1500) * 100, 2);
    });
  });

  describe('line-level product discounts', () => {
    it('subtracts lineDiscount from unit price before multiplying quantity', () => {
      const result = computeEventFinancials({
        products: [{ quantity: 2, unitPrice: 100, lineDiscount: 10 }],
        extras: [],
        globalDiscountType: 'percent',
        globalDiscount: 0,
        requiresInvoice: false,
        taxRate: 16,
      });
      expect(result.productsSubtotal).toBe(180);
      expect(result.total).toBe(180);
    });
  });

  describe('cent rounding through compute pipeline', () => {
    it('prevents float drift on repeating decimals', () => {
      const result = computeEventFinancials({
        products: [{ quantity: 3, unitPrice: 1 / 3 }],
        extras: [],
        globalDiscountType: 'percent',
        globalDiscount: 0,
        requiresInvoice: false,
        taxRate: 0,
      });
      expect(result.total).toBe(round2((1.0 / 3.0) * 3));
    });
  });
});