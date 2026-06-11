import Foundation

// MARK: - EventFinancials
//
// Single source of truth for all event financial calculations.
// Mirrors backend `ComputeFinancialSummaryFromItems` in
// `backend/internal/pdf/financial.go` exactly. Any intentional divergence
// must be documented inline with a // DIVERGENCE: comment.
//
// Rules (match backend Go semantics):
//   1. Products and normal extras (excludeUtility=false) form the discountable base.
//   2. Pass-through extras (excludeUtility=true) are charged to the client but
//      never discounted — they are excluded from the margin denominator too.
//   3. Percent discount clamps to [0, 100]; fixed discount clamps to [0, discountableBase].
//   4. Tax applies to (discountedBase + passThroughExtras) when requiresInvoice.
//   5. All output amounts are rounded to 2 decimal places (cent precision) to
//      prevent IEEE-754 drift from triggering backend ±0.01 validation.
//   6. Margin denominator = adjustedRevenue = revenue − passThroughExtrasSubtotal.
//      Guard: if adjustedRevenue ≤ 0, margin = 0.
//   7. Ingredient cost filter: type == .ingredient || type == .supply (matches
//      EventFormViewModel+Profitability.swift:60-63 and backend cost aggregation).

public enum EventFinancials {

    // MARK: - Input Types

    /// Lightweight product row — matches EventProduct / SelectedProduct fields.
    public struct ProductRow {
        public let quantity: Double
        public let unitPrice: Double
        /// Per-line discount (not the global event discount). Same semantics as
        /// `EventProduct.discount` and backend `product.Discount`.
        public let lineDiscount: Double
        /// Unit cost computed from ingredient/supply rows. Nil = not yet fetched.
        public let unitCost: Double?

        public init(quantity: Double, unitPrice: Double, lineDiscount: Double = 0, unitCost: Double? = nil) {
            self.quantity = quantity
            self.unitPrice = unitPrice
            self.lineDiscount = lineDiscount
            self.unitCost = unitCost
        }
    }

    /// Lightweight extra row — matches EventExtra / SelectedExtra fields.
    public struct ExtraRow {
        public let price: Double
        public let cost: Double
        public let excludeUtility: Bool

        public init(price: Double, cost: Double, excludeUtility: Bool) {
            self.price = price
            self.cost = cost
            self.excludeUtility = excludeUtility
        }
    }

    /// Supplies cost (from SelectedSupplyItem or EventSupply).
    public struct SupplyRow {
        public let quantity: Double
        public let unitCost: Double
        public let excludeCost: Bool

        public init(quantity: Double, unitCost: Double, excludeCost: Bool = false) {
            self.quantity = quantity
            self.unitCost = unitCost
            self.excludeCost = excludeCost
        }
    }

    // MARK: - Output

    public struct Result {
        // Revenue
        public let productsSubtotal: Double
        public let normalExtrasSubtotal: Double
        public let passThroughExtrasSubtotal: Double
        public let discountableBase: Double
        public let discountAmount: Double
        public let afterDiscount: Double
        public let taxAmount: Double
        public let total: Double

        // Costs
        public let productCost: Double
        public let extrasCost: Double
        public let suppliesCost: Double
        public let totalCost: Double

        // Profitability
        public let revenue: Double          // total − tax (when invoice)
        public let netProfit: Double        // revenue − totalCost
        public let adjustedRevenue: Double  // revenue − passThroughExtrasSubtotal
        public let profitMargin: Double     // (netProfit / adjustedRevenue) × 100, or 0 when ≤ 0
    }

    // MARK: - Core Calculation

    /// Computes the full financial summary.
    ///
    /// - Parameters:
    ///   - products: Product rows (line price = (unitPrice − lineDiscount) × quantity).
    ///   - extras: Extra rows (price charged to client; cost is internal).
    ///   - supplies: Supply rows contributing to internal cost.
    ///   - globalDiscountType: `.percent` or `.fixed`.
    ///   - globalDiscount: Raw discount value entered by the user. Clamped internally.
    ///   - requiresInvoice: Whether IVA applies.
    ///   - taxRate: Tax percentage (e.g. 16 → 16%).
    /// - Returns: A `Result` with all amounts rounded to 2 decimal places.
    public static func compute(
        products: [ProductRow],
        extras: [ExtraRow],
        supplies: [SupplyRow] = [],
        globalDiscountType: DiscountType,
        globalDiscount: Double,
        requiresInvoice: Bool,
        taxRate: Double
    ) -> Result {
        // --- Revenue side ---

        let productsSubtotal = products.reduce(0.0) { sum, p in
            sum + (p.unitPrice - p.lineDiscount) * p.quantity
        }

        let normalExtrasSubtotal = extras.filter { !$0.excludeUtility }.reduce(0.0) { $0 + $1.price }
        let passThroughExtrasSubtotal = extras.filter { $0.excludeUtility }.reduce(0.0) { $0 + $1.price }

        let discountableBase = productsSubtotal + normalExtrasSubtotal

        // Clamp discount: percent ∈ [0, 100]; fixed ∈ [0, discountableBase].
        // Mirrors backend financial.go lines 84-89.
        let discountAmount: Double
        switch globalDiscountType {
        case .percent:
            let clampedPercent = max(0, min(100, globalDiscount))
            discountAmount = discountableBase * clampedPercent / 100
        case .fixed:
            discountAmount = min(max(0, globalDiscount), discountableBase)
        }

        let afterDiscount = max(0, discountableBase - discountAmount)
        let baseTotal = afterDiscount + passThroughExtrasSubtotal
        let taxAmount = requiresInvoice ? baseTotal * (taxRate / 100) : 0
        let total = baseTotal + taxAmount

        // --- Cost side ---

        // Product ingredient+supply costs (same filter as EventFormViewModel+Profitability:60-63).
        // DIVERGENCE: backend PDF only tracks customer-facing totals, not internal costs.
        // Cost computation is iOS-only and matches EventFormViewModel+Profitability exactly.
        let productCost = products.reduce(0.0) { sum, p in
            sum + (p.unitCost ?? 0) * p.quantity
        }

        let extrasCost = extras.reduce(0.0) { $0 + $1.cost }

        let suppliesCost = supplies.filter { !$0.excludeCost }.reduce(0.0) { sum, s in
            sum + s.quantity * s.unitCost
        }

        let totalCost = productCost + extrasCost + suppliesCost

        // --- Profitability ---

        // Revenue strips tax when invoice is required (tax is pass-through to SAT).
        let revenue = total - (requiresInvoice ? taxAmount : 0)
        let netProfit = revenue - totalCost

        // Margin denominator excludes pass-through extras — the event org doesn't
        // "earn" margin on amounts that flow directly to third parties.
        // Mirrors EventFormViewModel+Profitability.swift:36-38.
        let adjustedRevenue = revenue - passThroughExtrasSubtotal
        let profitMargin = adjustedRevenue > 0 ? (netProfit / adjustedRevenue) * 100 : 0

        // --- Round to 2 decimal places (cent precision) ---
        // Prevents IEEE-754 drift. Backend rejects |client − server| > 0.01.
        return Result(
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
            profitMargin: (netProfit / max(adjustedRevenue, 1e-9) * 100).isFinite ? profitMargin : 0
        )
    }

    // MARK: - Helpers

    /// Rounds a Double to 2 decimal places using banker-rounding semantics
    /// consistent with the backend's `math.Round(x*100)/100` pattern.
    public static func round2(_ value: Double) -> Double {
        (value * 100).rounded() / 100
    }
}
