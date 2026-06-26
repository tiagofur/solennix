import SwiftUI
import SolennixCore
import SolennixDesign

// MARK: - EventosAppBarFilter (task 4.6, ADR-8 seam)

/// The filter affordances the Eventos app bar renders (task 4.6).
///
/// SINGLE source of truth: `EventListView`'s shared trailing toolbar builds its
/// filter items by iterating `EventosAppBarFilter.allCases` (a `ForEach` over the
/// cases), so a filter appears in the rendered app bar IF AND ONLY IF its case is
/// present here. This turns the spec scenario "App bar exposes only the status
/// filter" into a structural invariant — the legacy `calendar` date-range filter
/// button cannot reappear in either `.lista` or `.calendario` (the toolbar is
/// shared by both modes) unless `.calendar` is added back to this enum.
///
/// Spec "Events App Bar" (MODIFIED): keep the status filter, REMOVE the
/// `calendar` filter button — the content-header `Lista | Calendario` toggle +
/// the period chips (task 4.5) are the sole calendar entry, so a second
/// date-range button in the app bar was redundant.
enum EventosAppBarFilter: String, CaseIterable, Equatable {

    /// Status filter (Todos / Cotizado / Confirmado / Completado / Cancelado),
    /// rendered by `EventosStatusFilterMenu`.
    case status

    // `.calendar` was intentionally REMOVED (task 4.6). It presented the legacy
    // `DateFilterSheet` (a from/until date range) which is now superseded by the
    // content-header view toggle + the `Hoy · Esta semana · Este mes ·
    // Personalizado` period chips. Re-adding `.calendar` here is the ONLY way a
    // calendar filter button can return to the app bar — the test
    // `testAppBarExposesOnlyStatusFilter` guards against that.
}

// MARK: - EventosStatusFilterMenu (task 4.6, ADR-8 seam)

/// The status filter Menu exposed by the Eventos app bar (task 4.6).
///
/// Extracted from `EventListView`'s trailing toolbar so the app bar's status
/// filter is a named, snapshot-testable component — mirroring the seam
/// philosophy of `EventosViewModeToggle` / `EventListPeriodFilterBar`. It binds
/// the unified ViewModel's `selectedStatus` and lists each status with its live
/// count. Deliberately stateless: it is a pure projection of the
/// `(selectedStatus, statusFilters)` it is given, so it can be exercised in
/// isolation without the app environment.
///
/// This is the ONLY filter rendered under `EventosAppBarFilter.allCases`, hence
/// the sole filter affordance in the app bar (spec "Events App Bar").
struct EventosStatusFilterMenu: View {

    @Binding var selectedStatus: EventStatus?
    let statusFilters: [(status: EventStatus?, label: String, count: Int)]

    init(
        selectedStatus: Binding<EventStatus?>,
        statusFilters: [(status: EventStatus?, label: String, count: Int)]
    ) {
        self._selectedStatus = selectedStatus
        self.statusFilters = statusFilters
    }

    var body: some View {
        Menu {
            Picker(
                FeatureL10n.text("events.list.toolbar.status_filter", "Estado"),
                selection: $selectedStatus
            ) {
                ForEach(statusFilters, id: \.label) { filter in
                    Text("\(filter.label) (\(filter.count))")
                        .tag(filter.status)
                }
            }
            .pickerStyle(.inline)
        } label: {
            Image(
                systemName: selectedStatus != nil
                    ? "line.3.horizontal.decrease.circle.fill"
                    : "line.3.horizontal.decrease.circle"
            )
            .font(.body)
            .foregroundStyle(SolennixColors.primary)
            .symbolEffect(.bounce, value: selectedStatus)
            .accessibilityLabel(
                FeatureL10n.text(
                    "events.list.toolbar.status_filter_accessibility",
                    "Filtrar por estado"
                )
            )
        }
    }
}
