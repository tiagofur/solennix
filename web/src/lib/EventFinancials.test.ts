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
});