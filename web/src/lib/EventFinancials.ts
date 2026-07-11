/**
 * Single source of truth for event financial calculations.
 * Mirrors iOS EventFinancials.swift and backend financial.ComputeEventFinancials.
 */

export type DiscountType = 'percent' | 'fixed';

export interface ProductRow {
  quantity: number;
  unitPrice: number;
  lineDiscount?: number;
  unitCost?: number;
}

export interface ExtraRow {
  price: number;
  cost: number;
  excludeUtility: boolean;
}

export interface SupplyRow {
  quantity: number;
  unitCost: number;
  excludeCost?: boolean;
}

export interface EventFinancialResult {
  productsSubtotal: number;
  normalExtrasSubtotal: number;
  passThroughExtrasSubtotal: number;
  discountableBase: number;
  discountAmount: number;
  afterDiscount: number;
  taxAmount: number;
  total: number;
  productCost: number;
  extrasCost: number;
  suppliesCost: number;
  totalCost: number;
  revenue: number;
  netProfit: number;
  adjustedRevenue: number;
  profitMargin: number;
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Sums ingredient + supply recipe costs for one product. */
export function productUnitCostFromIngredients(
  ingredients: Array<{ type?: string | null; unit_cost?: number | null; quantity_required: number }>,
): number {
  return ingredients
    .filter((ing) => !ing.type || ing.type === 'ingredient' || ing.type === 'supply')
    .reduce((sum, ing) => sum + (ing.unit_cost ?? 0) * ing.quantity_required, 0);
}

export function computeEventFinancials(params: {
  products: ProductRow[];
  extras: ExtraRow[];
  supplies?: SupplyRow[];
  globalDiscountType: DiscountType;
  globalDiscount: number;
  requiresInvoice: boolean;
  taxRate: number;
}): EventFinancialResult {
  const {
    products,
    extras,
    supplies = [],
    globalDiscountType,
    globalDiscount,
    requiresInvoice,
    taxRate,
  } = params;

  const productsSubtotal = products.reduce(
    (sum, p) => sum + (p.unitPrice - (p.lineDiscount ?? 0)) * p.quantity,
    0,
  );

  const normalExtrasSubtotal = extras
    .filter((e) => !e.excludeUtility)
    .reduce((sum, e) => sum + e.price, 0);
  const passThroughExtrasSubtotal = extras
    .filter((e) => e.excludeUtility)
    .reduce((sum, e) => sum + e.price, 0);

  const discountableBase = productsSubtotal + normalExtrasSubtotal;

  let discountAmount: number;
  if (globalDiscountType === 'percent') {
    const clampedPercent = Math.max(0, Math.min(100, globalDiscount));
    discountAmount = discountableBase * (clampedPercent / 100);
  } else {
    discountAmount = Math.min(Math.max(0, globalDiscount), discountableBase);
  }

  const afterDiscount = Math.max(0, discountableBase - discountAmount);
  const baseTotal = afterDiscount + passThroughExtrasSubtotal;
  const taxAmount = requiresInvoice ? baseTotal * (taxRate / 100) : 0;
  const total = baseTotal + taxAmount;

  const productCost = products.reduce(
    (sum, p) => sum + (p.unitCost ?? 0) * p.quantity,
    0,
  );
  const extrasCost = extras.reduce((sum, e) => sum + e.cost, 0);
  const suppliesCost = supplies
    .filter((s) => !s.excludeCost)
    .reduce((sum, s) => sum + s.quantity * s.unitCost, 0);
  const totalCost = productCost + extrasCost + suppliesCost;

  const revenue = total - (requiresInvoice ? taxAmount : 0);
  const netProfit = revenue - totalCost;
  const adjustedRevenue = revenue - passThroughExtrasSubtotal;
  const profitMargin =
    adjustedRevenue > 0 ? (netProfit / adjustedRevenue) * 100 : 0;

  return {
    productsSubtotal: round2(productsSubtotal),
    normalExtrasSubtotal: round2(normalExtrasSubtotal),
    passThroughExtrasSubtotal: round2(passThroughExtrasSubtotal),
    discountableBase: round2(discountableBase),
    discountAmount: round2(discountAmount),
    afterDiscount: round2(afterDiscount),
    taxAmount: round2(taxAmount),
    total: round2(total),
    productCost: round2(productCost),
    extrasCost: round2(extrasCost),
    suppliesCost: round2(suppliesCost),
    totalCost: round2(totalCost),
    revenue: round2(revenue),
    netProfit: round2(netProfit),
    adjustedRevenue: round2(adjustedRevenue),
    profitMargin,
  };
}