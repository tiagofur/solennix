import XCTest
import SwiftUI
import SnapshotTesting
import SolennixCore
import SolennixNetwork
@testable import SolennixFeatures

/// Task 4.6 — "Events App Bar" (MODIFIED, `events-calendar` delta).
///
/// Spec scenario: App bar exposes only the status filter
///   GIVEN Eventos in either mode
///   WHEN  the app bar renders
///   THEN  the status filter MUST be present
///   AND   the `calendar` filter button MUST NOT be present
///
/// How this is enforced structurally (ADR-8 seam philosophy, mirrors 4.2 / 4.5):
/// the app bar's filter affordances are a SINGLE source of truth
/// (`EventosAppBarFilter.allCases`) that `EventListView`'s trailing toolbar
/// renders from via a `ForEach` over the cases. So a filter appears in the
/// rendered app bar IF AND ONLY IF its case is present in that enum. The status
/// filter itself is a named, snapshot-testable component (`EventosStatusFilterMenu`).
///
/// Therefore:
///   • status filter PRESENT  ← `.status ∈ allCases` AND `EventosStatusFilterMenu`
///                               renders (snapshot, reflects its binding).
///   • calendar button ABSENT ← `allCases == [.status]` and no `.calendar` case
///                               exists, so the toolbar's filter loop cannot emit
///                               a calendar button in EITHER `.lista` or
///                               `.calendario` (the toolbar is shared).
final class EventListViewAppBarTests: XCTestCase {

    // MARK: - Status filter is PRESENT (renders + reflects its binding)

    private static let sampleFilters: [(status: EventStatus?, label: String, count: Int)] = [
        (nil,        "Todos",      6),
        (.quoted,    "Cotizado",    1),
        (.confirmed, "Confirmado",  2),
        (.completed, "Completado",  3),
        (.cancelled, "Cancelado",   0)
    ]

    func testStatusBarRendersStatusFilterWithNoSelection() {
        // No status selected → the "hollow" filter icon. Proves the app bar
        // exposes a status filter affordance that renders.
        let menu = EventosStatusFilterMenu(
            selectedStatus: .constant(nil),
            statusFilters: Self.sampleFilters
        )
        assertSnapshot(
            of: menu.padding(),
            as: .image(layout: .fixed(width: 96, height: 64)),
            testName: "status-filter-unselected"
        )
    }

    func testStatusBarReflectsSelectedStatus() {
        // Triangulation: with a status selected the Menu renders the "filled"
        // filter icon — proving the component is a live projection of its
        // binding (the same binding the toolbar wires to
        // `$viewModel.selectedStatus`).
        let menu = EventosStatusFilterMenu(
            selectedStatus: .constant(.confirmed),
            statusFilters: Self.sampleFilters
        )
        assertSnapshot(
            of: menu.padding(),
            as: .image(layout: .fixed(width: 96, height: 64)),
            testName: "status-filter-selected"
        )
    }

    // MARK: - Calendar filter button is ABSENT (source-of-truth)

    func testAppBarExposesOnlyStatusFilter() {
        // `EventosAppBarFilter.allCases` is the SINGLE source of truth the
        // trailing toolbar renders its filter items from (a `ForEach` over the
        // cases). The legacy `calendar` date-range filter button was removed
        // (task 4.6): the content-header `Lista | Calendario` toggle + the
        // period chips (task 4.5) are the sole calendar entry, so a second
        // date-range button in the app bar was redundant. The ONLY way a
        // calendar filter button can return is by re-adding `.calendar` here —
        // this test pins the rendered set at exactly `[.status]`.
        XCTAssertEqual(
            EventosAppBarFilter.allCases,
            [.status],
            "app bar must expose ONLY the status filter — the calendar filter button was removed (task 4.6)"
        )
    }

    func testCalendarFilterCaseDoesNotExist() {
        // Explicit absence guard: `.calendar` must not be a constructible case
        // of the app-bar filter enum. If someone reintroduces it, this fails
        // loudly instead of quietly re-rendering a calendar button in the
        // shared toolbar (both `.lista` and `.calendario`).
        XCTAssertNil(
            EventosAppBarFilter(rawValue: "calendar"),
            "EventosAppBarFilter must not have a .calendar case — the calendar filter button was removed (task 4.6)"
        )
    }
}
