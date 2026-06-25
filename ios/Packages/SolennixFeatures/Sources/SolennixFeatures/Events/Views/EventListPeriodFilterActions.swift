import Foundation

// MARK: - EventListPeriodFilterActions (ADR-8 seam, task 4.5)

/// Stateless seam that maps the four period-filter chips
/// (`Hoy · Esta semana · Este mes · Personalizado`) to the EXISTING
/// `EventListViewModel` setters from task 3.3.
///
/// Mirrors the `EventosViewModeToggle` / `EventListCalendarGestures` seam
/// philosophy (ADR-8): it holds NO SwiftUI presentation state of its own, so the
/// chip→setter binding is trivially unit-testable without driving UIKit gestures.
/// Both `.lista` and `.calendario` modes render the SAME chip row
/// (`EventListPeriodFilterBar`) and route every tap through here, so a period
/// chip and a calendar day-tap remain mutually exclusive against the SAME
/// `dateRange*` surface — the shared-filter invariant from 3.3.
///
/// Routing (spec "Period Date-Range Filter Chips"):
///   • `selectChip(.today / .thisWeek / .thisMonth)` → `setPeriodFilter(_:)`
///       (recomputes the range from `Calendar.current`, clears `selectedDay`).
///   • `selectChip(.custom)`                        → `setPeriodFilter(.custom)`
///       (clears the shared range so re-tapping resets cleanly) AND flips the
///       view's custom-range picker via `presentCustomRangePicker`.
///   • `commitCustomRange(start:end:)`              → `selectCustomRangeStart`
///       then `selectCustomRangeEnd` (the spec's "two sequential taps →
///       `[start, end]` inclusive"; the VM setters order + clamp the bounds).
struct EventListPeriodFilterActions {
    /// The unified ViewModel both modes read from (ADR-7).
    let viewModel: EventListViewModel
    /// Flips view-side presentation state for the custom-range picker. Kept on
    /// the VIEW (not the VM) so this seam stays stateless and testable.
    let presentCustomRangePicker: () -> Void

    /// Chip tap. The three bounded chips recompute the date range from
    /// `Calendar.current` and clear `selectedDay`; `Personalizado` enters custom
    /// mode and asks the view to present the start-then-end picker.
    func selectChip(_ filter: EventPeriodFilter) {
        viewModel.setPeriodFilter(filter)
        if filter == .custom {
            presentCustomRangePicker()
        }
    }

    /// Two-tap custom range commit: records start then end on the VM via the
    /// dedicated 3.3 setters. Spec: "selects `Personalizado`, taps a start date,
    /// then taps an end date → the filter MUST span `[start, end]` inclusive".
    /// `selectCustomRangeStart` sets `.custom` + the start; `selectCustomRangeEnd`
    /// sets the end (ordering/clamping live in the VM).
    func commitCustomRange(start: Date, end: Date) {
        viewModel.selectCustomRangeStart(start)
        viewModel.selectCustomRangeEnd(end)
    }
}
