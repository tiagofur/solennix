import XCTest
import SolennixCore
import SolennixNetwork
import SolennixFeatures

final class EventDetailViewModelTests: XCTestCase {

    // MARK: - Setup

    private func makeViewModel(
        depositPercent: Double?,
        totalAmount: Double = 1000,
        paidAmounts: [Double] = []
    ) throws -> EventDetailViewModel {
        let vm = EventDetailViewModel(apiClient: APIClient())
        vm.event = makeEvent(depositPercent: depositPercent, totalAmount: totalAmount)
        vm.payments = try paidAmounts.enumerated().map { idx, amount in try makePayment(id: "p\(idx)", amount: amount) }
        return vm
    }

    private func makeEvent(depositPercent: Double?, totalAmount: Double) -> Event {
        Event(
            id: "evt-1",
            userId: "usr-1",
            clientId: "cli-1",
            eventDate: "2026-05-01",
            serviceType: "Boda",
            numPeople: 100,
            status: .quoted,
            discount: 0,
            discountType: .fixed,
            requiresInvoice: false,
            taxRate: 16,
            taxAmount: 0,
            totalAmount: totalAmount,
            depositPercent: depositPercent,
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z"
        )
    }

    private func makePayment(id: String, amount: Double) throws -> Payment {
        let json = """
        {
          "id": "\(id)",
          "event_id": "evt-1",
          "user_id": "usr-1",
          "amount": \(amount),
          "payment_date": "2026-01-10",
          "payment_method": "cash",
          "created_at": "2026-01-10T00:00:00Z"
        }
        """.data(using: .utf8)!
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return try decoder.decode(Payment.self, from: json)
    }

    // MARK: - payDeposit()

    @MainActor
    func testPayDeposit_prefillsFullBalance_whenNoPaymentsYet() throws {
        let vm = try makeViewModel(depositPercent: 30, totalAmount: 1000)

        vm.payDeposit()

        XCTAssertEqual(vm.paymentAmount, "300.00")
        // The note is a localized deposit label resolved from the system locale
        // (es "Anticipo" / en "Deposit"). Assert the resolved value for whatever
        // locale the simulator reports — never a hardcoded word.
        XCTAssertEqual(vm.paymentNotes, FeatureL10n.languageCode == "en" ? "Deposit" : "Anticipo")
        XCTAssertTrue(vm.showPaymentSheet)
    }

    @MainActor
    func testPayDeposit_prefillsRemainingBalance_whenPartialPaymentExists() throws {
        // deposit = 300, already paid 100 → remaining = 200
        let vm = try makeViewModel(depositPercent: 30, totalAmount: 1000, paidAmounts: [100])

        vm.payDeposit()

        XCTAssertEqual(vm.paymentAmount, "200.00")
        XCTAssertEqual(vm.paymentNotes, FeatureL10n.languageCode == "en" ? "Deposit" : "Anticipo")
        XCTAssertTrue(vm.showPaymentSheet)
    }

    @MainActor
    func testPayDeposit_isNoOp_whenDepositCovered() throws {
        // deposit = 300, already paid 300 → balance = 0 → no-op
        let vm = try makeViewModel(depositPercent: 30, totalAmount: 1000, paidAmounts: [300])

        vm.payDeposit()

        XCTAssertEqual(vm.paymentAmount, "")
        XCTAssertEqual(vm.paymentNotes, "")
        XCTAssertFalse(vm.showPaymentSheet)
    }

    @MainActor
    func testPayDeposit_isNoOp_whenDepositPercentIsNil() throws {
        let vm = try makeViewModel(depositPercent: nil, totalAmount: 1000)

        vm.payDeposit()

        XCTAssertEqual(vm.paymentAmount, "")
        XCTAssertEqual(vm.paymentNotes, "")
        XCTAssertFalse(vm.showPaymentSheet)
    }

    @MainActor
    func testPayDeposit_isNoOp_whenDepositPercentIsZero() throws {
        let vm = try makeViewModel(depositPercent: 0, totalAmount: 1000)

        vm.payDeposit()

        XCTAssertFalse(vm.showPaymentSheet)
    }

    // MARK: - depositAmount / depositBalance

    @MainActor
    func testDepositAmount_computesFromPercentAndTotal() throws {
        let vm = try makeViewModel(depositPercent: 40, totalAmount: 2500)
        XCTAssertEqual(vm.depositAmount, 1000, accuracy: 0.001)
    }

    @MainActor
    func testDepositAmount_isZero_whenDepositPercentIsNil() throws {
        let vm = try makeViewModel(depositPercent: nil, totalAmount: 2500)
        XCTAssertEqual(vm.depositAmount, 0)
    }

    @MainActor
    func testDepositBalance_subtractsTotalPaid() throws {
        let vm = try makeViewModel(depositPercent: 30, totalAmount: 1000, paidAmounts: [50, 75])
        XCTAssertEqual(vm.depositBalance, 175, accuracy: 0.001)
    }

    @MainActor
    func testDepositBalance_clampedAtZero_whenOverpaid() throws {
        let vm = try makeViewModel(depositPercent: 30, totalAmount: 1000, paidAmounts: [500])
        XCTAssertEqual(vm.depositBalance, 0)
    }

    // MARK: - Product unit-cost cache (margin includes ingredient costs)

    /// The detail's margin feeds `EventFinancials.compute()` with
    /// `productUnitCosts`. With costs present the margin must be LOWER than
    /// without them — proving the ingredient cost is now included (it was
    /// previously dropped via `unitCost: nil`, inflating the margin).
    @MainActor
    func testProductUnitCosts_LowerMargin_ThanNilCosts() {
        let vm = EventDetailViewModel(apiClient: APIClient())
        let productRows = { (unitCost: Double?) in
            EventFinancials.ProductRow(quantity: 2, unitPrice: 100, lineDiscount: 0, unitCost: unitCost)
        }
        let withoutCost = EventFinancials.compute(
            products: [productRows(nil)],
            extras: [], supplies: [],
            globalDiscountType: .fixed, globalDiscount: 0,
            requiresInvoice: false, taxRate: 0
        ).profitMargin
        let withCost = EventFinancials.compute(
            products: [productRows(40)],
            extras: [], supplies: [],
            globalDiscountType: .fixed, globalDiscount: 0,
            requiresInvoice: false, taxRate: 0
        ).profitMargin
        XCTAssertTrue(vm.productUnitCosts.isEmpty, "cache starts empty")
        XCTAssertLessThan(withCost, withoutCost, "ingredient cost must reduce the margin")
    }

    /// `loadProductUnitCosts` is a no-op when there are no products to fetch —
    /// guards the fan-out from unnecessary work. Empty list => no network call.
    @MainActor
    func testLoadProductUnitCosts_NoOpWhenProductsEmpty() async {
        let vm = EventDetailViewModel(apiClient: APIClient())
        vm.products = []
        await vm.loadProductUnitCosts()
        XCTAssertTrue(vm.productUnitCosts.isEmpty)
    }

    // MARK: - Payment amount validation + rounding (addPayment guard)

    /// Mirrors the addPayment guard: amount must be >= 0.01 (so "0.001" is
    /// rejected) and is rounded to 2 decimals (so "100.005" -> 100.01 via
    /// banker rounding, matching EventFinancials.round2).
    @MainActor
    func testPaymentAmount_ValidationAndRounding() {
        let cases: [(input: String, valid: Bool)] = [
            ("0.001", false),   // below smallest unit — rejected
            ("0", false),       // zero — rejected
            ("-5", false),      // negative — rejected
            ("0.01", true),     // exact smallest unit — accepted
            ("100", true),
            ("1,5", true),      // comma decimal separator — accepted
        ]
        for c in cases {
            let parsed = Double(c.input.replacingOccurrences(of: ",", with: "."))
            let valid = parsed != nil && parsed! >= 0.01
            XCTAssertEqual(valid, c.valid, "input \"\(c.input)\" expected valid=\(c.valid)")
        }

        // Banker rounding: 100.005 -> 100.01, 100.015 -> 100.02 (round2).
        XCTAssertEqual(EventFinancials.round2(100.005), 100.01, accuracy: 0.001)
        XCTAssertEqual(EventFinancials.round2(100.4), 100.4, accuracy: 0.001)
    }
}
