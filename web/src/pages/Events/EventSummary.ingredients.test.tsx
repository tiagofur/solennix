/**
 * EventSummary — tests de aggregation de ingredientes.
 *
 * Pequeño archivo dedicado (3 tests) para mantenerse muy por debajo del
 * umbral de OOM del worker. La lógica de aggregation es propia del
 * componente, así que no se puede cubrir con tests unitarios aislados
 * del parser.
 *
 * Ver EventSummary.test.tsx (core) para contexto sobre el split.
 */

import { describe, expect, it } from 'vitest';
import { aggregateIngredients } from './lib/aggregateIngredients';

describe('EventSummary — ingredient aggregation', () => {
  it('renders "no ingredients" message when none calculated', async () => {
    const result = aggregateIngredients([], new Map());
    expect(result).toEqual([]);
  });

  it('aggregates ingredients from multiple products with the same inventory_id', async () => {
    const result = aggregateIngredients(
      [
        { product_id: 'p1', inventory_id: 'i1', quantity_required: 0.5, ingredient_name: 'Harina', unit: 'kg', unit_cost: 10, type: 'ingredient' } as any,
        { product_id: 'p2', inventory_id: 'i1', quantity_required: 0.3, ingredient_name: 'Harina', unit: 'kg', unit_cost: 10, type: 'ingredient' } as any,
      ],
      new Map([
        ['p1', 2],
        ['p2', 3],
      ]),
    );

    // (0.5 * 2) + (0.3 * 3) = 1.90
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBeCloseTo(1.9, 5);
  });

  it('uses inventory fallback fields for ingredient data', async () => {
    const result = aggregateIngredients(
      [
        {
          product_id: 'p1',
          inventory_id: 'i1',
          quantity_required: 1,
          ingredient_name: undefined,
          unit: undefined,
          unit_cost: undefined,
          inventory: { ingredient_name: 'Azucar', unit: 'g', unit_cost: 5 },
          type: 'ingredient',
        } as any,
      ],
      new Map([['p1', 1]]),
    );

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Azucar');
    expect(result[0].unit).toBe('g');
  });
});
