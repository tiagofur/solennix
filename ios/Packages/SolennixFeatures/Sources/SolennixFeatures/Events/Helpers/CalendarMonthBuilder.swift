import Foundation

// MARK: - CalendarMonthBuilder

/// Pure builder for a calendar month grid. Extracted verbatim from
/// `EventListViewModel.daysInMonth` so the events list AND the event form's
/// date picker share ONE source of truth for the month layout (DRY —
/// AGENTS.md hard rule).
///
/// Every grid cell `Date` is built from the supplied `calendar` (default
/// `Calendar.current`) anchored at LOCAL midnight, so it represents a LOCAL
/// calendar day. Consumers that need a `yyyy-MM-dd` key for a cell MUST use a
/// LOCAL POSIX formatter (see `EventListViewModel.gridApiDateFormatter` /
/// `EventFormViewModel.pickerGridApiDateFormatter`) — never a UTC one — to
/// stay symmetric with how `isDateBlocked`/`unavailableDateFor` compare.
///
/// Behavior is byte-identical to the pre-extraction
/// `EventListViewModel.daysInMonth`; verified by `CalendarMonthBuilderTests`.
public enum CalendarMonthBuilder {

    /// Builds the `[DateDay]` array for the month containing `month`, with
    /// leading empty slots so the first day aligns to the correct weekday
    /// column. The locale-aware offset matches `CalendarGridView`'s header
    /// rotation (`calendar.firstWeekday`).
    ///
    /// - Parameters:
    ///   - month: any date inside the target month (anchored to month start
    ///     internally).
    ///   - selected: the currently selected day, used to flag `isSelected` on
    ///     the matching cell. Pass `nil` for no selection.
    ///   - calendar: the calendar to derive components/weekday offsets from.
    ///     Defaults to `Calendar.current` to preserve pre-extraction behavior.
    /// - Returns: the ordered day cells for the grid (leading blanks are
    ///   previous-month days with `isCurrentMonth == false`).
    public static func daysInMonth(month: Date, selected: Date?, calendar: Calendar = .current) -> [DateDay] {
        let components = calendar.dateComponents([.year, .month], from: month)
        guard let firstOfMonth = calendar.date(from: components),
              let range = calendar.range(of: .day, in: .month, for: firstOfMonth)
        else { return [] }

        let rawWeekday = calendar.component(.weekday, from: firstOfMonth)
        let leadingBlanks = (rawWeekday - calendar.firstWeekday + 7) % 7

        let today = Date()
        let todayComponents = calendar.dateComponents([.year, .month, .day], from: today)
        let selectedComponents: DateComponents? = selected.map {
            calendar.dateComponents([.year, .month, .day], from: $0)
        }

        var days: [DateDay] = []

        if leadingBlanks > 0 {
            guard let lastDayPrev = calendar.date(byAdding: .day, value: -1, to: firstOfMonth),
                  let prevMonthRange = calendar.range(of: .day, in: .month, for: lastDayPrev)
            else { return [] }
            for i in 0..<leadingBlanks {
                let dayNum = prevMonthRange.upperBound - leadingBlanks + i
                if let date = calendar.date(byAdding: .day, value: -(leadingBlanks - i), to: firstOfMonth) {
                    days.append(DateDay(
                        date: date,
                        dayNumber: dayNum,
                        isCurrentMonth: false,
                        isToday: false,
                        isSelected: false
                    ))
                }
            }
        }

        for day in range {
            var dayComponents = components
            dayComponents.day = day
            guard let date = calendar.date(from: dayComponents) else { continue }

            let dc = calendar.dateComponents([.year, .month, .day], from: date)
            let isToday = dc.year == todayComponents.year
                && dc.month == todayComponents.month
                && dc.day == todayComponents.day
            let isSelected: Bool = {
                guard let sc = selectedComponents else { return false }
                return dc.year == sc.year && dc.month == sc.month && dc.day == sc.day
            }()

            days.append(DateDay(
                date: date,
                dayNumber: day,
                isCurrentMonth: true,
                isToday: isToday,
                isSelected: isSelected
            ))
        }

        return days
    }
}
