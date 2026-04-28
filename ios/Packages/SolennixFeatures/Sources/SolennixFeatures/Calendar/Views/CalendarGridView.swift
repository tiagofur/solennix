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
        let cal = Calendar.autoupdatingCurrent
        // DateFormatter.shortWeekdaySymbols is Sunday-first; rotate to the
        // locale's first weekday (1=Sun, 2=Mon) minus one for zero-index.
        let formatter = DateFormatter()
        formatter.locale = Locale.autoupdatingCurrent
        let symbols = formatter.shortWeekdaySymbols ?? ["S", "M", "T", "W", "T", "F", "S"]
        let shift = cal.firstWeekday - 1
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
                        .fill(SolennixColors.primary)
                        .frame(width: 32, height: 32)
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
                Text(String(
                    format: String(localized: "calendar.overflow_more", bundle: .module),
                    overflow
                ))
                .font(.system(size: 8))
                .foregroundStyle(SolennixColors.textSecondary)
                .lineLimit(1)
            }
        }
        .frame(maxWidth: .infinity)
        .frame(height: 52)
        .contentShape(Rectangle())
    }

    private var dayTextColor: Color {
        if day.isSelected && day.isCurrentMonth {
            return .white
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
}

// MARK: - Preview

#Preview("Calendar Grid") {
    let today = Date()
    let calendar = Calendar.current
    let components = calendar.dateComponents([.year, .month], from: today)
    let firstOfMonth = calendar.date(from: components)!
    let range = calendar.range(of: .day, in: .month, for: firstOfMonth)!
    let firstWeekday = calendar.component(.weekday, from: firstOfMonth)
    let todayDay = calendar.component(.day, from: today)

    let days: [DateDay] = (1..<firstWeekday).map { offset in
        let date = calendar.date(byAdding: .day, value: -(firstWeekday - offset), to: firstOfMonth)!
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
