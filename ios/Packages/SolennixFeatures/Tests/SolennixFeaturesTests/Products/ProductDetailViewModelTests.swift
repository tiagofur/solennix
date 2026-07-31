import XCTest
import SolennixCore
import SolennixNetwork
@testable import SolennixFeatures

/// Pure-logic KPI tests for `ProductDetailViewModel` (decomposed out of the old
/// monolithic `ProductDetailView`). No network — `product`, `ingredients`, and
/// `demandData` are seeded directly. `ProductIngredient` has no public init
/// (memberwise init is internal to `SolennixCore`), so fixtures are decoded
/// from JSON with the same `.convertFromSnakeCase` strategy the `APIClient` uses.
final class ProductDetailViewModelTests: XCTestCase {

    private func makeVM() -> ProductDetailViewModel {
        ProductDetailViewModel(apiClient: APIClient(), productId: "p1")
    }

    /// UTC-pinned calendar mirroring the VM's private `utcCalendar`, so the
    /// 7-day window fixtures line up with the VM's day-diff anchor.
    private func utcCal() -> Calendar {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "UTC")!
        return c
    }

    /// Decodes `[ProductIngredient]` from snake_case JSON (mirrors APIClient).
    private func ingredients(_ json: String) -> [ProductIngredient] {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return try! decoder.decode([ProductIngredient].self, from: Data(json.utf8))
    }

    private func makeProduct(price: Double) -> Product {
        Product(
            id: "p1",
            userId: "u1",
            name: "Paella",
            category: "platillo",
            basePrice: price,
            isActive: true,
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z"
        )
    }

    // MARK: - unitCost / perEventCost

    func testUnitCostSumsIngredientsAndSupplies_ExcludesEquipment() {
        // ingredient 10*2 + supply 5*4 = 40 ; equipment 99*1 excluded.
        let vm = makeVM()
        vm.ingredients = ingredients("""
        [
            {"id":"i1","product_id":"p1","inventory_id":"inv-1","quantity_required":2,"created_at":"2026-01-01T00:00:00Z","unit_cost":10,"type":"ingredient"},
            {"id":"i2","product_id":"p1","inventory_id":"inv-2","quantity_required":4,"created_at":"2026-01-01T00:00:00Z","unit_cost":5,"type":"supply"},
            {"id":"i3","product_id":"p1","inventory_id":"inv-3","quantity_required":1,"created_at":"2026-01-01T00:00:00Z","unit_cost":99,"type":"equipment"}
        ]
        """)
        XCTAssertEqual(vm.unitCost, 40, accuracy: 0.001)
    }

    func testUnitCostTreatsNilUnitCostAsZero() {
        let vm = makeVM()
        vm.ingredients = ingredients("""
        [
            {"id":"i1","product_id":"p1","inventory_id":"inv-1","quantity_required":3,"created_at":"2026-01-01T00:00:00Z","type":"ingredient"}
        ]
        """)
        XCTAssertEqual(vm.unitCost, 0, accuracy: 0.001)
    }

    func testPerEventCostSumsOnlySupplies() {
        // supply only: 5*4 = 20 ; ingredient + equipment ignored.
        let vm = makeVM()
        vm.ingredients = ingredients("""
        [
            {"id":"i1","product_id":"p1","inventory_id":"inv-1","quantity_required":2,"created_at":"2026-01-01T00:00:00Z","unit_cost":10,"type":"ingredient"},
            {"id":"i2","product_id":"p1","inventory_id":"inv-2","quantity_required":4,"created_at":"2026-01-01T00:00:00Z","unit_cost":5,"type":"supply"},
            {"id":"i3","product_id":"p1","inventory_id":"inv-3","quantity_required":1,"created_at":"2026-01-01T00:00:00Z","unit_cost":99,"type":"equipment"}
        ]
        """)
        XCTAssertEqual(vm.perEventCost, 20, accuracy: 0.001)
    }

    // MARK: - margin

    func testMarginIsNilWhenNoRecipe() {
        // No ingredient/supply items -> no basis for margin -> nil.
        let vm = makeVM()
        vm.product = makeProduct(price: 100)
        vm.ingredients = ingredients("""
        [
            {"id":"i3","product_id":"p1","inventory_id":"inv-3","quantity_required":1,"created_at":"2026-01-01T00:00:00Z","unit_cost":99,"type":"equipment"}
        ]
        """)
        XCTAssertNil(vm.margin)
    }

    func testMarginIsZeroWhenPriceMissingOrZero() {
        // Has recipe but price is 0 -> margin is 0 (guard clause).
        let vm = makeVM()
        vm.product = makeProduct(price: 0)
        vm.ingredients = ingredients("""
        [
            {"id":"i1","product_id":"p1","inventory_id":"inv-1","quantity_required":2,"created_at":"2026-01-01T00:00:00Z","unit_cost":10,"type":"ingredient"}
        ]
        """)
        XCTAssertEqual(vm.margin ?? -1, 0, accuracy: 0.001)
    }

    func testMarginIsProfitWhenPriceAboveCost() {
        // price 100, unitCost 40 -> (100-40)/100*100 = 60%.
        let vm = makeVM()
        vm.product = makeProduct(price: 100)
        vm.ingredients = ingredients("""
        [
            {"id":"i1","product_id":"p1","inventory_id":"inv-1","quantity_required":2,"created_at":"2026-01-01T00:00:00Z","unit_cost":10,"type":"ingredient"},
            {"id":"i2","product_id":"p1","inventory_id":"inv-2","quantity_required":4,"created_at":"2026-01-01T00:00:00Z","unit_cost":5,"type":"supply"}
        ]
        """)
        XCTAssertEqual(vm.margin ?? -1, 60, accuracy: 0.001)
    }

    func testMarginIsLossWhenCostExceedsPrice() {
        // price 30, unitCost 40 -> (30-40)/30*100 = -33.33%.
        let vm = makeVM()
        vm.product = makeProduct(price: 30)
        vm.ingredients = ingredients("""
        [
            {"id":"i1","product_id":"p1","inventory_id":"inv-1","quantity_required":2,"created_at":"2026-01-01T00:00:00Z","unit_cost":10,"type":"ingredient"},
            {"id":"i2","product_id":"p1","inventory_id":"inv-2","quantity_required":4,"created_at":"2026-01-01T00:00:00Z","unit_cost":5,"type":"supply"}
        ]
        """)
        XCTAssertEqual(vm.margin ?? -999, -33.3333, accuracy: 0.01)
    }

    // MARK: - demand window (7-day, anchored to today UTC)

    func testDemand7DaysCountsOnlyEventsWithinWindow() {
        let vm = makeVM()
        let today = Date.fromServerDay(Date.localTodayString())!
        let in3 = utcCal().date(byAdding: .day, value: 3, to: today)!
        let in10 = utcCal().date(byAdding: .day, value: 10, to: today)!

        vm.demandData = [
            DemandDataPoint(id: "e1", eventDate: today, clientName: "A", quantity: 5, numPeople: 10),
            DemandDataPoint(id: "e2", eventDate: in3, clientName: "B", quantity: 7, numPeople: 20),
            DemandDataPoint(id: "e3", eventDate: in10, clientName: "C", quantity: 100, numPeople: 50)
        ]
        // today(5) + in3(7) = 12 ; in10 excluded.
        XCTAssertEqual(vm.demand7Days, 12)
        // total counts all.
        XCTAssertEqual(vm.totalDemand, 112)
    }

    func testDemand7DaysIgnoresPastEvents() {
        let vm = makeVM()
        let today = Date.fromServerDay(Date.localTodayString())!
        let yesterday = utcCal().date(byAdding: .day, value: -1, to: today)!

        vm.demandData = [
            DemandDataPoint(id: "past", eventDate: yesterday, clientName: "A", quantity: 9, numPeople: 1),
            DemandDataPoint(id: "now", eventDate: today, clientName: "B", quantity: 3, numPeople: 1)
        ]
        XCTAssertEqual(vm.demand7Days, 3)
        XCTAssertEqual(vm.totalDemand, 12)
    }

    // MARK: - estimatedRevenue7Days

    func testEstimatedRevenue7DaysUsesPerPointUnitPriceWhenPresent() {
        // price fallback only when unitPrice <= 0; here two points carry their
        // own unit prices: 5*12 + 7*20 = 60 + 140 = 200.
        let vm = makeVM()
        vm.product = makeProduct(price: 1000)
        let today = Date.fromServerDay(Date.localTodayString())!
        let in5 = utcCal().date(byAdding: .day, value: 5, to: today)!

        vm.demandData = [
            DemandDataPoint(id: "e1", eventDate: today, clientName: "A", quantity: 5, numPeople: 1, unitPrice: 12),
            DemandDataPoint(id: "e2", eventDate: in5, clientName: "B", quantity: 7, numPeople: 1, unitPrice: 20)
        ]
        XCTAssertEqual(vm.estimatedRevenue7Days, 200, accuracy: 0.001)
    }

    func testEstimatedRevenue7DaysFallsBackToBasePrice() {
        // unitPrice 0 -> uses product.basePrice (50): 4*50 = 200.
        let vm = makeVM()
        vm.product = makeProduct(price: 50)
        let today = Date.fromServerDay(Date.localTodayString())!

        vm.demandData = [
            DemandDataPoint(id: "e1", eventDate: today, clientName: "A", quantity: 4, numPeople: 1)
        ]
        XCTAssertEqual(vm.estimatedRevenue7Days, 200, accuracy: 0.001)
    }

    func testEstimatedRevenue7DaysIsZeroWithoutProductPrice() {
        let vm = makeVM()
        vm.product = nil
        let today = Date.fromServerDay(Date.localTodayString())!
        vm.demandData = [
            DemandDataPoint(id: "e1", eventDate: today, clientName: "A", quantity: 4, numPeople: 1, unitPrice: 9)
        ]
        XCTAssertEqual(vm.estimatedRevenue7Days, 0, accuracy: 0.001)
    }
}
