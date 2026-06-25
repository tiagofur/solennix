import SwiftUI
import SolennixCore
import SolennixDesign

// MARK: - EventosViewModeToggle (ADR-7)

/// `Lista | Calendario` segmented toggle for the unified Eventos content header.
///
/// Deliberately ViewModel-free: it holds ONLY a `Binding<EventosViewMode>`, so a
/// flip can structurally never reload events or drop a selection (ADR-7).
/// `viewMode` is `@State` on `EventListView` (default `.lista`, NOT persisted
/// via `@AppStorage`); this component just renders + writes that single piece of
/// view-local state through the binding it is given. Both Lista and Calendario
/// modes read the SAME `EventListViewModel` — switching modes only swaps the
/// rendered subtree, never the data.
///
/// Task 4.3 replaces the Calendario placeholder body (the `EventosLayoutFactory`
/// seam) with the real, moved `CalendarGridView` + the reused `eventCard`.
struct EventosViewModeToggle: View {

    @Binding var viewMode: EventosViewMode

    init(viewMode: Binding<EventosViewMode>) {
        self._viewMode = viewMode
    }

    var body: some View {
        Picker(
            FeatureL10n.text("events.list.view_mode.accessibility", "Modo de vista"),
            selection: $viewMode
        ) {
            Text(FeatureL10n.text("events.list.view_mode.lista", "Lista"))
                .tag(EventosViewMode.lista)
            Text(FeatureL10n.text("events.list.view_mode.calendario", "Calendario"))
                .tag(EventosViewMode.calendario)
        }
        .pickerStyle(.segmented)
        .tint(SolennixColors.primary)
        .accessibilityHint(FeatureL10n.text(
            "events.list.view_mode.accessibility_hint",
            "Cambia entre la lista y el calendario de eventos"
        ))
    }
}
