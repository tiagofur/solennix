import XCTest
@testable import Solennix
@testable import SolennixFeatures
@testable import SolennixNetwork

/// PR2 task 2.4 — search text MUST clear when the user leaves the `.search` tab
/// (spec R7: "Text MUST clear on tab exit").
///
/// The leave-decision is extracted into a pure function so it is unit-testable;
/// `CompactTabLayout` wires it onto `.onChange(of: selectedTab)` →
/// `SearchViewModel.clearSearch()`. The clear itself zeroes query+results
/// (existing `SearchViewModel.clearSearch()`), which is asserted here as the
/// end-state contract the wiring relies on.
final class ClearOnExitTests: XCTestCase {

    // MARK: - Pure leave-decision: only leaving .search clears

    func testLeavingSearchToHomeClears() {
        XCTAssertTrue(shouldClearSearchOnTabExit(current: .search, next: .home))
    }

    func testLeavingSearchToClientsClears() {
        // Triangulation across the leaving target.
        XCTAssertTrue(shouldClearSearchOnTabExit(current: .search, next: .clients))
    }

    func testLeavingSearchToEventsClears() {
        // Triangulation: a third leaving target exercises the same branch.
        XCTAssertTrue(shouldClearSearchOnTabExit(current: .search, next: .events))
    }

    func testEnteringSearchDoesNotClear() {
        // home → search: we are ENTERING search, not leaving it.
        XCTAssertFalse(shouldClearSearchOnTabExit(current: .home, next: .search))
    }

    func testReTapSearchDoesNotClear() {
        // search → search (re-tap): not leaving.
        XCTAssertFalse(shouldClearSearchOnTabExit(current: .search, next: .search))
    }

    func testRegularSwitchDoesNotClear() {
        // events → clients: no search involvement.
        XCTAssertFalse(shouldClearSearchOnTabExit(current: .events, next: .clients))
    }

    // MARK: - End-state: query is empty after leaving .search

    func testClearSearchZeroesQueryAndResults() {
        // `clearSearch()` is the side effect the wiring calls on tab exit.
        // `APIClient()` is a cheap no-network stub (clearSearch makes no calls).
        let vm = SearchViewModel(apiClient: APIClient())
        vm.query = "fiesta"
        vm.hasSearched = true

        // Simulate the wiring: the pure decision fires for a leaving transition,
        // and the VM is cleared.
        XCTAssertTrue(shouldClearSearchOnTabExit(current: .search, next: .home))
        vm.clearSearch()

        XCTAssertEqual(vm.query, "")
        XCTAssertNil(vm.results)
        XCTAssertFalse(vm.hasSearched)
    }
}
