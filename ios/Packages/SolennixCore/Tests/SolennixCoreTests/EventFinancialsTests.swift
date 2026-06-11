import XCTest
@testable import SolennixCore

// MARK: - EventFinancials Unit Tests
//
// Mirrors backend financial_test.go cases to ensure iOS ↔ Go parity.
// Backend tolerance: |client − server| ≤ 0.01 per amount.

final class EventFinancialsTests: XCTestCase {

    // MARK: - Helpers

    private typealias P = EventFinancials.ProductRow
    private typealias E = EventFinancials.ExtraRow
    private typealias S = EventFinancials.SupplyRow

    private func calc(
        products: [P] = [],
        extras: [E] = [],
        supplies: [S] = [],
        discountType: DiscountType = .percent,
        discount: Double = 0,
        invoice: Bool = false,
        taxRate: Double = 16
    ) -> EventFinancials.Result {
        EventFinancials.compute(
            products: products,
            extras: extras,
            supplies: supplies,
            globalDiscountType: discountType,
            globalDiscount: discount,
            requiresInvoice: invoice,
            taxRate: taxRate
        )
    }

    // MARK: - 1. Pass-through extras excluded from margin denominator

    func testPassThroughExtrasExcludedFromMarginDenominator() {
        // Normal extra: $500 price, $100 cost
        // Pass-through: $200 price (excludeUtility=true) — not discounted, not in margin base
        let result = calc(
            products: [P(quantity: 1, unitPrice: 1000, lineDiscount: 0, unitCost: 300)],
            extras: [
                E(price: 500, cost: 100, excludeUtility: false),
                E(price: 200, cost: 0, excludeUtility: true)
            ]
        )

        // discountableBase = 1000 + 500 = 1500
        XCTAssertEqual(result.discountableBase, 1500, accuracy: 0.01)
        // passThroughExtrasSubtotal = 200
        XCTAssertEqual(result.passThroughExtrasSubtotal, 200, accuracy: 0.01)
        // total = 1500 + 200 = 1700 (no discount, no tax)
        XCTAssertEqual(result.total, 1700, accuracy: 0.01)
        // revenue = 1700 (no invoice)
        XCTAssertEqual(result.revenue, 1700, accuracy: 0.01)
        // adjustedRevenue = 1700 - 200 = 1500
        XCTAssertEqual(result.adjustedRevenue, 1500, accuracy: 0.01)
        // totalCost = 300 + 100 = 400
        XCTAssertEqual(result.totalCost, 400, accuracy: 0.01)
        // netProfit = 1700 - 400 = 1300
        XCTAssertEqual(result.netProfit, 1300, accuracy: 0.01)
        // margin = 1300 / 1500 * 100 ≈ 86.67%
        XCTAssertEqual(result.profitMargin, 1300.0 / 1500.0 * 100, accuracy: 0.01)
    }

    // MARK: - 2. Ingredient + supply costs both counted

    func testIngredientAndSupplyCostsBothCounted() {
        let result = calc(
            products: [P(quantity: 2, unitPrice: 500, lineDiscount: 0, unitCost: 150)], // product cost = 300
            extras: [E(price: 200, cost: 50, excludeUtility: false)],                   // extras cost = 50
            supplies: [S(quantity: 3, unitCost: 20, excludeCost: false)]                // supply cost = 60
        )

        XCTAssertEqual(result.productCost, 300, accuracy: 0.01)
        XCTAssertEqual(result.extrasCost, 50, accuracy: 0.01)
        XCTAssertEqual(result.suppliesCost, 60, accuracy: 0.01)
        XCTAssertEqual(result.totalCost, 410, accuracy: 0.01)
    }

    func testExcludeCostSupplyIgnored() {
        let result = calc(
            supplies: [
                S(quantity: 5, unitCost: 100, excludeCost: false),
                S(quantity: 5, unitCost: 100, excludeCost: true) // should not contribute
            ]
        )
        XCTAssertEqual(result.suppliesCost, 500, accuracy: 0.01)
    }

    // MARK: - 3. Tax handling with invoice

    func testTaxOnlyWhenInvoiceRequired() {
        let base = 1000.0
        let resultNoTax = calc(
            products: [P(quantity: 1, unitPrice: 1000)],
            invoice: false,
            taxRate: 16
        )
        XCTAssertEqual(resultNoTax.taxAmount, 0, accuracy: 0.01)
        XCTAssertEqual(resultNoTax.total, base, accuracy: 0.01)

        let resultWithTax = calc(
            products: [P(quantity: 1, unitPrice: 1000)],
            invoice: true,
            taxRate: 16
        )
        XCTAssertEqual(resultWithTax.taxAmount, 160, accuracy: 0.01)
        XCTAssertEqual(resultWithTax.total, 1160, accuracy: 0.01)
    }

    func testTaxDoesNotCountAsRevenueWhenInvoiced() {
        let result = calc(
            products: [P(quantity: 1, unitPrice: 1000, unitCost: 0)],
            invoice: true,
            taxRate: 16
        )
        // total = 1160; revenue should strip the 160 tax
        XCTAssertEqual(result.taxAmount, 160, accuracy: 0.01)
        XCTAssertEqual(result.revenue, 1000, accuracy: 0.01)
    }

    // MARK: - 4. Percent discount clamp to [0, 100]

    func testPercentDiscountOver100ClampsTo100() {
        // discount=150% on base 1000 should NOT produce negative total
        let result = calc(
            products: [P(quantity: 1, unitPrice: 1000)],
            discountType: .percent,
            discount: 150
        )
        // Clamped to 100% → discountAmount = 1000, total = 0
        XCTAssertEqual(result.discountAmount, 1000, accuracy: 0.01)
        XCTAssertEqual(result.total, 0, accuracy: 0.01)
        XCTAssertFalse(result.total < 0, "Total must never be negative")
    }

    func testPercentDiscountNegativeClampsToZero() {
        let result = calc(
            products: [P(quantity: 1, unitPrice: 1000)],
            discountType: .percent,
            discount: -10
        )
        XCTAssertEqual(result.discountAmount, 0, accuracy: 0.01)
        XCTAssertEqual(result.total, 1000, accuracy: 0.01)
    }

    func testFixedDiscountOverBaseClampsToBase() {
        let result = calc(
            products: [P(quantity: 1, unitPrice: 500)],
            discountType: .fixed,
            discount: 9999
        )
        // Fixed discount clamped to discountableBase = 500
        XCTAssertEqual(result.discountAmount, 500, accuracy: 0.01)
        XCTAssertEqual(result.total, 0, accuracy: 0.01)
        XCTAssertFalse(result.total < 0, "Total must never be negative")
    }

    // MARK: - 5. Zero / negative guards

    func testZeroProductsZeroResult() {
        let result = calc()
        XCTAssertEqual(result.total, 0, accuracy: 0.01)
        XCTAssertEqual(result.profitMargin, 0, accuracy: 0.01)
        XCTAssertEqual(result.netProfit, 0, accuracy: 0.01)
    }

    func testNegativeAdjustedRevenueYieldsZeroMargin() {
        // Pass-through larger than revenue → adjustedRevenue < 0
        let result = calc(
            extras: [
                E(price: 100, cost: 0, excludeUtility: true) // pass-through = 100
            ]
        )
        // revenue = 100 (no invoice), adjustedRevenue = 100 - 100 = 0 → margin = 0
        XCTAssertEqual(result.profitMargin, 0, accuracy: 0.01)
    }

    // MARK: - 6. Cent rounding

    func testCentRounding() {
        // 1 / 3 at qty 3 should round cleanly to avoid drift
        let result = calc(
            products: [P(quantity: 3, unitPrice: 1.0 / 3.0)]
        )
        // (1/3) * 3 = 1.0 (but raw IEEE-754 might drift). round2 fixes it.
        let raw = (1.0 / 3.0) * 3
        XCTAssertEqual(result.total, EventFinancials.round2(raw), accuracy: 0.001)
    }

    // MARK: - 7. Discount-then-tax order (mirrors backend)

    func testDiscountAppliedBeforeTax() {
        // base = 1000, 10% discount → 900, tax 16% on 900 = 144, total = 1044
        let result = calc(
            products: [P(quantity: 1, unitPrice: 1000)],
            discountType: .percent,
            discount: 10,
            invoice: true,
            taxRate: 16
        )
        XCTAssertEqual(result.discountAmount, 100, accuracy: 0.01)
        XCTAssertEqual(result.taxAmount, 144, accuracy: 0.01)
        XCTAssertEqual(result.total, 1044, accuracy: 0.01)
    }

    // MARK: - 8. Pass-through extras not discounted (mirrors backend lines 91-96)

    func testPassThroughNotDiscounted() {
        // products = 800, pass-through extra = 200
        // 50% discount applies only to 800 → discountAmount = 400
        // afterDiscount = 400, baseTotal = 400 + 200 = 600
        let result = calc(
            products: [P(quantity: 1, unitPrice: 800)],
            extras: [E(price: 200, cost: 0, excludeUtility: true)],
            discountType: .percent,
            discount: 50
        )
        XCTAssertEqual(result.discountAmount, 400, accuracy: 0.01)
        XCTAssertEqual(result.total, 600, accuracy: 0.01)
        XCTAssertEqual(result.passThroughExtrasSubtotal, 200, accuracy: 0.01)
    }
}
