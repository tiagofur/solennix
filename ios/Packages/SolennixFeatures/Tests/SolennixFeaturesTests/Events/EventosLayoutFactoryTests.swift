import XCTest
import SwiftUI
import SnapshotTesting
import SolennixCore
import SolennixNetwork
@testable import SolennixFeatures

/// Task 4.1 — `EventosLayoutFactory` split/stack layout seam (ADR-8).
///
/// Covers the "Adaptive Layout by Size Class" requirement from the
/// `events-calendar` delta:
///   • `regular × regular` (iPad landscape) → **split** (grid left, filtered
///     events list right).
///   • `compact × regular` (iPhone) → **stack** (grid above, filtered list
///     below).
///
/// The factory is the deterministic unit these snapshots assert against. It is
/// the layout SEAM only — the real calendar grid body (moved `CalendarGridView`,
/// Phase 6) and the reused `eventCard` row are wired into the seam by task 4.3;
/// here we only prove the factory picks the right split vs stack arrangement for
/// each horizontal size class.
final class EventosLayoutFactoryTests: XCTestCase {

    // MARK: - Deterministic test data

    /// A `EventListViewModel` seeded with a fixed set of events so the rendered
    /// list seam is identical on every run (no date/locale drift, no network).
    /// `filteredEvents` returns both events sorted by `eventDate` DESC.
    private func makeViewModel() -> EventListViewModel {
        let vm = EventListViewModel(apiClient: APIClient(), eventRepository: nil)
        vm.events = Self.fixedEvents
        return vm
    }

    private static let fixedEvents: [Event] = [
        Event(
            id: "evt-1",
            userId: "u-1",
            clientId: "c-1",
            eventDate: "2026-06-15",
            startTime: "18:00",
            serviceType: "Boda",
            numPeople: 120,
            status: .confirmed,
            discount: 0,
            discountType: .percent,
            requiresInvoice: false,
            taxRate: 0,
            taxAmount: 0,
            totalAmount: 45000,
            location: "Hacienda San Miguel",
            city: "Puebla",
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z"
        ),
        Event(
            id: "evt-2",
            userId: "u-1",
            clientId: "c-2",
            eventDate: "2026-06-22",
            startTime: "20:00",
            serviceType: "XV A\u{00F1}os",
            numPeople: 80,
            status: .quoted,
            discount: 0,
            discountType: .percent,
            requiresInvoice: false,
            taxRate: 0,
            taxAmount: 0,
            totalAmount: 32000,
            createdAt: "2026-01-02T00:00:00.000Z",
            updatedAt: "2026-01-02T00:00:00.000Z"
        )
    ]

    // MARK: - view-mode enum contract (ADR-7)

    func testEventosViewModeExposesListaAndCalendario() {
        XCTAssertEqual(EventosViewMode.allCases, [.lista, .calendario])
    }

    func testEventosViewModeRawValueContract() {
        // The default entry is Lista and lives on the VIEW as @State (not
        // @AppStorage). This test pins the raw-value contract the view will
        // rely on when persisting/reading nothing.
        XCTAssertEqual(EventosViewMode.lista, EventosViewMode(rawValue: "lista"))
        XCTAssertEqual(EventosViewMode.calendario, EventosViewMode(rawValue: "calendario"))
    }

    // MARK: - Adaptive layout: split vs stack

    func testRegularSizeClassRendersSplitLayout() {
        let view = EventosLayoutFactory.make(
            vm: makeViewModel(),
            viewMode: .calendario,
            sizeClass: .regular
        )

        // iPad-landscape proportions. The factory uses the EXPLICIT sizeClass
        // argument (not the environment), so the split layout renders correctly
        // even when the host simulator is an iPhone. Fixed layout → deterministic
        // frame; reference renders at the booted sim's scale (3x on iPhone 17 Pro
        // Max, the project's pinned runner).
        assertSnapshot(of: view, as: .image(layout: .fixed(width: 1024, height: 620)), testName: "regular-split")
    }

    func testCompactSizeClassRendersStackLayout() {
        let view = EventosLayoutFactory.make(
            vm: makeViewModel(),
            viewMode: .calendario,
            sizeClass: .compact
        )

        // iPhone proportions: grid above, filtered list below.
        assertSnapshot(of: view, as: .image(layout: .fixed(width: 390, height: 720)), testName: "compact-stack")
    }

    func testListaModeHasNoCalendarGrid() {
        // Lista mode renders the events list only — no calendar grid region.
        // Distinct from the calendario snapshots so the absence of the grid is
        // a documented, regression-guarded fact (the view toggle is added in
        // 4.2; the factory already routes `.lista` to the list-only seam).
        let view = EventosLayoutFactory.make(
            vm: makeViewModel(),
            viewMode: .lista,
            sizeClass: .regular
        )

        assertSnapshot(of: view, as: .image(layout: .fixed(width: 390, height: 520)), testName: "lista-list-only")
    }
}
