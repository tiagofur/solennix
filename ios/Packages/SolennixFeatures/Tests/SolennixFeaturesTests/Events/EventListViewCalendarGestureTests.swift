import XCTest
import SolennixCore
import SolennixNetwork
@testable import SolennixFeatures

/// Task 4.4 — "Calendar Day Interactions" (`events-calendar` delta).
///
/// Spec scenario:
///   Day tap filters events to that day
///     GIVEN Eventos in `.calendario` with events spanning multiple days
///     WHEN  the user taps a day that has events
///     THEN  the filtered list MUST show only events whose date equals the tapped day
///     AND   `selectedDay` on the ViewModel MUST equal the tapped date
///
///   Day long-press opens BlockDateSheet
///     GIVEN Eventos in `.calendario`
///     WHEN  the user performs a long-press (≥ minimum duration) on a day cell
///     THEN  `BlockDateSheet` MUST open for that day
///     AND   the day-tap filter MUST NOT be applied as a side effect
///
/// How this is enforced structurally (ADR-8 seam philosophy):
/// `CalendarGridView` already routes the two gestures through SEPARATE UIKit
/// channels — `onTapGesture` fires `onSelectDate`, while a
/// `simultaneousGesture(LongPressGesture(minimumDuration: 0.5))` fires the
/// OPTIONAL `onLongPressDate`. Task 4.4 wires `EventListView.calendarioGrid`
/// callbacks through `EventListCalendarGestures`, a stateless seam that maps
/// each gesture to its unified-ViewModel action while GUARANTEEING they cannot
/// reach each other:
///   • `handleTap(_:)`       → `viewModel.selectDate(day)` (single-day filter)
///   • `handleLongPress(_:)` → opens `BlockDateSheet` for the day WITHOUT
///                             calling `selectDate`
///
/// Because long-press routes ONLY through `handleLongPress` (which never calls
/// `selectDate`), the gesture-separation invariant holds by construction. These
/// tests pin that contract at the ViewModel level — no UIKit gesture driving
/// required — following the same callback-wiring assertion style as 4.2.
final class EventListViewCalendarGestureTests: XCTestCase {

    // MARK: - Helpers

    private func makeViewModel() -> EventListViewModel {
        EventListViewModel(apiClient: APIClient(), eventRepository: nil)
    }

    /// A deterministic day (local-midnight) so the assertions never depend on
    /// `Date()`. Mirrors the grid's device-local cell `Date` convention.
    private func day(_ year: Int, _ month: Int, _ day: Int) -> Date {
        Calendar.current.date(from: DateComponents(year: year, month: month, day: day))!
    }

    // MARK: - Tap applies the single-day filter

    func testHandleTapAppliesSingleDayFilter() {
        let vm = makeViewModel()
        let gestures = EventListCalendarGestures(
            viewModel: vm,
            presentBlockSheet: { _ in }
        )
        let tapped = day(2026, 6, 15)

        // Preconditions: nothing selected, no period chip, no date range.
        XCTAssertNil(vm.selectedDay)
        XCTAssertNil(vm.periodFilter)
        XCTAssertNil(vm.dateRangeStart)
        XCTAssertNil(vm.dateRangeEnd)

        gestures.handleTap(tapped)

        // Tap MUST set selectedDay to the tapped day...
        XCTAssertEqual(vm.selectedDay, tapped)
        // ...clear any active period chip (mutual-clearing invariant from 3.3)...
        XCTAssertNil(vm.periodFilter)
        // ...and bound the shared date range to that single day's start-of-day,
        // so `filteredEvents` narrows to the tapped day (the filter is shared by
        // Lista + Calendario — ADR-7).
        let startOfDay = Calendar.current.startOfDay(for: tapped)
        XCTAssertEqual(vm.dateRangeStart, startOfDay)
        XCTAssertEqual(vm.dateRangeEnd, startOfDay)
    }

    // MARK: - Long-press opens the block sheet WITHOUT applying the day filter

    func testHandleLongPressOpensBlockSheetWithoutChangingSelectedDay() {
        let vm = makeViewModel()
        var presentedDay: Date? = nil
        let gestures = EventListCalendarGestures(
            viewModel: vm,
            presentBlockSheet: { day in presentedDay = day }
        )
        let longPressed = day(2026, 6, 20)

        XCTAssertNil(vm.selectedDay)

        gestures.handleLongPress(longPressed)

        // The block-sheet presentation state flips for the pressed day...
        XCTAssertEqual(presentedDay, longPressed)
        // ...and the day-tap filter MUST NOT be applied as a side effect
        // (the two gestures do not trigger each other).
        XCTAssertNil(vm.selectedDay)
        XCTAssertNil(vm.dateRangeStart)
        XCTAssertNil(vm.dateRangeEnd)
        XCTAssertNil(vm.periodFilter)
    }

    // MARK: - Triangulation: long-press does not disturb an existing tap selection

    func testLongPressDoesNotDisturbExistingTapSelection() {
        let vm = makeViewModel()
        var presentedDay: Date? = nil
        let gestures = EventListCalendarGestures(
            viewModel: vm,
            presentBlockSheet: { day in presentedDay = day }
        )
        let tapped = day(2026, 6, 15)
        let longPressed = day(2026, 6, 20)

        // Establish a tap selection first.
        gestures.handleTap(tapped)
        XCTAssertEqual(vm.selectedDay, tapped)

        // Long-press a DIFFERENT day.
        gestures.handleLongPress(longPressed)

        // The block sheet opens for the long-pressed day...
        XCTAssertEqual(presentedDay, longPressed)
        // ...and the existing tap selection is left untouched — a long-press
        // cannot trigger the tap filter (no mutual trigger).
        XCTAssertEqual(vm.selectedDay, tapped)
    }
}
