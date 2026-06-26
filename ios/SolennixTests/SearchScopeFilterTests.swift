import XCTest
@testable import SolennixFeatures
@testable import SolennixNetwork

/// PR3 task 3.1/3.2 — the bottom-nav search tab narrows results by entity type
/// (spec R5: "A `.searchScope` control (all, clients, events, products,
/// inventory) MUST narrow results to the selected scope").
///
/// The filter is CLIENT-SIDE: it narrows the already-grouped `SearchResults`
/// arrays returned by `GET /api/search?q=` — it MUST NOT re-query the backend
/// (design Decision 5). These tests stub a grouped `SearchResults` (one item per
/// entity) and assert each scope narrows to exactly that group.
final class SearchScopeFilterTests: XCTestCase {

    /// Builds `SearchResults` with exactly one item in each of the four entity
    /// groups so every scope filter is unambiguous.
    private func makeGroupedResults() -> SearchResults {
        var results = SearchResults()
        results.clients = [SearchResultItem(id: "c1", type: "client", title: "Cliente Uno")]
        results.events = [SearchResultItem(id: "e1", type: "event", title: "Evento Uno")]
        results.products = [SearchResultItem(id: "p1", type: "product", title: "Producto Uno")]
        results.inventory = [SearchResultItem(id: "i1", type: "inventory", title: "Inventario Uno")]
        return results
    }

    private func makeVM() -> SearchViewModel {
        let vm = SearchViewModel(apiClient: APIClient())
        vm.results = makeGroupedResults()
        return vm
    }

    // MARK: - Scope enum surface

    func testSearchScopeExposesAllFiveCases() {
        // The control MUST offer all/clients/events/products/inventory.
        XCTAssertEqual(SearchScope.allCases.count, 5)
        XCTAssertEqual(SearchScope.allCases, [.all, .clients, .events, .products, .inventory])
    }

    // MARK: - .all returns every entity (no narrowing)

    func testAllScopeReturnsAllFourEntities() {
        let filtered = makeVM().filteredResults(for: .all)
        XCTAssertEqual(filtered?.clients.count, 1)
        XCTAssertEqual(filtered?.events.count, 1)
        XCTAssertEqual(filtered?.products.count, 1)
        XCTAssertEqual(filtered?.inventory.count, 1)
        XCTAssertEqual(filtered?.totalCount, 4)
    }

    // MARK: - Each single-entity scope narrows to exactly one group

    func testClientsScopeReturnsClientsOnly() {
        let filtered = makeVM().filteredResults(for: .clients)
        XCTAssertEqual(filtered?.clients.count, 1)
        XCTAssertTrue(filtered?.events.isEmpty ?? false)
        XCTAssertTrue(filtered?.products.isEmpty ?? false)
        XCTAssertTrue(filtered?.inventory.isEmpty ?? false)
    }

    func testEventsScopeReturnsEventsOnly() {
        let filtered = makeVM().filteredResults(for: .events)
        XCTAssertEqual(filtered?.events.count, 1)
        XCTAssertTrue(filtered?.clients.isEmpty ?? false)
        XCTAssertTrue(filtered?.products.isEmpty ?? false)
        XCTAssertTrue(filtered?.inventory.isEmpty ?? false)
    }

    func testProductsScopeReturnsProductsOnly() {
        let filtered = makeVM().filteredResults(for: .products)
        XCTAssertEqual(filtered?.products.count, 1)
        XCTAssertTrue(filtered?.clients.isEmpty ?? false)
        XCTAssertTrue(filtered?.events.isEmpty ?? false)
        XCTAssertTrue(filtered?.inventory.isEmpty ?? false)
    }

    func testInventoryScopeReturnsInventoryOnly() {
        let filtered = makeVM().filteredResults(for: .inventory)
        XCTAssertEqual(filtered?.inventory.count, 1)
        XCTAssertTrue(filtered?.clients.isEmpty ?? false)
        XCTAssertTrue(filtered?.events.isEmpty ?? false)
        XCTAssertTrue(filtered?.products.isEmpty ?? false)
    }

    // MARK: - nil results stay nil for every scope (no backend re-query)

    func testNilResultsReturnNilForAllScopes() {
        let vm = SearchViewModel(apiClient: APIClient())
        vm.results = nil
        XCTAssertNil(vm.filteredResults(for: .all))
        XCTAssertNil(vm.filteredResults(for: .clients))
    }
}
