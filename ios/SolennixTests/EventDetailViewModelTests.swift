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
    ) -> EventDetailViewModel {
        let vm = EventDetailViewModel(apiClient: APIClient())
        vm.event = makeEvent(depositPercent: depositPercent, totalAmount: totalAmount)
        vm.payments = paidAmounts.enumerated().map { idx, amount in makePayment(id: "p\(idx)", amount: amount) }
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

    private func makePayment(id: String, amount: Double) -> Payment {
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
        return try! decoder.decode(Payment.self, from: json)
    }

    // MARK: - payDeposit()

    @MainActor
    func testPayDeposit_prefillsFullBalance_whenNoPaymentsYet() {
        let vm = makeViewModel(depositPercent: 30, totalAmount: 1000)

        vm.payDeposit()

        XCTAssertEqual(vm.paymentAmount, "300.00")
        XCTAssertEqual(vm.paymentNotes, "Anticipo")
        XCTAssertTrue(vm.showPaymentSheet)
    }

    @MainActor
    func testPayDeposit_prefillsRemainingBalance_whenPartialPaymentExists() {
        // deposit = 300, already paid 100 → remaining = 200
        let vm = makeViewModel(depositPercent: 30, totalAmount: 1000, paidAmounts: [100])

        vm.payDeposit()

        XCTAssertEqual(vm.paymentAmount, "200.00")
        XCTAssertEqual(vm.paymentNotes, "Anticipo")
        XCTAssertTrue(vm.showPaymentSheet)
    }

    @MainActor
    func testPayDeposit_isNoOp_whenDepositCovered() {
        // deposit = 300, already paid 300 → balance = 0 → no-op
        let vm = makeViewModel(depositPercent: 30, totalAmount: 1000, paidAmounts: [300])

        vm.payDeposit()

        XCTAssertEqual(vm.paymentAmount, "")
        XCTAssertEqual(vm.paymentNotes, "")
        XCTAssertFalse(vm.showPaymentSheet)
    }

    @MainActor
    func testPayDeposit_isNoOp_whenDepositPercentIsNil() {
        let vm = makeViewModel(depositPercent: nil, totalAmount: 1000)

        vm.payDeposit()

        XCTAssertEqual(vm.paymentAmount, "")
        XCTAssertEqual(vm.paymentNotes, "")
        XCTAssertFalse(vm.showPaymentSheet)
    }

    @MainActor
    func testPayDeposit_isNoOp_whenDepositPercentIsZero() {
        let vm = makeViewModel(depositPercent: 0, totalAmount: 1000)

        vm.payDeposit()

        XCTAssertFalse(vm.showPaymentSheet)
    }

    // MARK: - depositAmount / depositBalance

    @MainActor
    func testDepositAmount_computesFromPercentAndTotal() {
        let vm = makeViewModel(depositPercent: 40, totalAmount: 2500)
        XCTAssertEqual(vm.depositAmount, 1000, accuracy: 0.001)
    }

    @MainActor
    func testDepositAmount_isZero_whenDepositPercentIsNil() {
        let vm = makeViewModel(depositPercent: nil, totalAmount: 2500)
        XCTAssertEqual(vm.depositAmount, 0)
    }

    @MainActor
    func testDepositBalance_subtractsTotalPaid() {
        let vm = makeViewModel(depositPercent: 30, totalAmount: 1000, paidAmounts: [50, 75])
        XCTAssertEqual(vm.depositBalance, 175, accuracy: 0.001)
    }

    @MainActor
    func testDepositBalance_clampedAtZero_whenOverpaid() {
        let vm = makeViewModel(depositPercent: 30, totalAmount: 1000, paidAmounts: [500])
        XCTAssertEqual(vm.depositBalance, 0)
    }
}
