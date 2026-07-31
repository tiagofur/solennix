import type { ProductIngredientWithInventory } from '@/services/productService';

export type IngredientType = 'ingredient' | 'supply' | 'equipment';

/**
 * Group a product's ingredient rows by their `type` field. Returns a stable
 * object keyed by the three known inventory types so callers can replace the
 * repeated `ingredients.filter(i => i.type === X)` pattern with a single
 * lookup. Rows whose type is null/unknown are ignored.
 */
export const groupIngredients = (
  ingredients: ProductIngredientWithInventory[],
): Record<IngredientType, ProductIngredientWithInventory[]> => {
  const groups: Record<IngredientType, ProductIngredientWithInventory[]> = {
    ingredient: [],
    supply: [],
    equipment: [],
  };
  for (const ing of ingredients) {
    if (ing.type && ing.type in groups) {
      groups[ing.type].push(ing);
    }
  }
  return groups;
};
