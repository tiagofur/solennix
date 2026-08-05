/**
 * Client-side package quote math (mirrors backend services.CalculatePackageQuote).
 * Browse = live; freeze only happens server-side on request submit.
 */

export type PricingUnit = "per_guest" | "per_event";

export type PackageQuoteLineInput = {
  productId: string;
  name: string;
  unitPrice: number;
  pricingUnit: PricingUnit;
};

export type PackageDiscountTierInput = {
  fromGuests: number;
  discountPercent: number;
};

export type PackageQuoteLine = {
  productId: string;
  name: string;
  unitPrice: number;
  pricingUnit: PricingUnit;
  quantity: number;
  lineTotal: number;
};

export type PackageQuote = {
  guestCount: number;
  lines: PackageQuoteLine[];
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  appliedFromGuests: number | null;
  belowMinGuests: boolean;
};

const roundMoney = (v: number) => Math.round(v * 100) / 100;

export function calculatePackageQuote(
  guests: number,
  lines: PackageQuoteLineInput[],
  tiers: PackageDiscountTierInput[],
  minGuests?: number | null,
): PackageQuote {
  const guestCount = Math.max(1, Math.floor(guests) || 1);
  const belowMin =
    minGuests != null && minGuests > 0 && guestCount < minGuests;

  const outLines: PackageQuoteLine[] = lines.map((ln) => {
    const unit: PricingUnit =
      ln.pricingUnit === "per_guest" ? "per_guest" : "per_event";
    const quantity = unit === "per_guest" ? guestCount : 1;
    const lineTotal = roundMoney(ln.unitPrice * quantity);
    return {
      productId: ln.productId,
      name: ln.name,
      unitPrice: roundMoney(ln.unitPrice),
      pricingUnit: unit,
      quantity,
      lineTotal,
    };
  });

  const subtotal = roundMoney(outLines.reduce((s, l) => s + l.lineTotal, 0));
  const sorted = [...tiers].sort((a, b) => b.fromGuests - a.fromGuests);
  let discountPercent = 0;
  let appliedFromGuests: number | null = null;
  for (const t of sorted) {
    if (t.fromGuests <= guestCount) {
      discountPercent = Math.min(100, Math.max(0, t.discountPercent));
      appliedFromGuests = t.fromGuests;
      break;
    }
  }
  const discountAmount = roundMoney((subtotal * discountPercent) / 100);
  const total = roundMoney(Math.max(0, subtotal - discountAmount));

  return {
    guestCount,
    lines: outLines,
    subtotal,
    discountPercent,
    discountAmount,
    total,
    appliedFromGuests,
    belowMinGuests: belowMin,
  };
}
