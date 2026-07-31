import Foundation
import SolennixCore

/// Team Portal date / calendar helpers shared across the portal sub-components.
///
/// All helpers here are internal (not private) so the sibling component files
/// can reference them without duplicating logic. Mirrors the convention used by
/// the Events feature's component decomposition.

// MARK: - Localization helper

func teamPortalTr(_ key: String, _ value: String) -> String {
    FeatureL10n.text(key, value)
}

// MARK: - Calendar day model

/// One cell in the month grid.
struct TeamPortalCalendarDay: Identifiable {
    let date: Date
    let dayNumber: Int
    let isCurrentMonth: Bool
    let isToday: Bool
    let isSelected: Bool

    var id: Date { date }
}

// MARK: - Date parsing

/// Parses a `"yyyy-MM-dd"` server day string into a `Date` (current calendar).
func teamPortalParseLocalDate(_ value: String) -> Date? {
    let parts = value.split(separator: "-").compactMap { Int($0) }
    guard parts.count == 3 else { return nil }
    return Calendar.current.date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2]))
}

/// Parses an ISO-8601 timestamp or a `"yyyy-MM-dd HH:mm:ss"` server value into a `Date`.
func teamPortalParseDateTime(_ raw: String) -> Date? {
    if let date = ISO8601DateFormatter().date(from: raw) {
        return date
    }

    let fallback = DateFormatter()
    fallback.locale = Locale(identifier: "en_US_POSIX")
    fallback.dateFormat = "yyyy-MM-dd HH:mm:ss"
    return fallback.date(from: raw)
}

// MARK: - Assignment grouping / sorting

/// Groups assignments by their start-of-day event date.
func teamPortalAssignmentsByDate(_ assignments: [TeamMemberAssignment]) -> [Date: [TeamMemberAssignment]] {
    var grouped: [Date: [TeamMemberAssignment]] = [:]

    for assignment in assignments {
        guard let assignmentDate = teamPortalParseLocalDate(assignment.eventDate) else { continue }
        let day = Calendar.current.startOfDay(for: assignmentDate)
        grouped[day, default: []].append(assignment)
    }

    return grouped
}

/// Up to 3 ordered status dots per day, used by the month grid cells.
func teamPortalStatusDotsByDate(_ grouped: [Date: [TeamMemberAssignment]]) -> [Date: [AssignmentStatus]] {
    grouped.mapValues { assignments in
        var ordered: [AssignmentStatus] = []

        for status in [AssignmentStatus.pending, .confirmed, .declined, .cancelled] {
            if assignments.contains(where: { $0.status == status }) {
                ordered.append(status)
            }
        }

        for assignment in assignments where !ordered.contains(assignment.status) {
            ordered.append(assignment.status)
        }

        return Array(ordered.prefix(3))
    }
}

/// Sorts assignments by shift start time (falling back to event date / event name).
func teamPortalCompareAssignmentsByShift(_ lhs: TeamMemberAssignment, _ rhs: TeamMemberAssignment) -> Bool {
    let left = teamPortalShiftSortDate(for: lhs)
    let right = teamPortalShiftSortDate(for: rhs)
    if left != right {
        return left < right
    }
    return lhs.eventName < rhs.eventName
}

func teamPortalShiftSortDate(for assignment: TeamMemberAssignment) -> Date {
    if let shiftStart = assignment.shiftStart, let parsed = teamPortalParseDateTime(shiftStart) {
        return parsed
    }
    if let eventDate = teamPortalParseLocalDate(assignment.eventDate) {
        return eventDate
    }
    return .distantFuture
}

/// Formats the shift time range for an assignment (`"HH:mm - HH:mm"`), or nil.
func teamPortalTimeRangeLabel(for assignment: TeamMemberAssignment) -> String? {
    guard let startRaw = assignment.shiftStart,
          let endRaw = assignment.shiftEnd,
          let start = teamPortalParseDateTime(startRaw),
          let end = teamPortalParseDateTime(endRaw)
    else { return nil }

    let formatter = DateFormatter()
    formatter.locale = Locale.current
    formatter.dateFormat = "HH:mm"
    return "\(formatter.string(from: start)) - \(formatter.string(from: end))"
}

// MARK: - Label formatting

/// `"LLLL yyyy"` month label for the calendar header.
func teamPortalMonthLabel(for displayedMonth: Date) -> String {
    let formatter = DateFormatter()
    formatter.locale = Locale.current
    formatter.dateFormat = "LLLL yyyy"
    return formatter.string(from: displayedMonth).capitalized
}

/// `"EEEE d MMMM"` label for the selected day.
func teamPortalSelectedDateLabel(for selectedDate: Date) -> String {
    let formatter = DateFormatter()
    formatter.locale = Locale.current
    formatter.dateFormat = "EEEE d MMMM"
    return formatter.string(from: selectedDate).capitalized
}

/// `"EEE d"` header label used by the week view.
func teamPortalDayHeaderLabel(_ date: Date) -> String {
    let formatter = DateFormatter()
    formatter.locale = Locale.current
    formatter.dateFormat = "EEE d"
    return formatter.string(from: date).capitalized
}

// MARK: - Calendar grid building

/// Weekday symbols rotated to start on the user's `calendar.firstWeekday`.
var teamPortalWeekdaySymbols: [String] {
    let calendar = Calendar.current
    let formatter = DateFormatter()
    formatter.locale = Locale.current
    let symbols = formatter.shortStandaloneWeekdaySymbols ?? formatter.shortWeekdaySymbols ?? ["L", "M", "M", "J", "V", "S", "D"]
    let shift = max(0, min(symbols.count - 1, calendar.firstWeekday - 1))
    return Array(symbols[shift...]) + Array(symbols[..<shift])
}

/// 6x7 grid of calendar days anchored on `displayedMonth`, highlighting `selectedDate`.
func teamPortalMonthDays(displayedMonth: Date, selectedDate: Date) -> [TeamPortalCalendarDay] {
    let calendar = Calendar.current
    let firstDay = calendar.startOfMonth(for: displayedMonth)
    let firstWeekdayOfMonth = calendar.component(.weekday, from: firstDay)
    let leadingDays = (firstWeekdayOfMonth - calendar.firstWeekday + 7) % 7

    var days: [TeamPortalCalendarDay] = []

    if let startDay = calendar.date(byAdding: .day, value: -leadingDays, to: firstDay) {
        for offset in 0..<42 {
            guard let date = calendar.date(byAdding: .day, value: offset, to: startDay) else { continue }
            let normalizedDate = calendar.startOfDay(for: date)
            days.append(
                TeamPortalCalendarDay(
                    date: normalizedDate,
                    dayNumber: calendar.component(.day, from: normalizedDate),
                    isCurrentMonth: calendar.isDate(normalizedDate, equalTo: displayedMonth, toGranularity: .month),
                    isToday: calendar.isDateInToday(normalizedDate),
                    isSelected: calendar.isDate(normalizedDate, inSameDayAs: selectedDate)
                )
            )
        }
    }

    return days
}

// MARK: - Calendar helpers (internal so they are not duplicated across files)

extension Calendar {
    func startOfMonth(for date: Date) -> Date {
        let components = dateComponents([.year, .month], from: date)
        return self.date(from: components) ?? date
    }

    func addingMonths(_ value: Int, to date: Date) -> Date {
        self.date(byAdding: .month, value: value, to: date) ?? date
    }

    func startOfWeek(for date: Date) -> Date {
        let components = dateComponents([.yearForWeekOfYear, .weekOfYear], from: date)
        return self.date(from: components) ?? startOfDay(for: date)
    }
}
