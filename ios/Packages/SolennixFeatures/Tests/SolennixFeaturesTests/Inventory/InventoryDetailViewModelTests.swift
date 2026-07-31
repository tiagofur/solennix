import XCTest
import SolennixCore
import SolennixNetwork
@testable import SolennixFeatures

/// Pure-logic KPI tests for `InventoryDetailViewModel` (decomposed out of the
/// old monolithic `InventoryDetailView`). No network — `item` and
/// `demandEntries` are seeded directly. `InventoryItem` has a public init, so
/// fixtures are built in Swift; `InventoryDemandEntry` is constructed via its
/// internal init (visible through `@testable import SolennixFeatures`).
final class InventoryDetailViewModelTests: XCTestCase {

    private func makeVM() -> InventoryDetailViewModel {
        InventoryDetailViewModel(apiClient: APIClient(), itemId: "inv-1")
    }

    private func makeItem(
        current: Double,
        minimum: Double = 5,
        unitCost: Double? = 10,
        unit: String = "kg",
        type: InventoryType = .ingredient
    ) -> InventoryItem {
        InventoryItem(
            id: "inv-1",
            userId: "u1",
            ingredientName: "Harina",
            currentStock: current,
            minimumStock: minimum,
            unit: unit,
            unitCost: unitCost,
            lastUpdated: "2026-01-01T00:00:00Z",
            type: type
        )
    }

    /// UTC-pinned calendar mirroring the VM's `utcCalendar`.
    private func utcCal() -> Calendar {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "UTC")!
        return c
    }

    // MARK: - isLowStock

    func testIsLowStockTrueWhenCurrentBelowMinimum() {
        let vm = makeVM()
        vm.item = makeItem(current: 2, minimum: 5)
        XCTAssertTrue(vm.isLowStock)
    }

    func testIsLowStockFalseWhenCurrentAtOrAboveMinimum() {
        let vm = makeVM()
        vm.item = makeItem(current: 5, minimum: 5)
        XCTAssertFalse(vm.isLowStock)

        vm.item = makeItem(current: 8, minimum: 5)
        XCTAssertFalse(vm.isLowStock)
    }

    func testIsLowStockFalseWhenMinimumIsZero() {
        // minimumStock == 0 disables the low-stock check (guard clause).
        let vm = makeVM()
        vm.item = makeItem(current: 0, minimum: 0)
        XCTAssertFalse(vm.isLowStock)
    }

    func testIsLowStockFalseWhenItemNil() {
        let vm = makeVM()
        vm.item = nil
        XCTAssertFalse(vm.isLowStock)
    }

    // MARK: - stockValue

    func testStockValueIsUnitCostTimesCurrent() {
        let vm = makeVM()
        vm.item = makeItem(current: 12, minimum: 5, unitCost: 10)
        XCTAssertEqual(vm.stockValue, 120, accuracy: 0.001)
    }

    func testStockValueIsZeroWhenUnitCostNil() {
        let vm = makeVM()
        vm.item = makeItem(current: 12, minimum: 5, unitCost: nil)
        XCTAssertEqual(vm.stockValue, 0, accuracy: 0.001)
    }

    func testStockValueIsZeroWhenItemNil() {
        let vm = makeVM()
        vm.item = nil
        XCTAssertEqual(vm.stockValue, 0, accuracy: 0.001)
    }

    // MARK: - demand7Days / stockAfter7Days window

    func testDemand7DaysCountsOnlyEntriesWithinWindow() {
        let vm = makeVM()
        vm.item = makeItem(current: 50, minimum: 5)
        let today = vm.todayUTC!
        let in4 = utcCal().date(byAdding: .day, value: 4, to: today)!
        let in12 = utcCal().date(byAdding: .day, value: 12, to: today)!

        vm.demandEntries = [
            InventoryDemandEntry(id: "e1", eventDate: today, eventName: "A", quantity: 3, unit: "kg"),
            InventoryDemandEntry(id: "e2", eventDate: in4, eventName: "B", quantity: 7, unit: "kg"),
            InventoryDemandEntry(id: "e3", eventDate: in12, eventName: "C", quantity: 40, unit: "kg")
        ]
        // today(3) + in4(7) = 10 ; in12 excluded.
        XCTAssertEqual(vm.demand7Days, 10, accuracy: 0.001)
        // 50 - 10 = 40.
        XCTAssertEqual(vm.stockAfter7Days, 40, accuracy: 0.001)
    }

    func testDemand7DaysIgnoresPastEntries() {
        let vm = makeVM()
        vm.item = makeItem(current: 50, minimum: 5)
        let today = vm.todayUTC!
        let yesterday = utcCal().date(byAdding: .day, value: -1, to: today)!

        vm.demandEntries = [
            InventoryDemandEntry(id: "past", eventDate: yesterday, eventName: "A", quantity: 9, unit: "kg"),
            InventoryDemandEntry(id: "now", eventDate: today, eventName: "B", quantity: 4, unit: "kg")
        ]
        XCTAssertEqual(vm.demand7Days, 4, accuracy: 0.001)
        XCTAssertEqual(vm.stockAfter7Days, 46, accuracy: 0.001)
    }

    func testStockAfter7DaysFallsBackToZeroStockWhenItemNil() {
        let vm = makeVM()
        vm.item = nil
        let today = vm.todayUTC!
        vm.demandEntries = [
            InventoryDemandEntry(id: "e1", eventDate: today, eventName: "A", quantity: 4, unit: "kg")
        ]
        XCTAssertEqual(vm.stockAfter7Days, -4, accuracy: 0.001)
    }

    // MARK: - makeDemandRows()

    func testMakeDemandRowsComputesRunningBalanceAndInsufficiency() {
        // currentStock 10 ; demand 4 then 8.
        // row1: balance = 10-4 = 6 (ok) ; row2: balance = 6-8 = -2 (insufficient).
        let vm = makeVM()
        vm.item = makeItem(current: 10, minimum: 5)
        let today = vm.todayUTC!
        let in2 = utcCal().date(byAdding: .day, value: 2, to: today)!

        vm.demandEntries = [
            InventoryDemandEntry(id: "e1", eventDate: today, eventName: "A", quantity: 4, unit: "kg"),
            InventoryDemandEntry(id: "e2", eventDate: in2, eventName: "B", quantity: 8, unit: "kg")
        ]
        let rows = vm.makeDemandRows()
        XCTAssertEqual(rows.count, 2)
        XCTAssertEqual(rows[0].runningBalance, 6, accuracy: 0.001)
        XCTAssertFalse(rows[0].isInsufficient)
        XCTAssertEqual(rows[1].runningBalance, -2, accuracy: 0.001)
        XCTAssertTrue(rows[1].isInsufficient)
        // diffDays: today=0, in2=2.
        XCTAssertEqual(rows[0].diffDays, 0)
        XCTAssertEqual(rows[1].diffDays, 2)
    }

    func testMakeDemandRowsEmptyWhenNoEntries() {
        let vm = makeVM()
        vm.item = makeItem(current: 10, minimum: 5)
        XCTAssertTrue(vm.makeDemandRows().isEmpty)
    }

    func testMakeDemandRowsReturnsEntriesWithZeroBalanceWhenItemNil() {
        // item nil -> starting balance 0 ; each row subtracts its quantity.
        let vm = makeVM()
        vm.item = nil
        let today = vm.todayUTC!
        vm.demandEntries = [
            InventoryDemandEntry(id: "e1", eventDate: today, eventName: "A", quantity: 3, unit: "kg")
        ]
        let rows = vm.makeDemandRows()
        XCTAssertEqual(rows.count, 1)
        XCTAssertEqual(rows[0].runningBalance, -3, accuracy: 0.001)
        XCTAssertTrue(rows[0].isInsufficient)
    }
}
