import type { ProductIngredient } from "@/types/entities";

type ProductIngredientWithInventory = ProductIngredient & {
  inventory?: {
    ingredient_name?: string;
    unit?: string;
    unit_cost?: number;
    current_stock?: number;
  } | null;
};

export interface IngredientWithStock {
  name: string;
  quantity: number;
  unit: string;
  cost?: number;
  currentStock?: number;
  inventory_id?: string;
}

export const aggregateIngredients = (
  allProdIngredients: ProductIngredientWithInventory[],
  productQuantities: Map<string, number>,
): IngredientWithStock[] => {
  const aggregated: Record<string, IngredientWithStock> = {};

  allProdIngredients
    .filter((ing) => ing.type === "ingredient")
    .forEach((ing) => {
      const ingredientName = ing.ingredient_name ?? ing.inventory?.ingredient_name ?? "";
      const unit = ing.unit ?? ing.inventory?.unit ?? "";
      const unitCost = ing.unit_cost ?? ing.inventory?.unit_cost ?? 0;
      const currentStock = ing.inventory?.current_stock ?? 0;
      const quantity = productQuantities.get(ing.product_id) || 0;
      const key = ing.inventory_id || `${ingredientName}-${unit}`;

      if (!aggregated[key]) {
        aggregated[key] = {
          name: ingredientName,
          unit,
          quantity: 0,
          cost: 0,
          currentStock,
          inventory_id: ing.inventory_id,
        };
      }

      aggregated[key].quantity += (ing.quantity_required || 0) * quantity;
      aggregated[key].cost = (aggregated[key].cost || 0) + ((ing.quantity_required || 0) * quantity * unitCost);
    });

  return Object.values(aggregated);
};
