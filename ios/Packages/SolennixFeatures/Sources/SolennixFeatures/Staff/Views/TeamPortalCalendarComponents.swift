import SwiftUI
import SolennixCore
import SolennixDesign

// MARK: - TeamPortalCalendarDayCell

/// One tappable day cell with up to 3 status dots.
struct TeamPortalCalendarDayCell: View {
    let day: TeamPortalCalendarDay
    let dots: [AssignmentStatus]
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 4) {
                ZStack {
                    if day.isSelected {
                        Circle()
                            .fill(SolennixColors.primary)
                            .frame(width: 30, height: 30)
                    } else if day.isToday {
                        Circle()
                            .stroke(SolennixColors.primary, lineWidth: 1.5)
                            .frame(width: 30, height: 30)
                    }

                    Text("\(day.dayNumber)")
                        .font(.subheadline)
                        .fontWeight(day.isSelected || day.isToday ? .semibold : .regular)
                        .foregroundStyle(dayNumberColor)
                }

                HStack(spacing: 3) {
                    ForEach(Array(dots.enumerated()), id: \.offset) { _, status in
                        Circle()
                            .fill(dotColor(for: status))
                            .frame(width: 5, height: 5)
                            .accessibilityHidden(true)
                    }
                }
                .frame(height: 6)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 44)
        }
        .buttonStyle(.plain)
        .opacity(day.isCurrentMonth ? 1 : 0.35)
        // VoiceOver: status dots are color-only (PRODUCT.md forbids color as
        // sole indicator). Announce the day number + selection state + the
        // assignment status names instead of unlabeled dots.
        .accessibilityLabel(accessibilityLabel)
        .accessibilityValue(accessibilityValue)
    }

    private var accessibilityLabel: String {
        var parts = [teamPortalTr("team_portal.day_a11y", "Día \(day.dayNumber)")]
        if day.isToday { parts.append(teamPortalTr("calendar.today", "Hoy")) }
        if day.isSelected { parts.append(teamPortalTr("team_portal.selected_a11y", "Seleccionado")) }
        return parts.joined(separator: ", ")
    }

    private var accessibilityValue: String {
        guard !dots.isEmpty else { return "" }
        return dots.map(statusName).joined(separator: ", ")
    }

    private func statusName(_ status: AssignmentStatus) -> String {
        switch status {
        case .pending: return teamPortalTr("team_portal.pending", "Pendiente")
        case .confirmed: return teamPortalTr("team_portal.confirmed", "Confirmada")
        case .declined: return teamPortalTr("team_portal.declined", "Rechazada")
        case .cancelled: return teamPortalTr("team_portal.cancelled", "Cancelada")
        }
    }

    private var dayNumberColor: Color {
        if day.isSelected {
            return .white
        }
        if !day.isCurrentMonth {
            return SolennixColors.textTertiary
        }
        if day.isToday {
            return SolennixColors.primary
        }
        return SolennixColors.text
    }

    private func dotColor(for status: AssignmentStatus) -> Color {
        switch status {
        case .pending:
            return SolennixColors.warning
        case .confirmed:
            return SolennixColors.success
        case .declined:
            return SolennixColors.error
        case .cancelled:
            return SolennixColors.textSecondary
        }
    }
}

// MARK: - TeamPortalMonthCalendarView

/// The month-mode calendar grid with header navigation and weekday symbols.
struct TeamPortalMonthCalendarView: View {
    @Binding var displayedMonth: Date
    @Binding var selectedDate: Date
    let statusDotsByDate: [Date: [AssignmentStatus]]

    var body: some View {
        VStack(spacing: Spacing.md) {
            HStack {
                Button {
                    displayedMonth = Calendar.current.addingMonths(-1, to: displayedMonth)
                } label: {
                    Image(systemName: "chevron.left")
                }
                .accessibilityLabel(teamPortalTr("calendar.previous_month", "Mes anterior"))

                Spacer()

                Text(teamPortalMonthLabel(for: displayedMonth))
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(SolennixColors.text)

                Spacer()

                Button {
                    displayedMonth = Calendar.current.addingMonths(1, to: displayedMonth)
                } label: {
                    Image(systemName: "chevron.right")
                }
                .accessibilityLabel(teamPortalTr("calendar.next_month", "Mes siguiente"))
            }

            HStack {
                ForEach(teamPortalWeekdaySymbols, id: \.self) { symbol in
                    Text(symbol)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(SolennixColors.textSecondary)
                        .frame(maxWidth: .infinity)
                }
            }

            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 6), count: 7), spacing: 8) {
                ForEach(teamPortalMonthDays(displayedMonth: displayedMonth, selectedDate: selectedDate)) { day in
                    TeamPortalCalendarDayCell(
                        day: day,
                        dots: statusDotsByDate[day.date] ?? [],
                        onTap: {
                            selectedDate = day.date
                            displayedMonth = Calendar.current.startOfMonth(for: day.date)
                        }
                    )
                }
            }
        }
        .padding(Spacing.lg)
        .frame(maxWidth: .infinity, alignment: .leading)
        .solennixCard(radius: CornerRadius.lg, border: false)
    }
}

// MARK: - TeamPortalWeekCalendarView

/// The week-mode calendar grouped by day.
struct TeamPortalWeekCalendarView: View {
    let weekAssignments: [(day: Date, items: [TeamMemberAssignment])]
    let onTapRow: (Date, TeamMemberAssignment) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text(teamPortalTr("team_portal.week", "Semana"))
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(SolennixColors.textSecondary)

            ForEach(weekAssignments, id: \.day) { item in
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    Text(teamPortalDayHeaderLabel(item.day))
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(SolennixColors.textSecondary)

                    if item.items.isEmpty {
                        Text(teamPortalTr("team_portal.no_assignments", "Sin asignaciones"))
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textTertiary)
                    } else {
                        ForEach(item.items) { assignment in
                            TeamPortalTimelineRow(
                                assignment: assignment,
                                timeRange: teamPortalTimeRangeLabel(for: assignment)
                            ) {
                                onTapRow(item.day, assignment)
                            }
                        }
                    }
                }
            }
        }
        .padding(Spacing.lg)
        .frame(maxWidth: .infinity, alignment: .leading)
        .solennixCard(radius: CornerRadius.lg, border: false)
    }
}

// MARK: - TeamPortalDayCalendarView

/// The day-mode calendar for the selected date.
struct TeamPortalDayCalendarView: View {
    let selectedDate: Date
    let assignments: [TeamMemberAssignment]
    let onTapRow: (TeamMemberAssignment) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text(teamPortalSelectedDateLabel(for: selectedDate))
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(SolennixColors.textSecondary)

            if assignments.isEmpty {
                Text(teamPortalTr("team_portal.no_assignments_day", "No hay asignaciones para este día."))
                    .font(.subheadline)
                    .foregroundStyle(SolennixColors.textSecondary)
            } else {
                ForEach(assignments) { assignment in
                    TeamPortalTimelineRow(
                        assignment: assignment,
                        timeRange: teamPortalTimeRangeLabel(for: assignment)
                    ) {
                        onTapRow(assignment)
                    }
                }
            }
        }
        .padding(Spacing.lg)
        .frame(maxWidth: .infinity, alignment: .leading)
        .solennixCard(radius: CornerRadius.lg, border: false)
    }
}
