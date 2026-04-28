import { describe, expect, it } from 'vitest';
import { aggregateIngredients } from './aggregateIngredients';

describe('aggregateIngredients', () => {
  it('returns empty array when there are no ingredients', () => {
    const result = aggregateIngredients([], new Map());
    expect(result).toEqual([]);
  });

  it('aggregates quantities from multiple products for same inventory_id', () => {
    const productQuantities = new Map<string, number>([
      ['p1', 2],
      ['p2', 3],
    ]);

    const result = aggregateIngredients(
      [
        { product_id: 'p1', inventory_id: 'i1', quantity_required: 0.5, ingredient_name: 'Harina', unit: 'kg', unit_cost: 10, type: 'ingredient' } as any,
        { product_id: 'p2', inventory_id: 'i1', quantity_required: 0.3, ingredient_name: 'Harina', unit: 'kg', unit_cost: 10, type: 'ingredient' } as any,
      ],
      productQuantities,
    );

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Harina');
    expect(result[0].unit).toBe('kg');
    expect(result[0].quantity).toBeCloseTo(1.9, 5);
    expect(result[0].cost).toBeCloseTo(19, 5);
  });

  it('uses fallback inventory fields when flat fields are missing', () => {
    const result = aggregateIngredients(
      [
        {
          product_id: 'p1',
          inventory_id: 'i1',
          quantity_required: 1,
          ingredient_name: undefined,
          unit: undefined,
          unit_cost: undefined,
          inventory: { ingredient_name: 'Azucar', unit: 'g', unit_cost: 5, current_stock: 99 },
          type: 'ingredient',
        } as any,
      ],
      new Map<string, number>([['p1', 1]]),
    );

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Azucar');
    expect(result[0].unit).toBe('g');
    expect(result[0].currentStock).toBe(99);
    expect(result[0].cost).toBe(5);
  });
});
