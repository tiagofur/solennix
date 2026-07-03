import XCTest
import Foundation
import SolennixCore
import SolennixNetwork
@testable import SolennixFeatures

/// Guards the DRY refactor (#756): the form VM's financial accessors
/// (`productsSubtotal`, `discountAmount`, `taxAmount`, `total`, …) MUST stay
/// in lock-step with `financialResult` (the single source of truth from
/// `EventFinancials.compute()`). Previously the VM reimplemented the formula
/// by hand and could drift silently; these tests fail loudly if anyone
/// reintroduces a divergent hand-rolled calc or breaks the delegation.
final class EventFormViewModelFinancialsEquivalenceTests: XCTestCase {

    private func makeVM() -> EventFormViewModel {
        EventFormViewModel(apiClient: APIClient())
    }

    /// Empty form: every accessor must equal `financialResult` (all zeros).
    func testEmptyForm_accessorsMatchFinancialResult() {
        let vm = makeVM()
        let result = vm.financialResult
        XCTAssertEqual(vm.productsSubtotal, result.productsSubtotal, accuracy: 0.001)
        XCTAssertEqual(vm.discountableBase, result.discountableBase, accuracy: 0.001)
        XCTAssertEqual(vm.discountAmount, result.discountAmount, accuracy: 0.001)
        XCTAssertEqual(vm.afterDiscount, result.afterDiscount, accuracy: 0.001)
        XCTAssertEqual(vm.taxAmount, result.taxAmount, accuracy: 0.001)
        XCTAssertEqual(vm.total, result.total, accuracy: 0.001)
    }

    /// Populated form with products, extras, a percent discount and tax: the
    /// VM accessors must equal `financialResult` for the same inputs. This is
    /// the regression that the old hand-rolled calc could silently break.
    @MainActor
    func testPopulatedForm_accessorsMatchFinancialResult() {
        let vm = makeVM()
        vm.selectedProducts = [
            SelectedProduct(productId: "p1", product: nil, quantity: 2, unitPrice: 100, discount: 10),
            SelectedProduct(productId: "p2", product: nil, quantity: 1, unitPrice: 50, discount: 0)
        ]
        vm.extras = [
            SelectedExtra(description: "Normal", cost: 20, price: 60, excludeUtility: false),
            SelectedExtra(description: "Pass", cost: 5, price: 30, excludeUtility: true)
        ]
        vm.discountType = .percent
        vm.discount = 10
        vm.requiresInvoice = true
        vm.taxRate = 16

        let result = vm.financialResult
        XCTAssertEqual(vm.productsSubtotal, result.productsSubtotal, accuracy: 0.001)
        XCTAssertEqual(vm.normalExtrasSubtotal, result.normalExtrasSubtotal, accuracy: 0.001)
        XCTAssertEqual(vm.passThroughExtrasSubtotal, result.passThroughExtrasSubtotal, accuracy: 0.001)
        XCTAssertEqual(vm.discountableBase, result.discountableBase, accuracy: 0.001)
        XCTAssertEqual(vm.discountAmount, result.discountAmount, accuracy: 0.001)
        XCTAssertEqual(vm.afterDiscount, result.afterDiscount, accuracy: 0.001)
        XCTAssertEqual(vm.taxAmount, result.taxAmount, accuracy: 0.001)
        XCTAssertEqual(vm.total, result.total, accuracy: 0.001)
        // `extrasSubtotal` and `subtotal` are derived (not on Result) but must
        // still equal the sum of the two extras subtotals / products+extras.
        XCTAssertEqual(vm.extrasSubtotal, result.normalExtrasSubtotal + result.passThroughExtrasSubtotal, accuracy: 0.001)
        XCTAssertEqual(vm.subtotal, vm.productsSubtotal + vm.extrasSubtotal, accuracy: 0.001)
    }

    /// Clamping parity: a percent discount > 100 must clamp identically in
    /// both the VM accessor and `financialResult`.
    @MainActor
    func testPercentDiscountOver100_clampsInBothPaths() {
        let vm = makeVM()
        vm.selectedProducts = [SelectedProduct(productId: "p1", product: nil, quantity: 1, unitPrice: 100, discount: 0)]
        vm.discountType = .percent
        vm.discount = 150

        let result = vm.financialResult
        // 150% clamps to 100% → discount == full base.
        XCTAssertEqual(vm.discountAmount, result.discountableBase, accuracy: 0.001)
        XCTAssertEqual(vm.discountAmount, result.discountAmount, accuracy: 0.001)
    }
}
