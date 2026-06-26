import XCTest
import SolennixCore
import SolennixNetwork
@testable import SolennixFeatures

/// Task 3.3 — unified `EventListViewModel` state (ADR-7): the `Lista`/`Calendario`
/// modes share ONE filter surface. A day-tap and a period chip BOTH write the
/// same `dateRange*` pair (so `filteredEvents` stays a single code path), and
/// each clears the other's selection (mutual-clearing invariant).
///
/// `viewMode` itself lives on the VIEW (default `.lista`, not persisted) — it is
/// presentation only and never reloads data; that is asserted in Phase 4, not
/// here. These tests cover the VM state + setters the view will wire up.
final class EventListViewModelUnifiedStateTests: XCTestCase {

    // MARK: - Helpers

    private func vm() -> EventListViewModel {
        EventListViewModel(apiClient: APIClient(), eventRepository: nil)
    }

    private func date(_ year: Int, _ month: Int, _ day: Int) -> Date {
        var comps = DateComponents()
        comps.year = year
        comps.month = month
        comps.day = day
        return Calendar.current.date(from: comps)!
    }

    private func startOfDay(_ d: Date) -> Date {
        Calendar.current.startOfDay(for: d)
    }

    // MARK: - EventPeriodFilter enum

    func testEventPeriodFilterExposesFourCases() {
        XCTAssertEqual(EventPeriodFilter.allCases, [.today, .thisWeek, .thisMonth, .custom])
    }

    // MARK: - new state surface

    func testInitialUnifiedStateDefaults() {
        let vm = vm()
        XCTAssertNil(vm.selectedDay, "selectedDay defaults nil")
        XCTAssertNil(vm.periodFilter, "periodFilter defaults nil")
        XCTAssertTrue(vm.unavailableDates.isEmpty, "unavailableDates defaults empty")
        XCTAssertFalse(vm.isBlockingDate, "isBlockingDate defaults false")
        XCTAssertNil(vm.calendarError, "calendarError defaults nil")
        // currentMonth anchors to the start of the current month (from CalendarViewModel).
        let now = Date()
        let expected = Calendar.current.date(from: Calendar.current.dateComponents([.year, .month], from: now)) ?? now
        XCTAssertEqual(vm.currentMonth, expected, "currentMonth defaults to the start of the current month")
    }

    // MARK: - day-tap filter + selectedDay

    func testSelectDateSetsDayRangeAndClearsPeriod() {
        let vm = vm()
        let day = date(2026, 6, 15)
        // Pre-seed a period so we can prove it is cleared.
        vm.setPeriodFilter(.thisWeek)

        vm.selectDate(day)

        XCTAssertEqual(vm.selectedDay, day, "day-tap records the selected day")
        XCTAssertNil(vm.periodFilter, "day-tap clears the period filter")
        XCTAssertEqual(vm.dateRangeStart, startOfDay(day), "day-tap range starts at the day's start")
        XCTAssertEqual(vm.dateRangeEnd, startOfDay(day), "day-tap range ends at the same day (single-day range)")
    }

    // MARK: - Hoy / Semana / Mes set bounded ranges from Calendar.current

    func testSetPeriodTodayBoundedToToday() {
        let vm = vm()
        // Pre-seed a selectedDay so we can prove it is cleared.
        vm.selectDate(date(2026, 6, 15))

        vm.setPeriodFilter(.today)

        XCTAssertEqual(vm.periodFilter, .today)
        XCTAssertNil(vm.selectedDay, "a period chip clears the selected day")
        XCTAssertEqual(vm.dateRangeStart, startOfDay(Date()), "Hoy starts at today's start-of-day")
        XCTAssertEqual(vm.dateRangeEnd, startOfDay(Date()), "Hoy ends at today's start-of-day")
    }

    func testSetPeriodThisWeekBoundedToCurrentWeek() {
        let vm = vm()
        let cal = Calendar.current
        let weekInterval = cal.dateInterval(of: .weekOfYear, for: Date())!

        vm.setPeriodFilter(.thisWeek)

        XCTAssertEqual(vm.periodFilter, .thisWeek)
        XCTAssertNil(vm.selectedDay)
        XCTAssertEqual(vm.dateRangeStart, weekInterval.start, "Semana starts at the first day of the current week")
        // dateRangeEnd is the INCLUSIVE last day (filteredEvents treats it as the
        // last day to include); the week interval's end is exclusive (next week),
        // so the last day is end - 1 day.
        let expectedEnd = cal.date(byAdding: .day, value: -1, to: weekInterval.end)
        XCTAssertEqual(vm.dateRangeEnd, expectedEnd, "Semana ends at the inclusive last day of the current week")
    }

    func testSetPeriodThisMonthBoundedToCurrentMonth() {
        let vm = vm()
        let cal = Calendar.current
        let monthInterval = cal.dateInterval(of: .month, for: Date())!

        vm.setPeriodFilter(.thisMonth)

        XCTAssertEqual(vm.periodFilter, .thisMonth)
        XCTAssertNil(vm.selectedDay)
        XCTAssertEqual(vm.dateRangeStart, monthInterval.start)
        let expectedEnd = cal.date(byAdding: .day, value: -1, to: monthInterval.end)
        XCTAssertEqual(vm.dateRangeEnd, expectedEnd, "Mes ends at the inclusive last day of the current month")
    }

    // MARK: - Personalizado (custom) start-then-end two-tap range

    func testCustomRangeStartThenEndTwoTap() {
        let vm = vm()
        let a = date(2026, 6, 10)
        let b = date(2026, 6, 20)

        // First tap: start.
        vm.selectCustomRangeStart(a)
        XCTAssertEqual(vm.periodFilter, .custom, "start tap activates the custom period")
        XCTAssertNil(vm.selectedDay, "custom range clears the selected day")
        XCTAssertEqual(vm.dateRangeStart, startOfDay(a), "start tap records the range start")
        XCTAssertNil(vm.dateRangeEnd, "end is pending until the second tap")

        // Second tap: end.
        vm.selectCustomRangeEnd(b)
        XCTAssertEqual(vm.periodFilter, .custom)
        XCTAssertEqual(vm.dateRangeStart, startOfDay(a), "start is retained after the end tap")
        XCTAssertEqual(vm.dateRangeEnd, startOfDay(b), "end tap records the range end")
    }

    // MARK: - mutual-clearing invariant

    func testPeriodChipAndDayTapAreMutuallyExclusive() {
        let vm = vm()
        let day = date(2026, 6, 15)

        // Day-tap then chip → chip wins, day cleared.
        vm.selectDate(day)
        vm.setPeriodFilter(.today)
        XCTAssertEqual(vm.periodFilter, .today)
        XCTAssertNil(vm.selectedDay)

        // Chip then day-tap → day wins, period cleared.
        vm.selectDate(day)
        XCTAssertNil(vm.periodFilter, "a day-tap clears the active period chip")
        XCTAssertEqual(vm.selectedDay, day)
    }

    // MARK: - both surfaces write the SAME dateRange* pair (single filter code path)

    func testDayTapAndPeriodShareTheDateRangeSurface() {
        let vm = vm()

        vm.selectDate(date(2026, 6, 15))
        let dayStart = vm.dateRangeStart
        let dayEnd = vm.dateRangeEnd

        // A period chip overwrites the same dateRange* properties the day-tap
        // wrote — there is no separate "day filter" vs "period filter" range.
        vm.setPeriodFilter(.today)
        XCTAssertNotEqual(vm.dateRangeStart, dayStart, "period chip rewrites the shared dateRangeStart")
        XCTAssertNotEqual(vm.dateRangeEnd, dayEnd)
    }

    // MARK: - Month navigation (CalendarViewModel parity)

    /// Anchor helper: pins `currentMonth` to the start of an arbitrary month so
    /// the navigation assertions are deterministic (independent of `Date()`).
    private func anchorMonth(_ vm: EventListViewModel, _ year: Int, _ month: Int) {
        vm.currentMonth = date(year, month, 1)
    }

    func testGoToNextMonthAdvancesExactlyOneMonth() {
        let vm = vm()
        anchorMonth(vm, 2026, 6)

        vm.goToNextMonth()

        XCTAssertEqual(vm.currentMonth, date(2026, 7, 1), "goToNextMonth advances exactly one month, staying at month start")
    }

    func testGoToNextMonthCarriesTheYearAcrossDecember() {
        let vm = vm()
        anchorMonth(vm, 2026, 12)

        vm.goToNextMonth()

        XCTAssertEqual(vm.currentMonth, date(2027, 1, 1), "advancing from December rolls into January of the next year")
    }

    func testGoToPreviousMonthGoesBackExactlyOneMonth() {
        let vm = vm()
        anchorMonth(vm, 2026, 7)

        vm.goToPreviousMonth()

        XCTAssertEqual(vm.currentMonth, date(2026, 6, 1), "goToPreviousMonth goes back exactly one month, staying at month start")
    }

    func testGoToPreviousMonthCarriesTheYearBackFromJanuary() {
        let vm = vm()
        anchorMonth(vm, 2026, 1)

        vm.goToPreviousMonth()

        XCTAssertEqual(vm.currentMonth, date(2025, 12, 1), "going back from January rolls into December of the previous year")
    }

    func testGoToTodayResetsCurrentMonthToTheStartOfTheCurrentMonth() {
        let vm = vm()
        // Move the grid far away so "Today" is observably different.
        anchorMonth(vm, 2020, 3)

        vm.goToToday()

        let cal = Calendar.current
        let expected = cal.date(from: cal.dateComponents([.year, .month], from: Date())) ?? Date()
        XCTAssertEqual(vm.currentMonth, expected, "goToToday snaps currentMonth back to the start of the real current month")
    }

    func testGoToNextMonthClearsSelectedDay() {
        let vm = vm()
        anchorMonth(vm, 2026, 6)
        vm.selectDate(date(2026, 6, 15)) // establishes a non-nil selectedDay

        XCTAssertNotNil(vm.selectedDay)

        vm.goToNextMonth()

        XCTAssertNil(vm.selectedDay, "navigating months must drop the stale day selection")
    }

    func testGoToPreviousMonthClearsSelectedDay() {
        let vm = vm()
        anchorMonth(vm, 2026, 6)
        vm.selectDate(date(2026, 6, 15))

        vm.goToPreviousMonth()

        XCTAssertNil(vm.selectedDay, "navigating months must drop the stale day selection")
    }

    func testGoToTodayClearsSelectedDay() {
        let vm = vm()
        anchorMonth(vm, 2026, 6)
        vm.selectDate(date(2026, 6, 15))

        vm.goToToday()

        XCTAssertNil(vm.selectedDay, "snapping to Today must drop the stale day selection")
    }

    func testRepeatedMonthNavigationIsCommutative() {
        // next then previous returns to the origin (no drift / no skipped month).
        let vm = vm()
        anchorMonth(vm, 2026, 6)

        vm.goToNextMonth()
        vm.goToPreviousMonth()

        XCTAssertEqual(vm.currentMonth, date(2026, 6, 1), "next-then-previous is a no-op on currentMonth")
    }

    // MARK: - Phase 5 UX: clearable chips + deselectable day + mode-switch reset

    /// Cambio 2 — tapping the ALREADY-ACTIVE period chip clears it (Apple HIG
    /// clearable chip). `setPeriodFilter(.today)` twice MUST leave `periodFilter`
    /// nil and the shared range empty.
    func testSetPeriodToggleClearsFilterWhenSamePeriodTappedAgain() {
        let vm = vm()

        vm.setPeriodFilter(.today)
        XCTAssertEqual(vm.periodFilter, .today, "precondition: first tap activates the chip")

        // Tap the SAME chip again → toggle off.
        vm.setPeriodFilter(.today)

        XCTAssertNil(vm.periodFilter, "tapping the active chip again clears it")
        XCTAssertNil(vm.dateRangeStart, "toggling off clears the shared range start")
        XCTAssertNil(vm.dateRangeEnd, "toggling off clears the shared range end")
        XCTAssertNil(vm.selectedDay, "toggling off leaves no selected day")
    }

    /// Triangulation for Cambio 2: a DIFFERENT chip still activates normally
    /// (the toggle only fires when re-tapping the active one).
    func testSetPeriodToggleDoesNotFireForADifferentPeriod() {
        let vm = vm()

        vm.setPeriodFilter(.today)
        vm.setPeriodFilter(.thisMonth)

        XCTAssertEqual(vm.periodFilter, .thisMonth, "switching to a different chip activates it (no toggle-off)")
        XCTAssertNotNil(vm.dateRangeStart, "the new chip recomputes the range")
    }

    /// Cambio 2 — the toggle works for every bounded chip (thisWeek), not just hoy.
    func testSetPeriodToggleClearsFilterWhenSameWeekTappedAgain() {
        let vm = vm()
        vm.setPeriodFilter(.thisWeek)
        vm.setPeriodFilter(.thisWeek)

        XCTAssertNil(vm.periodFilter, "re-tapping Esta semana clears it")
        XCTAssertNil(vm.dateRangeStart)
        XCTAssertNil(vm.dateRangeEnd)
    }

    /// Cambio 4 — tapping the ALREADY-SELECTED day clears it and restores the
    /// full-month view (Apple Calendar pattern: the list follows the grid).
    func testSelectDateToggleClearsDayWhenSameDayTappedAgain() {
        let vm = vm()
        anchorMonth(vm, 2026, 6)
        let day = date(2026, 6, 15)

        vm.selectDate(day)
        XCTAssertEqual(vm.selectedDay, day, "precondition: first tap selects the day")

        // Tap the SAME day again → deselect.
        vm.selectDate(day)

        XCTAssertNil(vm.selectedDay, "tapping the selected day again clears it")
        XCTAssertNil(vm.periodFilter, "deselecting leaves no period chip")
        // After deselect, the list is bounded to the grid's visible month.
        XCTAssertEqual(vm.dateRangeStart, date(2026, 6, 1), "deselecting restores month start")
        XCTAssertEqual(vm.dateRangeEnd, date(2026, 6, 30), "deselecting restores month end")
    }

    /// Triangulation for Cambio 4: a DIFFERENT day still selects normally.
    func testSelectDateToggleDoesNotFireForADifferentDay() {
        let vm = vm()
        let first = date(2026, 6, 15)
        let second = date(2026, 6, 20)

        vm.selectDate(first)
        vm.selectDate(second)

        XCTAssertEqual(vm.selectedDay, second, "tapping a different day selects it (no toggle-off)")
        XCTAssertEqual(vm.dateRangeStart, startOfDay(second))
    }

    /// Cambio 3 — entering `.lista` clears the calendar's day selection + the
    /// range it imposed (so the list is not pinned on a stale day).
    func testClearFiltersForListaClearsSelectedDayAndItsRange() {
        let vm = vm()
        // Establish a calendar day selection (sets selectedDay + dateRange to it).
        vm.selectDate(date(2026, 6, 15))
        XCTAssertEqual(vm.selectedDay, date(2026, 6, 15), "precondition")

        vm.clearFiltersForViewMode(.lista)

        XCTAssertNil(vm.selectedDay, "entering Lista clears the selected day")
        XCTAssertNil(vm.dateRangeStart, "entering Lista clears the day's imposed range start")
        XCTAssertNil(vm.dateRangeEnd, "entering Lista clears the day's imposed range end")
    }

    /// Cambio 3 — entering `.calendario` clears any period-chip filter and
    /// bounds the list to the grid's visible month (Apple Calendar: list follows
    /// grid).
    func testClearFiltersForCalendarioClearsPeriodAndBoundsToMonth() {
        let vm = vm()
        anchorMonth(vm, 2026, 6)
        // Establish a period chip (sets periodFilter + dateRange to the period).
        vm.setPeriodFilter(.thisMonth)
        XCTAssertEqual(vm.periodFilter, .thisMonth, "precondition")

        vm.clearFiltersForViewMode(.calendario)

        XCTAssertNil(vm.periodFilter, "entering Calendario clears the period chip")
        // The list is bounded to the grid's month, not cleared to nil.
        XCTAssertEqual(vm.dateRangeStart, date(2026, 6, 1), "entering Calendario bounds to month start")
        XCTAssertEqual(vm.dateRangeEnd, date(2026, 6, 30), "entering Calendario bounds to month end")
    }

    /// Cambio 3 — `clearFiltersForViewMode` must NEVER touch `events`/`currentMonth`
    /// (switching modes is presentational only, ADR-7). Guards against a reset
    /// that accidentally drops data.
    func testClearFiltersForViewModeNeverTouchesEventsOrCurrentMonth() {
        let vm = vm()
        anchorMonth(vm, 2026, 6)
        let monthAnchor = vm.currentMonth

        vm.clearFiltersForViewMode(.lista)
        vm.clearFiltersForViewMode(.calendario)

        XCTAssertEqual(vm.currentMonth, monthAnchor, "mode-switch reset must not move the grid month")
        XCTAssertTrue(vm.events.isEmpty, "mode-switch reset must not mutate events")
    }
}
