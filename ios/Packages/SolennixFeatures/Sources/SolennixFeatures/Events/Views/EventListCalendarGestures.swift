import Foundation

// MARK: - EventListCalendarGestures (Task 4.4 / ADR-7 / ADR-8)

/// Stateless gesture-wiring seam for the unified Eventos `.calendario` grid.
///
/// Maps the two DISTINCT `CalendarGridView` gestures to their unified-ViewModel
/// actions while GUARANTEEING they cannot trigger each other:
///   • `handleTap(_:)`       → `viewModel.selectDate(day)`
///                              (applies the single-day filter: sets `selectedDay`,
///                               bounds `dateRange*` to that day, clears the
///                               active period chip — the shared-filter invariant
///                               from task 3.3)
///   • `handleLongPress(_:)` → opens `BlockDateSheet` for the day WITHOUT
///                              calling `selectDate`
///
/// Satisfies the "Calendar Day Interactions" requirement of the
/// `events-calendar` delta:
///   - Day tap filters events to that day.
///   - Day long-press opens `BlockDateSheet` for an `UnavailableDate`.
///   - The two gestures MUST NOT trigger each other.
///
/// `CalendarGridView` already routes the gestures through separate UIKit
/// channels (`onTapGesture` → `onSelectDate`; a
/// `simultaneousGesture(LongPressGesture(minimumDuration: 0.5))` → the optional
/// `onLongPressDate`). This seam holds NO state of its own — it only forwards
/// each callback to exactly one action. Because long-press routes ONLY through
/// `handleLongPress` (which never calls `selectDate`), the gesture-separation
/// invariant holds by construction and is unit-assertable at the ViewModel
/// level without driving real UIKit gestures (ADR-8 seam philosophy, mirroring
/// the 4.2 toggle + 4.3 cell-builder seams).
///
/// The block-sheet presentation itself is supplied by the caller (the View) via
/// `presentBlockSheet`, so the seam stays free of SwiftUI presentation state and
/// stays trivially testable.
struct EventListCalendarGestures {

    /// The single ViewModel backing both Lista and Calendario (ADR-7).
    let viewModel: EventListViewModel

    /// Called by `handleLongPress` to open `BlockDateSheet` for the pressed day.
    /// The View supplies this (it owns the presentation anchor); the seam itself
    /// never touches SwiftUI sheet state.
    let presentBlockSheet: (Date) -> Void

    /// Day-tap: apply the single-day filter. Delegates to the shared-filter
    /// invariant setter so Lista + Calendario stay one code path (ADR-7).
    func handleTap(_ day: Date) {
        viewModel.selectDate(day)
    }

    /// Day long-press: open `BlockDateSheet` for the pressed day.
    ///
    /// IMPORTANT: this MUST NOT call `selectDate`. A long-press is a distinct
    /// gesture from a tap — applying the day-tap filter as a side effect would
    /// violate "the two gestures MUST NOT trigger each other". The ViewModel's
    /// `selectedDay` / `dateRange*` / `periodFilter` are intentionally left
    /// untouched here; only the block-sheet presentation flips.
    func handleLongPress(_ day: Date) {
        presentBlockSheet(day)
    }
}
