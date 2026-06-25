import XCTest
import SwiftUI
import SnapshotTesting
import SolennixCore
import SolennixDesign
import SolennixNetwork
@testable import SolennixFeatures

/// Task 4.3 — "Calendario reuses eventCard for the filtered list"
/// (`events-calendar` delta).
///
/// Spec scenario:
///   GIVEN Eventos is in `.calendario` with a selected day that has events
///   WHEN  the filtered list renders
///   THEN  it MUST render the SAME `eventCard` used in `.lista`
///   AND   it MUST NOT render a distinct `eventRowContent` row
///
/// How this is enforced structurally (ADR-8 seam philosophy):
/// `EventosLayoutFactory.make(vm:viewMode:sizeClass:grid:cell:)` renders the
/// filtered-list region of BOTH `.lista` and `.calendario` through ONE injected
/// `cell` builder — the factory has NO built-in row type of its own. In
/// production `EventListView` passes its single `eventCard(_:)` method as that
/// builder for both modes, so `.calendario` reuses `eventCard` by construction
/// and a distinct `eventRowContent` row can never appear (that type lives only
/// in `CalendarView`, which Phase 6 deletes).
///
/// These tests pin the contract: a SINGLE shared cell builder, injected into the
/// factory, renders for every filtered event in BOTH modes. We snapshot
/// `.lista` and `.calendario` with the SAME marker cell and assert both render
/// that marker — proving the two modes share one cell (and therefore one
/// `eventCard` in production), with no parallel row builder in the factory.
final class EventListViewCalendarioCellTests: XCTestCase {

    // MARK: - Deterministic test data

    /// Two events on the same day so `.calendario`'s filtered list (driven by
    /// the shared `dateRange*` filter invariant from 3.3) has a deterministic,
    /// non-empty cell set to render.
    private static let fixedEvents: [Event] = [
        Event(
            id: "card-evt-1",
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
            id: "card-evt-2",
            userId: "u-1",
            clientId: "c-2",
            eventDate: "2026-06-15",
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

    private func makeViewModel() -> EventListViewModel {
        let vm = EventListViewModel(apiClient: APIClient(), eventRepository: nil)
        vm.events = Self.fixedEvents
        return vm
    }

    /// A single shared marker cell builder. It stamps each event with an
    /// unambiguous `SHARED-CARD·<id>` label so a snapshot proves the SAME cell
    /// renders in both `.lista` and `.calendario`. In production this exact slot
    /// is filled by `EventListView.eventCard(_:)`.
    private func sharedMarkerCell(_ event: Event) -> some View {
        HStack(spacing: 4) {
            Text("SHARED-CARD\u{00B7}\(event.id)")
                .font(.caption)
                .foregroundStyle(SolennixColors.text)
            Spacer(minLength: 0)
        }
        .padding(.vertical, 2)
    }

    /// Deterministic grid stand-in for the snapshot (no `Date`/locale drift).
    /// Production injects the real `CalendarGridView`; the factory's layout
    /// arrangement (split/stack) is what matters here, not the grid content.
    private func deterministicGrid() -> some View {
        Text("GRID")
            .font(.caption2)
            .foregroundStyle(SolennixColors.textSecondary)
            .frame(maxWidth: .infinity)
            .frame(height: 24)
            .background(SolennixColors.surfaceGrouped)
    }

    // MARK: - The contract: both modes render the SAME injected cell

    func testListaFilteredListRendersTheSharedCell() {
        // Lista's filtered-list region renders every filtered event through the
        // ONE injected cell builder. Baseline: the shared marker appears for
        // each event in `.lista`.
        let view = EventosLayoutFactory.make(
            vm: makeViewModel(),
            viewMode: .lista,
            sizeClass: .compact,
            grid: { EmptyView() },
            cell: sharedMarkerCell
        )

        assertSnapshot(
            of: view,
            as: .image(layout: .fixed(width: 390, height: 220)),
            testName: "lista-shared-cell"
        )
    }

    func testCalendarioFilteredListRendersTheSameSharedCellAsLista() {
        // The crux of the spec scenario: `.calendario`'s filtered list renders
        // the SAME cell builder as `.lista` (the shared marker). Because the
        // factory has no row type of its own, this is only possible if the
        // factory routes both modes through the single injected `cell` — i.e.
        // production's `eventCard`. No `eventRowContent`-style duplicate can
        // appear because the factory renders nothing else.
        let view = EventosLayoutFactory.make(
            vm: makeViewModel(),
            viewMode: .calendario,
            sizeClass: .compact,
            grid: { self.deterministicGrid() },
            cell: sharedMarkerCell
        )

        assertSnapshot(
            of: view,
            as: .image(layout: .fixed(width: 390, height: 360)),
            testName: "calendario-shared-cell"
        )
    }

    func testCalendarioFilteredListIsEmptyWhenNoEventsMatch() {
        // Negative case: with no matching events, the shared cell must NOT
        // render any row (the factory renders the injected cell ONLY for real
        // events — there is no fallback row builder). Guards against a future
        // hardcoded placeholder row sneaking into the calendario filtered list.
        let vm = EventListViewModel(apiClient: APIClient(), eventRepository: nil)
        vm.events = []   // nothing matches → filtered list region is empty

        let view = EventosLayoutFactory.make(
            vm: vm,
            viewMode: .calendario,
            sizeClass: .compact,
            grid: { self.deterministicGrid() },
            cell: sharedMarkerCell
        )

        assertSnapshot(
            of: view,
            as: .image(layout: .fixed(width: 390, height: 200)),
            testName: "calendario-empty-no-row"
        )
    }
}
