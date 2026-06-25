import SwiftUI
import SolennixCore
import SolennixDesign

// MARK: - EventosViewMode (ADR-7)

/// View-mode toggle for the unified Eventos screen.
///
/// Lives on the VIEW as `@State` (default `.lista`, NOT persisted via
/// `@AppStorage`). Toggling it MUST NOT reload events or drop the current
/// selection — both modes read the SAME `EventListViewModel.events` array, so a
/// flip is purely presentational. Phase 4.2 wires the `Lista | Calendario`
/// toggle in the content header; this enum is the toggle's value type.
public enum EventosViewMode: String, CaseIterable, Sendable, Equatable {
    case lista
    case calendario
}

// MARK: - EventosLayoutFactory (ADR-8)

/// Size-class-driven layout seam for the unified Eventos screen.
///
/// Satisfies the "Adaptive Layout by Size Class" requirement from the
/// `events-calendar` delta:
///   - `regular` horizontal size class (iPad landscape) → **split**: calendar
///     grid on the left, filtered events list on the right.
///   - `compact` horizontal size class (iPhone) → **stack**: calendar grid
///     above, filtered events list below.
///
/// The factory is the **layout** seam only — it arranges two pieces of injected
/// content (a grid view and a per-event cell builder) in split vs stack by
/// horizontal size class. The real calendar grid (`CalendarGridView`, still in
/// `Calendar/Views/` — formal move is Phase 6) and the reused `eventCard` row
/// are passed IN by `EventListView`. Task 4.3 made the filtered list render the
/// SAME `eventCard` cell as `.lista` by injecting a single shared cell builder;
/// the factory has no row type of its own, so a distinct `eventRowContent` row
/// can never appear.
public enum EventosLayoutFactory {

    /// Builds the Eventos view subtree for the given mode and horizontal size class.
    ///
    /// - Parameters:
    ///   - vm: the single `EventListViewModel` backing BOTH modes (same `events`).
    ///   - viewMode: `.lista` (events list only) or `.calendario` (grid + list).
    ///   - sizeClass: the current `horizontalSizeClass`. `.regular` → split;
    ///     `.compact` or `nil` → stack (unknown/nil must never be treated as
    ///     iPad).
    ///   - grid: the calendar-grid view rendered in `.calendario` (ignored in
    ///     `.lista`). Production passes the reused `CalendarGridView`; tests
    ///     pass a deterministic stand-in so the split/stack arrangement stays
    ///     snapshot-stable (no `Date`/locale drift — ADR-8).
    ///   - cell: the SINGLE per-event cell builder used by the filtered list in
    ///     BOTH modes. Production passes `EventListView.eventCard(_:)`; this is
    ///     how `.calendario` reuses the same `eventCard` as `.lista` (spec
    ///     scenario "Calendario reuses eventCard"). The factory renders nothing
    ///     else, so no `eventRowContent`-style duplicate can appear.
    @ViewBuilder
    public static func make<Grid: View, Cell: View>(
        vm: EventListViewModel,
        viewMode: EventosViewMode,
        sizeClass: UserInterfaceSizeClass?,
        @ViewBuilder grid: @escaping () -> Grid,
        @ViewBuilder cell: @escaping (Event) -> Cell
    ) -> some View {
        switch viewMode {
        case .lista:
            // No calendar grid in Lista mode — events list only.
            EventosFilteredList(vm: vm, cell: cell)
        case .calendario:
            if sizeClass == .regular {
                // iPad landscape: grid LEFT, filtered list RIGHT.
                EventosCalendarioSplit(vm: vm, grid: grid, cell: cell)
            } else {
                // iPhone (compact width) or unknown (nil): grid ABOVE, list BELOW.
                EventosCalendarioStack(vm: vm, grid: grid, cell: cell)
            }
        }
    }
}

// MARK: - Calendario layout containers

/// Split layout (regular width): calendar grid on the LEFT, filtered events
/// list on the RIGHT — iPad landscape.
private struct EventosCalendarioSplit<Grid: View, Cell: View>: View {
    let vm: EventListViewModel
    @ViewBuilder let grid: () -> Grid
    let cell: (Event) -> Cell

    var body: some View {
        HStack(alignment: .top, spacing: Spacing.lg) {
            grid()
                .frame(maxWidth: .infinity, alignment: .leading)
            EventosFilteredList(vm: vm, cell: cell)
                .frame(maxWidth: .infinity, alignment: .trailing)
        }
        .padding()
    }
}

/// Stack layout (compact width): calendar grid ABOVE, filtered events list
/// BELOW — iPhone.
private struct EventosCalendarioStack<Grid: View, Cell: View>: View {
    let vm: EventListViewModel
    @ViewBuilder let grid: () -> Grid
    let cell: (Event) -> Cell

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.lg) {
            grid()
            EventosFilteredList(vm: vm, cell: cell)
        }
        .padding()
    }
}

// MARK: - Filtered events list region (renders the SAME shared cell in both modes)

/// The filtered-events-list region. Renders one row per event in
/// `vm.filteredEvents` through the injected `cell` builder — the SAME builder
/// `.lista` and `.calendario` share (production: `eventCard`). The region owns
/// only its card chrome; it has no row type of its own, so a distinct
/// `eventRowContent` row can never be rendered here (spec scenario
/// "reuses eventCard").
struct EventosFilteredList<Cell: View>: View {
    let vm: EventListViewModel
    let cell: (Event) -> Cell

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            if vm.filteredEvents.isEmpty {
                // Empty region — no fallback row. The shared cell renders only
                // for real events, so an empty filter cannot introduce a
                // placeholder/duplicate row.
                Text(FeatureL10n.text("events.list.empty.no_results_title", "No se encontraron eventos"))
                    .font(.subheadline)
                    .foregroundStyle(SolennixColors.textSecondary)
                    .padding(.vertical, Spacing.sm)
            } else {
                ForEach(vm.filteredEvents) { event in
                    cell(event)
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(SolennixColors.surfaceGrouped)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}
