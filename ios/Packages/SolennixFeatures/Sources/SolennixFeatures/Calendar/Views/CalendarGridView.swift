import SwiftUI
import SolennixCore
import SolennixDesign

// MARK: - Calendar Grid View

/// Reusable 7-column calendar grid component that renders day cells with event dots.
public struct CalendarGridView: View {

    // MARK: - Properties

    let days: [DateDay]
    let eventDotsForDay: (Date) -> [EventStatus]
    let eventOverflowForDay: (Date) -> Int
    let isDateBlocked: (Date) -> Bool
    let selectedDate: Date?
    let onSelectDate: (Date) -> Void
    let onLongPressDate: ((Date) -> Void)?

    // MARK: - Constants

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 2), count: 7)
    /// Weekday headers localized via Calendar so they follow the device
    /// language (es → "lun mar mié", en → "Mon Tue Wed"). The ordering
    /// also respects the locale's `firstWeekday` so Monday-first locales
    /// get the right layout.
    private var weekdaySymbols: [String] {
        // Fix #10: source symbols from the locale-aware calendar (not a throwaway
        // DateFormatter) — Calendar.shortWeekdaySymbols already respects the
        // calendar's locale. Both this computed property and the ViewModel's
        // `calendar` use FeatureL10n.locale so firstWeekday values agree.
        var cal = Calendar.current
        cal.locale = FeatureL10n.locale
        let symbols = cal.shortWeekdaySymbols   // always length 7, Sunday at index 0
        let shift = cal.firstWeekday - 1        // 0 for Sunday-first, 1 for Monday-first
        return Array(symbols[shift...]) + Array(symbols[..<shift])
    }

    // MARK: - Init

    public init(
        days: [DateDay],
        eventDotsForDay: @escaping (Date) -> [EventStatus],
        // BEFORE: eventCountForDay (total count, used wrongly for overflow calculation as `-3`)
        // AFTER: eventOverflowForDay (pre-calculated by ViewModel: total - min(unique_statuses, 3))
        eventOverflowForDay: @escaping (Date) -> Int = { _ in 0 },
        isDateBlocked: @escaping (Date) -> Bool = { _ in false },
        selectedDate: Date?,
        onSelectDate: @escaping (Date) -> Void,
        onLongPressDate: ((Date) -> Void)? = nil
    ) {
        self.days = days
        self.eventDotsForDay = eventDotsForDay
        self.eventOverflowForDay = eventOverflowForDay
        self.isDateBlocked = isDateBlocked
        self.selectedDate = selectedDate
        self.onSelectDate = onSelectDate
        self.onLongPressDate = onLongPressDate
    }

    // MARK: - Body

    public var body: some View {
        VStack(spacing: Spacing.sm) {
            // Weekday headers
            LazyVGrid(columns: columns, spacing: 2) {
                ForEach(weekdaySymbols, id: \.self) { symbol in
                    Text(symbol)
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundStyle(SolennixColors.textSecondary)
                        .frame(maxWidth: .infinity)
                }
            }

            // Day cells
            LazyVGrid(columns: columns, spacing: 2) {
                ForEach(days) { day in
                    DayCellView(
                        day: day,
                        dots: day.isCurrentMonth ? eventDotsForDay(day.date) : [],
                        overflow: day.isCurrentMonth ? max(0, eventOverflowForDay(day.date)) : 0,
                        isBlocked: day.isCurrentMonth ? isDateBlocked(day.date) : false
                    )
                    .onTapGesture {
                        guard day.isCurrentMonth else { return }
                        withAnimation(.easeInOut(duration: 0.2)) {
                            onSelectDate(day.date)
                        }
                    }
                    .simultaneousGesture(
                        LongPressGesture(minimumDuration: 0.5)
                            .onEnded { _ in
                                guard day.isCurrentMonth else { return }
                                onLongPressDate?(day.date)
                            }
                    )
                }
            }
        }
    }
}

// MARK: - Day Cell View

private struct DayCellView: View {
    let day: DateDay
    let dots: [EventStatus]
    /// Events beyond the 3 status dots we render. When > 0 we show a
    /// "+N" caption below the dots so the user knows the day is busier
    /// than the dot row suggests.
    let overflow: Int
    let isBlocked: Bool

    var body: some View {
        VStack(spacing: 3) {
            // Day number with selection/today indicator
            ZStack {
                // Blocked date background
                if isBlocked && day.isCurrentMonth && !day.isSelected {
                    Circle()
                        .fill(SolennixColors.error.opacity(0.15))
                        .frame(width: 32, height: 32)
                }

                if day.isSelected && day.isCurrentMonth {
                    Circle()
                        .fill(SolennixColors.primaryLight.opacity(0.55))
                        .frame(width: 32, height: 32)
                        .overlay(
                            Circle()
                                .stroke(SolennixColors.primary.opacity(0.75), lineWidth: 1.5)
                        )
                } else if day.isToday && day.isCurrentMonth {
                    Circle()
                        .stroke(SolennixColors.primary, lineWidth: 1.5)
                        .frame(width: 32, height: 32)
                }

                Text("\(day.dayNumber)")
                    .font(.subheadline)
                    .fontWeight(day.isToday ? .bold : .regular)
                    .foregroundStyle(dayTextColor)
                    .strikethrough(isBlocked && day.isCurrentMonth && !day.isSelected, color: SolennixColors.error.opacity(0.6))
            }
            .frame(width: 32, height: 32)

            // Event dots (up to 3). Parity with Android / Web — all three
            // show the dot row first.
            HStack(spacing: 2) {
                ForEach(Array(dots.enumerated()), id: \.offset) { _, status in
                    Circle()
                        .fill(colorForStatus(status))
                        .frame(width: 6, height: 6)
                }
            }
            .frame(height: 6)

            // "+N más" caption when the day has more events than the 3
            // rendered dots. Keeps the overflow signal visible without
            // expanding the grid cell height.
            if overflow > 0 {
                Text(CalendarStrings.overflowMore(overflow))
                    .font(.system(.caption2))
                    .foregroundStyle(SolennixColors.textSecondary)
                    .lineLimit(1)
            }
        }
        .frame(width: 32, height: 52)
        .contentShape(Rectangle())
        // G10 — accessibility label describing the day's full state:
        // e.g. "15 de marzo, 2 eventos, confirmado y cotizado"
        .accessibilityLabel(accessibilityLabelForDay)
    }

    private var dayTextColor: Color {
        if day.isSelected && day.isCurrentMonth {
            return SolennixColors.primary
        }
        if !day.isCurrentMonth {
            return SolennixColors.textTertiary
        }
        if isBlocked {
            return SolennixColors.error.opacity(0.7)
        }
        return SolennixColors.text
    }

    private func colorForStatus(_ status: EventStatus) -> Color {
        switch status {
        case .quoted: return SolennixColors.statusQuoted
        case .confirmed: return SolennixColors.statusConfirmed
        case .completed: return SolennixColors.statusCompleted
        case .cancelled: return SolennixColors.statusCancelled
        }
    }

    // Fix #5 & #10: human-readable accessibility label for the day cell.
    // Prepend the day date ("15 de junio") so VoiceOver users know which cell.
    // Format: "15 de junio, confirmado y cotizado"
    //         "15 de junio, día bloqueado"
    //         "15 de junio, sin eventos"
    private var accessibilityLabelForDay: String {
        let dayLabel = Self.a11yDayFormatter.string(from: day.date)
        // Fix #10 (a11y list separator): use ListFormatter so the connector
        // ("y"/"and") is locale-appropriate rather than hardcoded " y ".
        if isBlocked {
            return "\(dayLabel), \(CalendarStrings.a11yDayBlocked)"
        }
        if dots.isEmpty {
            return "\(dayLabel), \(CalendarStrings.a11yDayNoEvents)"
        }
        let statusDescriptions: String
        if #available(iOS 15, *) {
            statusDescriptions = ListFormatter.localizedString(byJoining: dots.map { statusName(for: $0) })
        } else {
            statusDescriptions = dots.map { statusName(for: $0) }.joined(separator: ", ")
        }
        return "\(dayLabel), \(CalendarStrings.a11yDayWithEvents(dots.count)), \(statusDescriptions)"
    }

    // UTC display formatter so the day date in VoiceOver matches the server
    // date displayed in the cell (avoids a timezone-induced day mismatch).
    private static let a11yDayFormatter: DateFormatter = {
        let f = DateFormatter()
        f.locale = FeatureL10n.locale
        f.timeZone = TimeZone(secondsFromGMT: 0)
        f.setLocalizedDateFormatFromTemplate("dMMMM")
        return f
    }()

    private func statusName(for status: EventStatus) -> String {
        switch status {
        case .quoted: return CalendarStrings.statusQuoted
        case .confirmed: return CalendarStrings.statusConfirmed
        case .completed: return CalendarStrings.statusCompleted
        case .cancelled: return CalendarStrings.statusCancelled
        }
    }
}

// MARK: - Preview

#Preview("Calendar Grid") {
    let today = Date()
    let calendar = Calendar.current
    let components = calendar.dateComponents([.year, .month], from: today)
    let firstOfMonth = calendar.date(from: components)!
    let range = calendar.range(of: .day, in: .month, for: firstOfMonth)!
    let rawWeekday = calendar.component(.weekday, from: firstOfMonth)
    // Fix #1 (preview): use same locale-aware offset as ViewModel.daysInMonth.
    let leadingBlanks = (rawWeekday - calendar.firstWeekday + 7) % 7
    let todayDay = calendar.component(.day, from: today)

    let days: [DateDay] = (0..<leadingBlanks).map { offset in
        let date = calendar.date(byAdding: .day, value: -(leadingBlanks - offset), to: firstOfMonth)!
        let dayNum = calendar.component(.day, from: date)
        return DateDay(date: date, dayNumber: dayNum, isCurrentMonth: false, isToday: false, isSelected: false)
    } + range.map { day in
        var dc = components
        dc.day = day
        let date = calendar.date(from: dc)!
        return DateDay(
            date: date,
            dayNumber: day,
            isCurrentMonth: true,
            isToday: day == todayDay,
            isSelected: day == todayDay
        )
    }

    CalendarGridView(
        days: days,
        eventDotsForDay: { _ in [.confirmed, .quoted] },
        isDateBlocked: { date in
            let day = calendar.component(.day, from: date)
            return day == 10 || day == 15 || day == 20
        },
        selectedDate: today,
        onSelectDate: { _ in },
        onLongPressDate: { _ in }
    )
    .padding()
    .background(SolennixColors.surfaceGrouped)
}
