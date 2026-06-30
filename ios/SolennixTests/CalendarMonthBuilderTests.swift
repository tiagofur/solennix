import XCTest
import Foundation
@testable import SolennixFeatures

/// Regression coverage for the shared `CalendarMonthBuilder` extracted from
/// `EventListViewModel.daysInMonth` (T1). Guards the leading-blank formula,
/// the today/selected flags, the `firstWeekday` offset, and TZ-stable
/// local-midnight cells.
final class CalendarMonthBuilderTests: XCTestCase {

    // Calendar pinned to a timezone + firstWeekday so assertions are
    // deterministic regardless of the test host's region/device timezone.
    private func makeCalendar(firstWeekday: Int = 1) -> Calendar {
        var c = Calendar(identifier: .gregorian)
        c.firstWeekday = firstWeekday
        c.timeZone = TimeZone(identifier: "America/Mexico_City")!
        return c
    }

    private func firstOfMonth(_ year: Int, _ month: Int, _ cal: Calendar) -> Date {
        var dc = DateComponents()
        dc.year = year
        dc.month = month
        dc.day = 1
        return cal.date(from: dc)!
    }

    // MARK: - Structure

    func testJune2026_dayNumbersAreContiguousOneToThirty() {
        let cal = makeCalendar(firstWeekday: 1)
        let month = firstOfMonth(2026, 6, cal)
        let days = CalendarMonthBuilder.daysInMonth(month: month, selected: nil, calendar: cal)
        let current = days.filter { $0.isCurrentMonth }

        XCTAssertEqual(current.count, 30, "June 2026 has 30 days")
        XCTAssertEqual(current.map { $0.dayNumber }, Array(1...30), "day numbers must be 1..30 in order")
    }

    func testJune2026_sundayFirst_hasOneLeadingBlankAtMay31() {
        // June 1 2026 is a Monday (Foundation weekday=2). With firstWeekday=1
        // (Sunday), leading blanks = (2-1+7)%7 = 1, and that single blank is
        // the previous day: May 31 2026.
        let cal = makeCalendar(firstWeekday: 1)
        let month = firstOfMonth(2026, 6, cal)
        let days = CalendarMonthBuilder.daysInMonth(month: month, selected: nil, calendar: cal)
        let blanks = days.filter { !$0.isCurrentMonth }

        XCTAssertEqual(blanks.count, 1)
        XCTAssertEqual(blanks.first?.dayNumber, 31)
        XCTAssertEqual(localDayString(blanks.first!.date, cal), "2026-05-31")
    }

    func testJune2026_mondayFirst_hasNoLeadingBlanks() {
        // With firstWeekday=2 (Monday), June 1 (Monday) lands in column 0 -> 0 blanks.
        let cal = makeCalendar(firstWeekday: 2)
        let month = firstOfMonth(2026, 6, cal)
        let days = CalendarMonthBuilder.daysInMonth(month: month, selected: nil, calendar: cal)

        XCTAssertTrue(days.allSatisfy { $0.isCurrentMonth }, "no leading/trailing blanks expected")
        XCTAssertEqual(days.count, 30)
    }

    // MARK: - Selection + today flags

    func testSelectedFlagOnlyOnMatchingCalendarDay() {
        let cal = makeCalendar(firstWeekday: 1)
        let month = firstOfMonth(2026, 6, cal)
        var sel = DateComponents()
        sel.year = 2026
        sel.month = 6
        sel.day = 15
        let selected = cal.date(from: sel)!

        let days = CalendarMonthBuilder.daysInMonth(month: month, selected: selected, calendar: cal)
        let selectedCells = days.filter { $0.isSelected }

        XCTAssertEqual(selectedCells.count, 1)
        XCTAssertEqual(selectedCells.first?.dayNumber, 15)
        XCTAssertTrue(selectedCells.first?.isCurrentMonth ?? false)
    }

    func testSelectedInDifferentMonth_doesNotFlagAnyCurrentCell() {
        let cal = makeCalendar(firstWeekday: 1)
        let month = firstOfMonth(2026, 6, cal)
        var sel = DateComponents()
        sel.year = 2026
        sel.month = 7
        sel.day = 4
        let selected = cal.date(from: sel)!

        let days = CalendarMonthBuilder.daysInMonth(month: month, selected: selected, calendar: cal)
        XCTAssertEqual(days.filter { $0.isSelected }.count, 0)
    }

    func testTodayFlagAtMostOnce() {
        let cal = Calendar.current
        let month = cal.date(from: cal.dateComponents([.year, .month], from: Date())) ?? Date()
        let days = CalendarMonthBuilder.daysInMonth(month: month, selected: nil)
        let todays = days.filter { $0.isToday }
        XCTAssertLessThanOrEqual(todays.count, 1)
    }

    // MARK: - TZ stability: cells are local-midnight (no UTC shift)

    func testEveryCurrentMonthCellIsLocalMidnight() {
        let cal = makeCalendar(firstWeekday: 1)
        let month = firstOfMonth(2026, 6, cal)
        let days = CalendarMonthBuilder.daysInMonth(month: month, selected: nil, calendar: cal)
        for cell in days where cell.isCurrentMonth {
            let comps = cal.dateComponents([.hour, .minute, .second], from: cell.date)
            XCTAssertEqual(comps.hour, 0)
            XCTAssertEqual(comps.minute, 0)
            XCTAssertEqual(comps.second, 0)
        }
    }

    // MARK: - Default-calendar path (used in production)

    func testDefaultCalendarProducesNonEmptyGrid() {
        let cal = Calendar.current
        let month = cal.date(from: cal.dateComponents([.year, .month], from: Date())) ?? Date()
        let days = CalendarMonthBuilder.daysInMonth(month: month, selected: nil)
        XCTAssertFalse(days.isEmpty)
    }

    // MARK: - Helpers

    private func localDayString(_ date: Date, _ cal: Calendar) -> String {
        let f = DateFormatter()
        f.calendar = cal
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = cal.timeZone
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: date)
    }
}
