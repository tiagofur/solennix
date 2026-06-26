import XCTest
@testable import Solennix
@testable import SolennixFeatures
@testable import SolennixNetwork

/// PR3 F-1 (from PR2 review) — a Spotlight deep-link that fires while the user
/// is on the search tab MUST clear the search query; otherwise the query + its
/// rendered results go STALE on the search tab after the system navigates to
/// home (spec R7: "Text MUST clear on tab exit").
///
/// Bug: both Spotlight handlers in `CompactTabLayout` (`onChange(of:
/// pendingSpotlightRoute)`, ios26 + legacy branches) set `selectedTab = .home`
/// directly, BYPASSING the `applyTabSelection` clear-on-exit chokepoint wired in
/// PR2. The fix routes the Spotlight tab-transition through the same
/// leave-decision. This test pins the PURE decision the wiring relies on
/// (`planSpotlightTransition`), so a stale-query regression is caught at the
/// unit level without needing a live Spotlight harness.
final class SpotlightClearOnExitTests: XCTestCase {

    // MARK: - Leaving .search via Spotlight clears the query (F-1)

    func testSpotlightFromSearchClearsSearchQuery() {
        // User is on the search tab with a query; a Spotlight deep-link fires.
        let plan = planSpotlightTransition(from: .search, to: .home)
        XCTAssertTrue(
            plan.clearSearchOnExit,
            "Spotlight navigating away from the search tab must clear the search query (F-1)."
        )
        XCTAssertEqual(plan.destinationTab, .home)
    }

    // MARK: - Spotlight from a non-search tab does NOT clear

    func testSpotlightFromEventsDoesNotClear() {
        let plan = planSpotlightTransition(from: .events, to: .home)
        XCTAssertFalse(plan.clearSearchOnExit)
        XCTAssertEqual(plan.destinationTab, .home)
    }

    func testSpotlightFromHomeDoesNotClear() {
        let plan = planSpotlightTransition(from: .home, to: .home)
        XCTAssertFalse(plan.clearSearchOnExit)
        XCTAssertEqual(plan.destinationTab, .home)
    }

    // MARK: - A Spotlight transition whose destination IS search never clears

    func testSpotlightToSearchDoesNotClear() {
        // Not leaving search when the destination is the search tab.
        let plan = planSpotlightTransition(from: .events, to: .search)
        XCTAssertFalse(plan.clearSearchOnExit)
        XCTAssertEqual(plan.destinationTab, .search)
    }

    // MARK: - End-state: clearSearch() zeroes the held query (the side effect)

    func testClearSearchZeroesQueryAfterSpotlightLeave() {
        let vm = SearchViewModel(apiClient: APIClient())
        vm.query = "fiesta"
        vm.hasSearched = true

        // Simulate the wiring: the pure plan says clear, the VM is cleared.
        let plan = planSpotlightTransition(from: .search, to: .home)
        XCTAssertTrue(plan.clearSearchOnExit)
        vm.clearSearch()

        XCTAssertEqual(vm.query, "")
        XCTAssertNil(vm.results)
        XCTAssertFalse(vm.hasSearched)
    }
}
