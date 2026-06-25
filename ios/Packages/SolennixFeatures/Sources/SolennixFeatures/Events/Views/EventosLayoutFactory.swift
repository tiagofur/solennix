import SwiftUI
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
/// This is the layout SEAM only. It chooses split vs stack by horizontal size
/// class; the real calendar grid body (the moved `CalendarGridView`, Phase 6)
/// and the reused `eventCard` row are wired INTO the seam by task 4.3. The seam
/// placeholders render a deterministic grid region + a data-driven filtered
/// list region so the split/stack arrangement is unambiguous in snapshots and
/// the single-ViewModel invariant is preserved (both regions read `vm`).
public enum EventosLayoutFactory {

    /// Builds the Eventos view subtree for the given mode and horizontal size class.
    ///
    /// - Parameters:
    ///   - vm: the single `EventListViewModel` backing BOTH modes (same `events`).
    ///   - viewMode: `.lista` (events list only) or `.calendario` (grid + list).
    ///   - sizeClass: the current `horizontalSizeClass`. `.regular` → split;
    ///     `.compact` or `nil` → stack (unknown/nil must never be treated as
    ///     iPad).
    @ViewBuilder
    public static func make(
        vm: EventListViewModel,
        viewMode: EventosViewMode,
        sizeClass: UserInterfaceSizeClass?
    ) -> some View {
        switch viewMode {
        case .lista:
            // No calendar grid in Lista mode — events list only.
            EventosFilteredListSeam(vm: vm)
        case .calendario:
            if sizeClass == .regular {
                // iPad landscape: grid LEFT, filtered list RIGHT.
                EventosCalendarioSplit(vm: vm)
            } else {
                // iPhone (compact width) or unknown (nil): grid ABOVE, list BELOW.
                EventosCalendarioStack(vm: vm)
            }
        }
    }
}

// MARK: - Calendario layout containers

/// Split layout (regular width): calendar grid on the LEFT, filtered events
/// list on the RIGHT — iPad landscape.
private struct EventosCalendarioSplit: View {
    let vm: EventListViewModel

    var body: some View {
        HStack(alignment: .top, spacing: Spacing.lg) {
            EventosCalendarGridSeam()
                .frame(maxWidth: .infinity, alignment: .leading)
            EventosFilteredListSeam(vm: vm)
                .frame(maxWidth: .infinity, alignment: .trailing)
        }
        .padding()
    }
}

/// Stack layout (compact width): calendar grid ABOVE, filtered events list
/// BELOW — iPhone.
private struct EventosCalendarioStack: View {
    let vm: EventListViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.lg) {
            EventosCalendarGridSeam()
            EventosFilteredListSeam(vm: vm)
        }
        .padding()
    }
}

// MARK: - Seam regions (placeholders — replaced in 4.3 / Phase 6)

/// Placeholder calendar-grid region. Renders a fixed 7-column grid of day
/// numbers under a "Calendario" header. Deterministic (no `Date` logic, no
/// `EventKit`, no locale drift) so the snapshot is stable across runs. Task 4.3
/// swaps this for the real, moved `CalendarGridView` (status dots, blocked
/// dates, accessibility, day-tap/long-press).
private struct EventosCalendarGridSeam: View {
    private let columns = Array(repeating: GridItem(.flexible(), spacing: 4), count: 7)
    private let days = Array(1...28)

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text("Calendario")
                .font(.headline)
                .foregroundStyle(SolennixColors.text)
            LazyVGrid(columns: columns, spacing: 4) {
                ForEach(days, id: \.self) { day in
                    Text("\(day)")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 6)
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(SolennixColors.surfaceGrouped)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}

/// Placeholder filtered-events-list region. Renders an "Eventos" header and one
/// row per event in `vm.filteredEvents` (service type + event date). It is
/// data-driven from the shared ViewModel so BOTH modes read the same events —
/// the single-ViewModel invariant from ADR-7. Task 4.3 swaps the row for the
/// reused `eventCard` (NOT a distinct `eventRowContent`).
private struct EventosFilteredListSeam: View {
    let vm: EventListViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text("Eventos")
                .font(.headline)
                .foregroundStyle(SolennixColors.text)
            ForEach(vm.filteredEvents) { event in
                HStack {
                    Text(event.serviceType)
                        .font(.subheadline)
                        .foregroundStyle(SolennixColors.text)
                    Spacer()
                    Text(event.eventDate)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                }
                .padding(.vertical, 4)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(SolennixColors.surfaceGrouped)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }
}
