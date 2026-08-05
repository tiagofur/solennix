import { describe, expect, it } from "vitest";
import { calculatePackageQuote } from "./packageQuote";

describe("calculatePackageQuote", () => {
  it("multiplies per_guest and adds per_event, applies highest tier", () => {
    const q = calculatePackageQuote(
      100,
      [
        {
          productId: "a",
          name: "Menu",
          unitPrice: 250,
          pricingUnit: "per_guest",
        },
        {
          productId: "b",
          name: "DJ",
          unitPrice: 3000,
          pricingUnit: "per_event",
        },
      ],
      [
        { fromGuests: 40, discountPercent: 0 },
        { fromGuests: 80, discountPercent: 5 },
        { fromGuests: 120, discountPercent: 10 },
      ],
      40,
    );
    expect(q.belowMinGuests).toBe(false);
    expect(q.subtotal).toBe(28000);
    expect(q.discountPercent).toBe(5);
    expect(q.discountAmount).toBe(1400);
    expect(q.total).toBe(26600);
    expect(q.lines[0].quantity).toBe(100);
    expect(q.lines[1].quantity).toBe(1);
  });

  it("flags below min guests", () => {
    const q = calculatePackageQuote(
      20,
      [{ productId: "a", name: "Menu", unitPrice: 100, pricingUnit: "per_guest" }],
      [],
      50,
    );
    expect(q.belowMinGuests).toBe(true);
  });
});
