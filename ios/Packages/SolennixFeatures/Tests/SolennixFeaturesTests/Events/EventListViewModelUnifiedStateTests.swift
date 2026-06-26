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
}
