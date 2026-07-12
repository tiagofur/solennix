import SwiftUI
import Foundation
import SolennixCore
import SolennixDesign
import SolennixNetwork

private func tr(_ key: String, _ value: String) -> String {
    FeatureL10n.text(key, value)
}

public struct TeamMemberPortalView: View {

    private enum TeamMemberSection: String, CaseIterable, Identifiable {
        case work
        case calendar

        var id: String { rawValue }
    }

    private enum CalendarMode: String, CaseIterable, Identifiable {
        case month
        case week
        case day

        var id: String { rawValue }
    }

    @Environment(AuthManager.self) private var authManager
    @Environment(\.horizontalSizeClass) private var sizeClass
    @State private var viewModel: TeamMemberPortalViewModel
    @State private var section: TeamMemberSection = .work
    @State private var selectedDate: Date = Date()
    @State private var displayedMonth: Date = Calendar.current.startOfMonth(for: Date())
    @State private var calendarMode: CalendarMode = .month
    @State private var prioritizePendingInWork: Bool = false
    @State private var selectedAssignmentDetail: TeamMemberAssignment?
    @State private var availabilityStartDate: Date = Date()
    @State private var availabilityEndDate: Date = Date()
    @State private var availabilityStartTime: String = ""
    @State private var availabilityEndTime: String = ""
    @State private var availabilityReason: String = ""
    @State private var editingUnavailableID: String?

    public init(apiClient: APIClient) {
        _viewModel = State(initialValue: TeamMemberPortalViewModel(apiClient: apiClient))
    }

    public var body: some View {
        NavigationStack {
            content
                .navigationTitle(tr("team_portal.my_day", "Mi jornada"))
                .navigationBarTitleDisplayMode(.large)
                .toolbar {
                    ToolbarItem(placement: .topBarLeading) {
                        Button {
                            Task { await authManager.signOut() }
                        } label: {
                            Image(systemName: "rectangle.portrait.and.arrow.right")
                        }
                        .accessibilityLabel(tr("team_portal.close_session_a11y", "Cerrar sesion"))
                    }

                    ToolbarItem(placement: .topBarTrailing) {
                        Button {
                            Task { await viewModel.loadAssignments() }
                        } label: {
                            Image(systemName: "arrow.clockwise")
                        }
                        .accessibilityLabel(tr("team_portal.reload_a11y", "Recargar asignaciones"))
                    }
                }
        }
        .task {
            await viewModel.loadAssignments()
        }
        .refreshable {
            await viewModel.loadAssignments()
        }
        .sheet(item: $selectedAssignmentDetail) { assignment in
            TeamPortalAssignmentDetailSheet(assignment: assignment)
        }
        .background(SolennixColors.surfaceGrouped.ignoresSafeArea())
    }

    @ViewBuilder
    private var content: some View {
        if let errorMessage = viewModel.errorMessage, viewModel.assignments.isEmpty, !viewModel.isLoading {
            ContentUnavailableView {
                Label(tr("team_portal.load_error", "No pudimos cargar tus asignaciones"), systemImage: "exclamationmark.triangle")
            } description: {
                Text(errorMessage)
            } actions: {
                Button(tr("team_portal.retry", "Reintentar")) {
                    Task { await viewModel.loadAssignments() }
                }
            }
        } else if viewModel.isLoading && viewModel.assignments.isEmpty {
            ProgressView()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if viewModel.assignments.isEmpty {
            ContentUnavailableView {
                Label(tr("team_portal.empty_title", "Todavia no tenes asignaciones"), systemImage: "calendar.badge.clock")
            } description: {
                Text(tr("team_portal.empty_message", "Cuando te asignen a un evento, va a aparecer aca con respuesta rapida."))
            }
        } else {
            ScrollView {
                LazyVStack(spacing: Spacing.md) {
                    Picker(tr("team_portal.section_label", "Seccion"), selection: $section) {
                        Text(tr("team_portal.my_day", "Mi jornada")).tag(TeamMemberSection.work)
                        Text(tr("calendar.title", "Calendario")).tag(TeamMemberSection.calendar)
                    }
                    .pickerStyle(.segmented)

                    if section == .work {
                        workSection
                    } else {
                        calendarSection
                    }
                }
                .padding(.horizontal, sizeClass == .regular ? Spacing.xxxl : Spacing.xl)
                .padding(.vertical, Spacing.lg)
            }
        }
    }

    private var pendingAssignments: [TeamMemberAssignment] {
        viewModel.assignments.filter { $0.status == .pending }
    }

    private var isEditingAvailability: Bool {
        editingUnavailableID != nil
    }

    private func resetAvailabilityForm() {
        availabilityStartDate = Date()
        availabilityEndDate = Date()
        availabilityStartTime = ""
        availabilityEndTime = ""
        availabilityReason = ""
        editingUnavailableID = nil
    }

    private func startEditingAvailability(_ item: UnavailableDate) {
        editingUnavailableID = item.id
        if let start = parseLocalDate(item.startDate) {
            availabilityStartDate = start
        }
        if let end = parseLocalDate(item.endDate) {
            availabilityEndDate = end
        }
        availabilityStartTime = item.startTime ?? ""
        availabilityEndTime = item.endTime ?? ""
        availabilityReason = item.reason ?? ""
    }

    private var unreadTimelineCount: Int {
        viewModel.timeline.filter { $0.readAt == nil }.count
    }

    private var todayAssignments: [TeamMemberAssignment] {
        let today = Calendar.current.startOfDay(for: Date())
        return assignmentsByDate[today, default: []].sorted { $0.eventDate < $1.eventDate }
    }

    private var next7DaysAssignments: [TeamMemberAssignment] {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        guard let nextWeek = calendar.date(byAdding: .day, value: 7, to: today) else {
            return []
        }

        return viewModel.assignments
            .filter { assignment in
                guard let date = parseLocalDate(assignment.eventDate) else { return false }
                let day = calendar.startOfDay(for: date)
                return day > today && day <= nextWeek
            }
            .sorted { lhs, rhs in
                if lhs.eventDate != rhs.eventDate {
                    return lhs.eventDate < rhs.eventDate
                }
                return lhs.eventName < rhs.eventName
            }
    }

    private var selectedDayAssignments: [TeamMemberAssignment] {
        (assignmentsByDate[Calendar.current.startOfDay(for: selectedDate)] ?? []).sorted(by: compareAssignmentsByShift)
    }

    private var weekDays: [Date] {
        let calendar = Calendar.current
        let start = calendar.startOfWeek(for: selectedDate)
        return (0..<7).compactMap { calendar.date(byAdding: .day, value: $0, to: start) }
    }

    private var weekAssignments: [(day: Date, items: [TeamMemberAssignment])] {
        weekDays.map { day in
            let key = Calendar.current.startOfDay(for: day)
            let items = (assignmentsByDate[key] ?? []).sorted(by: compareAssignmentsByShift)
            return (day: day, items: items)
        }
    }

    private var assignmentsByDate: [Date: [TeamMemberAssignment]] {
        var grouped: [Date: [TeamMemberAssignment]] = [:]

        for assignment in viewModel.assignments {
            guard let assignmentDate = parseLocalDate(assignment.eventDate) else { continue }
            let day = Calendar.current.startOfDay(for: assignmentDate)
            grouped[day, default: []].append(assignment)
        }

        return grouped
    }

    private var statusDotsByDate: [Date: [AssignmentStatus]] {
        assignmentsByDate.mapValues { assignments in
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

    private var monthLabel: String {
        let formatter = DateFormatter()
        formatter.locale = Locale.current
        formatter.dateFormat = "LLLL yyyy"
        return formatter.string(from: displayedMonth).capitalized
    }

    private var selectedDateLabel: String {
        let formatter = DateFormatter()
        formatter.locale = Locale.current
        formatter.dateFormat = "EEEE d MMMM"
        return formatter.string(from: selectedDate).capitalized
    }

    private func compareAssignmentsByShift(_ lhs: TeamMemberAssignment, _ rhs: TeamMemberAssignment) -> Bool {
        let left = shiftSortDate(for: lhs)
        let right = shiftSortDate(for: rhs)
        if left != right {
            return left < right
        }
        return lhs.eventName < rhs.eventName
    }

    private func shiftSortDate(for assignment: TeamMemberAssignment) -> Date {
        if let shiftStart = assignment.shiftStart, let parsed = parseDateTime(shiftStart) {
            return parsed
        }
        if let eventDate = parseLocalDate(assignment.eventDate) {
            return eventDate
        }
        return .distantFuture
    }

    private func timeRangeLabel(for assignment: TeamMemberAssignment) -> String? {
        guard let startRaw = assignment.shiftStart,
              let endRaw = assignment.shiftEnd,
              let start = parseDateTime(startRaw),
              let end = parseDateTime(endRaw)
        else { return nil }

        let formatter = DateFormatter()
        formatter.locale = Locale.current
        formatter.dateFormat = "HH:mm"
        return "\(formatter.string(from: start)) - \(formatter.string(from: end))"
    }

    private func parseDateTime(_ raw: String) -> Date? {
        if let date = ISO8601DateFormatter().date(from: raw) {
            return date
        }

        let fallback = DateFormatter()
        fallback.locale = Locale(identifier: "en_US_POSIX")
        fallback.dateFormat = "yyyy-MM-dd HH:mm:ss"
        return fallback.date(from: raw)
    }

    private var weekdaySymbols: [String] {
        let calendar = Calendar.current
        let formatter = DateFormatter()
        formatter.locale = Locale.current
        let symbols = formatter.shortStandaloneWeekdaySymbols ?? formatter.shortWeekdaySymbols ?? ["L", "M", "M", "J", "V", "S", "D"]
        let shift = max(0, min(symbols.count - 1, calendar.firstWeekday - 1))
        return Array(symbols[shift...]) + Array(symbols[..<shift])
    }

    private var monthDays: [TeamPortalCalendarDay] {
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

    @ViewBuilder
    private var workSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack(spacing: Spacing.sm) {
                Button {
                    prioritizePendingInWork = false
                    let today = Date()
                    selectedDate = today
                    displayedMonth = Calendar.current.startOfMonth(for: today)
                    section = .calendar
                } label: {
                    Text(tr("team_portal.go_to_today", "Ir a agenda de hoy"))
                        .font(.footnote.weight(.semibold))
                }
                .buttonStyle(.bordered)

                Button {
                    prioritizePendingInWork = true
                    section = .work
                } label: {
                    Text(tr("team_portal.respond", "Responder asignaciones"))
                        .font(.footnote.weight(.semibold))
                }
                .buttonStyle(.borderedProminent)
            }

            if prioritizePendingInWork {
                pendingSection
                todaySection
                next7DaysSection
            } else {
                todaySection
                next7DaysSection
                pendingSection
            }

            timelineSection
            availabilitySection

        }
    }

    @ViewBuilder
    private var availabilitySection: some View {
        Text(tr("team_portal.my_availability", "Mi disponibilidad"))
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(SolennixColors.textSecondary)

        cardContainer {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                DatePicker(tr("calendar.block.start_date", "Desde"), selection: $availabilityStartDate, displayedComponents: .date)
                DatePicker(tr("calendar.block.end_date", "Hasta"), selection: $availabilityEndDate, in: availabilityStartDate..., displayedComponents: .date)
                TextField(tr("team_portal.start_time", "Hora inicio (HH:MM)"), text: $availabilityStartTime)
                    .textFieldStyle(.roundedBorder)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                TextField(tr("team_portal.end_time", "Hora fin (HH:MM)"), text: $availabilityEndTime)
                    .textFieldStyle(.roundedBorder)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                TextField(tr("calendar.block.reason_label", "Motivo (opcional)"), text: $availabilityReason)
                    .textFieldStyle(.roundedBorder)

                Button {
                    let formatter = DateFormatter()
                    formatter.calendar = Calendar(identifier: .gregorian)
                    formatter.locale = Locale(identifier: "en_US_POSIX")
                    formatter.dateFormat = "yyyy-MM-dd"
                    Task {
                        let trimmedReason = availabilityReason.trimmingCharacters(in: .whitespacesAndNewlines)
                        let normalizedStartTime = availabilityStartTime.trimmingCharacters(in: .whitespacesAndNewlines)
                        let normalizedEndTime = availabilityEndTime.trimmingCharacters(in: .whitespacesAndNewlines)
                        if let id = editingUnavailableID {
                            await viewModel.updateUnavailableDate(
                                id: id,
                                startDate: formatter.string(from: availabilityStartDate),
                                endDate: formatter.string(from: availabilityEndDate),
                                startTime: normalizedStartTime.isEmpty ? nil : normalizedStartTime,
                                endTime: normalizedEndTime.isEmpty ? nil : normalizedEndTime,
                                reason: trimmedReason.isEmpty ? nil : trimmedReason
                            )
                        } else {
                            await viewModel.createUnavailableDate(
                                startDate: formatter.string(from: availabilityStartDate),
                                endDate: formatter.string(from: availabilityEndDate),
                                startTime: normalizedStartTime.isEmpty ? nil : normalizedStartTime,
                                endTime: normalizedEndTime.isEmpty ? nil : normalizedEndTime,
                                reason: trimmedReason.isEmpty ? nil : trimmedReason
                            )
                        }
                        resetAvailabilityForm()
                    }
                } label: {
                    Text(isEditingAvailability ? tr("common.save_changes", "Guardar cambios") : tr("team_portal.block_dates", "Bloquear fechas"))
                        .font(.footnote.weight(.semibold))
                }
                .buttonStyle(.borderedProminent)
                .disabled(viewModel.isSavingAvailability)

                if isEditingAvailability {
                    Button {
                        resetAvailabilityForm()
                    } label: {
                        Text(tr("common.cancel", "Cancelar"))
                            .font(.footnote.weight(.semibold))
                    }
                    .buttonStyle(.bordered)
                    .disabled(viewModel.isSavingAvailability)
                }

                if viewModel.unavailableDates.isEmpty {
                    Text(tr("team_portal.no_blocks", "No tenes bloqueos cargados."))
                        .font(.subheadline)
                        .foregroundStyle(SolennixColors.textSecondary)
                } else {
                    ForEach(viewModel.unavailableDates.sorted(by: { $0.startDate < $1.startDate })) { item in
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("\(item.startDate) - \(item.endDate)")
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundStyle(SolennixColors.text)
                                if let startTime = item.startTime, let endTime = item.endTime {
                                    Text("\(startTime) - \(endTime)")
                                        .font(.caption)
                                        .foregroundStyle(SolennixColors.textSecondary)
                                }
                                if let reason = item.reason, !reason.isEmpty {
                                    Text(reason)
                                        .font(.caption)
                                        .foregroundStyle(SolennixColors.textSecondary)
                                }
                            }
                            Spacer()
                            Button {
                                startEditingAvailability(item)
                            } label: {
                                Text(tr("common.edit", "Editar"))
                                    .font(.caption.weight(.semibold))
                            }
                            .buttonStyle(.bordered)
                            .disabled(viewModel.isSavingAvailability)

                            Button(role: .destructive) {
                                Task { await viewModel.deleteUnavailableDate(id: item.id) }
                            } label: {
                                Text(tr("common.delete", "Eliminar"))
                                    .font(.caption.weight(.semibold))
                            }
                            .buttonStyle(.bordered)
                            .disabled(viewModel.isSavingAvailability)
                        }
                    }
                }
            }
        }
    }

    @ViewBuilder
    private var timelineSection: some View {
        HStack {
            Text(tr("team_portal.recent_changes", "Cambios recientes"))
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(SolennixColors.textSecondary)

            Spacer()

            Text("\(unreadTimelineCount)")
                .font(.caption.weight(.semibold))
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(SolennixColors.surfaceGrouped)
                .clipShape(Capsule())
                .foregroundStyle(SolennixColors.textSecondary)
        }

        if viewModel.timeline.isEmpty {
            cardContainer {
                Text(tr("team_portal.no_recent_changes", "Sin cambios recientes en tus asignaciones."))
                    .font(.subheadline)
                    .foregroundStyle(SolennixColors.textSecondary)
            }
        } else {
            ForEach(viewModel.timeline) { item in
                Button {
                    if item.readAt == nil {
                        Task { await viewModel.markTimelineRead(id: item.id) }
                    }
                    if let assignment = viewModel.assignments.first(where: { $0.eventStaffId == item.eventStaffId }) {
                        section = .calendar
                        if let date = parseLocalDate(assignment.eventDate) {
                            selectedDate = date
                            displayedMonth = Calendar.current.startOfMonth(for: date)
                        }
                        selectedAssignmentDetail = assignment
                    }
                } label: {
                    HStack(alignment: .top, spacing: Spacing.sm) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(item.eventName)
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(SolennixColors.text)
                            Text(timelineLabel(item.changeType))
                                .font(.caption)
                                .foregroundStyle(SolennixColors.textSecondary)
                            Text(item.eventDate)
                                .font(.caption)
                                .foregroundStyle(SolennixColors.textSecondary)
                        }

                        Spacer()

                        if item.readAt == nil {
                            Text(tr("common.new", "Nuevo"))
                                .font(.caption.weight(.semibold))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(SolennixColors.warning.opacity(0.18))
                                .foregroundStyle(SolennixColors.warning)
                                .clipShape(Capsule())
                        }
                    }
                    .padding(Spacing.md)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .solennixCard(radius: CornerRadius.lg, border: false)
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func timelineLabel(_ changeType: String) -> String {
        switch changeType {
        case "location_changed": return tr("team_portal.change_location", "Cambio de ubicación")
        case "role_changed": return tr("team_portal.change_role", "Cambio de rol")
        case "shift_changed": return tr("team_portal.change_shift", "Cambio de turno")
        case "status_changed": return tr("team_portal.change_status", "Cambio de estado")
        case "assignment_added": return tr("team_portal.new_assignment", "Nueva asignación")
        case "assignment_removed": return tr("team_portal.removed_assignment", "Asignación removida")
        default: return tr("team_portal.updated_assignment", "Actualización de asignación")
        }
    }

    @ViewBuilder
    private var pendingSection: some View {
        Text(tr("team_portal.pending_response", "Pendientes por responder"))
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(SolennixColors.textSecondary)

        if pendingAssignments.isEmpty {
            cardContainer {
                Text(tr("team_portal.no_invitations", "No tenes invitaciones pendientes."))
                    .font(.subheadline)
                    .foregroundStyle(SolennixColors.textSecondary)
            }
        } else {
            ForEach(pendingAssignments) { assignment in
                TeamMemberAssignmentCard(
                    assignment: assignment,
                    isResponding: viewModel.isResponding,
                    onAccept: {
                        Task { await viewModel.respond(to: assignment, response: .accept) }
                    },
                    onDecline: {
                        Task { await viewModel.respond(to: assignment, response: .decline) }
                    }
                )
            }
        }
    }

    @ViewBuilder
    private var todaySection: some View {
        Text(tr("calendar.today", "Hoy"))
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(SolennixColors.textSecondary)

        if todayAssignments.isEmpty {
            cardContainer {
                Text(tr("team_portal.no_today", "No tenes asignaciones para hoy."))
                    .font(.subheadline)
                    .foregroundStyle(SolennixColors.textSecondary)
            }
        } else {
            ForEach(todayAssignments) { assignment in
                TeamMemberAssignmentCard(
                    assignment: assignment,
                    isResponding: viewModel.isResponding,
                    onAccept: {
                        Task { await viewModel.respond(to: assignment, response: .accept) }
                    },
                    onDecline: {
                        Task { await viewModel.respond(to: assignment, response: .decline) }
                    }
                )
            }
        }
    }

    @ViewBuilder
    private var next7DaysSection: some View {
        Text(tr("team_portal.next_7_days", "Proximos 7 dias"))
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(SolennixColors.textSecondary)

        if next7DaysAssignments.isEmpty {
            cardContainer {
                Text(tr("team_portal.no_next_7", "No hay asignaciones en los proximos 7 dias."))
                    .font(.subheadline)
                    .foregroundStyle(SolennixColors.textSecondary)
            }
        } else {
            ForEach(next7DaysAssignments) { assignment in
                TeamMemberAssignmentCard(
                    assignment: assignment,
                    isResponding: viewModel.isResponding,
                    onAccept: {
                        Task { await viewModel.respond(to: assignment, response: .accept) }
                    },
                    onDecline: {
                        Task { await viewModel.respond(to: assignment, response: .decline) }
                    }
                )
            }
        }
    }

    @ViewBuilder
    private var calendarSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Picker(tr("team_portal.calendar_mode", "Modo calendario"), selection: $calendarMode) {
                Text(tr("team_portal.month", "Mes")).tag(CalendarMode.month)
                Text(tr("team_portal.week", "Semana")).tag(CalendarMode.week)
                Text(tr("team_portal.day", "Día")).tag(CalendarMode.day)
            }
            .pickerStyle(.segmented)

            if calendarMode == .month {
            cardContainer {
                VStack(spacing: Spacing.md) {
                    HStack {
                        Button {
                            displayedMonth = Calendar.current.addingMonths(-1, to: displayedMonth)
                        } label: {
                            Image(systemName: "chevron.left")
                        }
                        .accessibilityLabel(tr("calendar.previous_month", "Mes anterior"))

                        Spacer()

                        Text(monthLabel)
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(SolennixColors.text)

                        Spacer()

                        Button {
                            displayedMonth = Calendar.current.addingMonths(1, to: displayedMonth)
                        } label: {
                            Image(systemName: "chevron.right")
                        }
                        .accessibilityLabel(tr("calendar.next_month", "Mes siguiente"))
                    }

                    HStack {
                        ForEach(weekdaySymbols, id: \.self) { symbol in
                            Text(symbol)
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(SolennixColors.textSecondary)
                                .frame(maxWidth: .infinity)
                        }
                    }

                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 6), count: 7), spacing: 8) {
                        ForEach(monthDays) { day in
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
            }
            }

            if calendarMode == .week {
                cardContainer {
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        Text(tr("team_portal.week", "Semana"))
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(SolennixColors.textSecondary)

                        ForEach(weekAssignments, id: \.day) { item in
                            VStack(alignment: .leading, spacing: Spacing.sm) {
                                Text(dayHeaderLabel(item.day))
                                    .font(.caption.weight(.semibold))
                                    .foregroundStyle(SolennixColors.textSecondary)

                                if item.items.isEmpty {
                                    Text(tr("team_portal.no_assignments", "Sin asignaciones"))
                                        .font(.caption)
                                        .foregroundStyle(SolennixColors.textTertiary)
                                } else {
                                    ForEach(item.items) { assignment in
                                        TeamPortalTimelineRow(
                                            assignment: assignment,
                                            timeRange: timeRangeLabel(for: assignment)
                                        ) {
                                            selectedDate = item.day
                                            selectedAssignmentDetail = assignment
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }

            if calendarMode == .day {
                cardContainer {
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        Text(selectedDateLabel)
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(SolennixColors.textSecondary)

                        if selectedDayAssignments.isEmpty {
                            Text(tr("team_portal.no_assignments_day", "No hay asignaciones para este día."))
                                .font(.subheadline)
                                .foregroundStyle(SolennixColors.textSecondary)
                        } else {
                            ForEach(selectedDayAssignments) { assignment in
                                TeamPortalTimelineRow(
                                    assignment: assignment,
                                    timeRange: timeRangeLabel(for: assignment)
                                ) {
                                    selectedAssignmentDetail = assignment
                                }
                            }
                        }
                    }
                }
            }

            Text(tr("team_portal.events_of_day", "Eventos del dia"))
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(SolennixColors.textSecondary)

            if selectedDayAssignments.isEmpty {
                cardContainer {
                    Text(tr("team_portal.no_assignments_date", "No hay asignaciones para esta fecha."))
                        .font(.subheadline)
                        .foregroundStyle(SolennixColors.textSecondary)
                }
            } else {
                ForEach(selectedDayAssignments) { assignment in
                    TeamMemberAssignmentCard(
                        assignment: assignment,
                        isResponding: viewModel.isResponding,
                        onTap: {
                            selectedAssignmentDetail = assignment
                        },
                        onAccept: {
                            Task { await viewModel.respond(to: assignment, response: .accept) }
                        },
                        onDecline: {
                            Task { await viewModel.respond(to: assignment, response: .decline) }
                        }
                    )
                }
            }
        }
    }

    @ViewBuilder
    private func cardContainer<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        content()
            .padding(Spacing.lg)
            .frame(maxWidth: .infinity, alignment: .leading)
            .solennixCard(radius: CornerRadius.lg, border: false)
    }

    private func parseLocalDate(_ value: String) -> Date? {
        let parts = value.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return nil }
        return Calendar.current.date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2]))
    }

    private func dayHeaderLabel(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale.current
        formatter.dateFormat = "EEE d"
        return formatter.string(from: date).capitalized
    }
}

private struct TeamPortalCalendarDay: Identifiable {
    let date: Date
    let dayNumber: Int
    let isCurrentMonth: Bool
    let isToday: Bool
    let isSelected: Bool

    var id: Date { date }
}

private struct TeamPortalCalendarDayCell: View {
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
                    }
                }
                .frame(height: 6)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 44)
        }
        .buttonStyle(.plain)
        .opacity(day.isCurrentMonth ? 1 : 0.35)
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

private extension Calendar {
    func startOfMonth(for date: Date) -> Date {
        let components = dateComponents([.year, .month], from: date)
        return self.date(from: components) ?? date
    }

    func addingMonths(_ value: Int, to date: Date) -> Date {
        self.date(byAdding: .month, value: value, to: date) ?? date
    }
}

private struct TeamMemberAssignmentCard: View {

    let assignment: TeamMemberAssignment
    let isResponding: Bool
    var onTap: (() -> Void)? = nil
    let onAccept: () -> Void
    let onDecline: () -> Void

    private var isPending: Bool {
        assignment.status == .pending
    }

    private var feeLabel: String? {
        guard let feeAmount = assignment.feeAmount else { return nil }
        return feeAmount.formattedCurrency(code: nil)
    }

    private var statusLabel: String {
        switch assignment.status {
        case .pending: return tr("team_portal.pending", "Pendiente")
        case .confirmed: return tr("team_portal.confirmed", "Confirmada")
        case .declined: return tr("team_portal.declined", "Rechazada")
        case .cancelled: return tr("team_portal.cancelled", "Cancelada")
        }
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack(alignment: .top, spacing: Spacing.sm) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(assignment.eventName)
                        .font(.headline)
                        .foregroundStyle(SolennixColors.text)

                    Text(assignment.eventDate)
                        .font(.subheadline)
                        .foregroundStyle(SolennixColors.textSecondary)
                }

                Spacer()

                Text(statusLabel)
                    .font(.caption.weight(.semibold))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(statusBackground)
                    .foregroundStyle(statusForeground)
                    .clipShape(Capsule())
            }

            if let roleOverride = assignment.roleOverride {
                Text(FeatureL10n.format("team_portal.role_fmt", "Rol: %@", roleOverride))
                    .font(.subheadline)
                    .foregroundStyle(SolennixColors.textSecondary)
            }

            if let feeLabel {
                Text(FeatureL10n.format("team_portal.payment_fmt", "Pago: %@", feeLabel))
                    .font(.subheadline)
                    .foregroundStyle(SolennixColors.primary)
            }

            if let notes = assignment.notes {
                Text(notes)
                    .font(.subheadline)
                    .foregroundStyle(SolennixColors.textSecondary)
            }

            if isPending {
                HStack(spacing: Spacing.sm) {
                    Button {
                        onDecline()
                    } label: {
                        Text(tr("team_portal.reject", "Rechazar"))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(SolennixColors.error.opacity(0.14))
                            .foregroundStyle(SolennixColors.error)
                            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                    }
                    .disabled(isResponding)

                    PremiumButton(
                        title: tr("common.accept", "Aceptar"),
                        isDisabled: isResponding
                    ) {
                        onAccept()
                    }
                }
            }
        }
        .padding(Spacing.lg)
        .solennixCard(radius: CornerRadius.lg, border: false)
        .contentShape(Rectangle())
        .onTapGesture {
            onTap?()
        }
    }

    private var statusBackground: Color {
        switch assignment.status {
        case .pending: return SolennixColors.warning.opacity(0.14)
        case .confirmed: return SolennixColors.success.opacity(0.14)
        case .declined: return SolennixColors.error.opacity(0.14)
        case .cancelled: return SolennixColors.textTertiary.opacity(0.14)
        }
    }

    private var statusForeground: Color {
        switch assignment.status {
        case .pending: return SolennixColors.warning
        case .confirmed: return SolennixColors.success
        case .declined: return SolennixColors.error
        case .cancelled: return SolennixColors.textSecondary
        }
    }
}

private struct TeamPortalTimelineRow: View {
    let assignment: TeamMemberAssignment
    let timeRange: String?
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(alignment: .top, spacing: Spacing.sm) {
                RoundedRectangle(cornerRadius: 2)
                    .fill(SolennixColors.primary)
                    .frame(width: 3, height: 32)

                VStack(alignment: .leading, spacing: 2) {
                    Text(assignment.eventName)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(SolennixColors.text)

                    if let timeRange {
                        Text(timeRange)
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textSecondary)
                    }
                }

                Spacer()
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(Spacing.sm)
            .background(SolennixColors.surfaceGrouped)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
        }
        .buttonStyle(.plain)
    }
}

private struct TeamPortalAssignmentDetailSheet: View {
    private struct ExecutionState: Codable, Equatable {
        var arrivalReady: Bool = false
        var materialsReady: Bool = false
        var closingDone: Bool = false
        var quickNote: String = ""
    }

    let assignment: TeamMemberAssignment
    @State private var executionState = ExecutionState()

    var body: some View {
        NavigationStack {
            List {
                Section(tr("team_portal.event_section", "Evento")) {
                    detailRow(tr("clients.form.name", "Nombre"), assignment.eventName)
                    detailRow(tr("team_portal.date_label", "Fecha"), assignment.eventDate)
                    if let locationLabel {
                        detailRow(tr("team_portal.location_label", "Ubicación"), locationLabel)
                    }
                    if let mapsURL {
                        Link(tr("team_portal.open_maps", "Abrir en mapas"), destination: mapsURL)
                    }
                    if let organizerNotes = assignment.organizerNotes, !organizerNotes.isEmpty {
                        detailRow(tr("team_portal.organizer_notes", "Notas del organizador"), organizerNotes)
                    }
                }

                Section(tr("team_portal.assignment_section", "Asignación")) {
                    detailRow(tr("team_portal.status_label", "Estado"), statusLabel)
                    if let role = assignment.roleOverride {
                        detailRow(tr("team_portal.role_label", "Rol"), role)
                    }
                    if let notes = assignment.notes {
                        detailRow(tr("team_portal.notes_section", "Notas"), notes)
                    }
                    if let contactLabel {
                        detailRow(tr("team_portal.operational_contact", "Contacto operativo"), contactLabel)
                    }
                }

                Section(tr("events.detail.documents.checklist", "Checklist")) {
                    Toggle(tr("team_portal.arrival_ready", "Llegada y acceso confirmados"), isOn: $executionState.arrivalReady)
                    Toggle(tr("team_portal.material_ready", "Material y montaje listos"), isOn: $executionState.materialsReady)
                    Toggle(tr("team_portal.closing_done", "Cierre operativo completado"), isOn: $executionState.closingDone)
                }

                Section(tr("team_portal.quick_notes", "Notas rápidas")) {
                    TextEditor(text: $executionState.quickNote)
                        .frame(minHeight: 110)
                }
            }
            .navigationTitle(tr("events.detail.title", "Detalle del evento"))
            .navigationBarTitleDisplayMode(.inline)
            .onAppear {
                loadExecutionState()
            }
            .onChange(of: executionState) { _, _ in
                saveExecutionState()
            }
        }
    }

    private var statusLabel: String {
        switch assignment.status {
        case .pending: return tr("team_portal.pending", "Pendiente")
        case .confirmed: return tr("team_portal.confirmed", "Confirmada")
        case .declined: return tr("team_portal.declined", "Rechazada")
        case .cancelled: return tr("team_portal.cancelled", "Cancelada")
        }
    }

    @ViewBuilder
    private func detailRow(_ title: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title)
                .font(.caption)
                .foregroundStyle(SolennixColors.textSecondary)
            Text(value)
                .font(.body)
        }
    }

    private var storageKey: String {
        "team_event_detail_\(assignment.eventId)"
    }

    private var locationLabel: String? {
        var parts: [String] = []
        for value in [assignment.location, assignment.city] {
            guard let value else { continue }
            let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !trimmed.isEmpty else { continue }
            parts.append(trimmed)
        }
        return parts.isEmpty ? nil : parts.joined(separator: ", ")
    }

    private var mapsURL: URL? {
        guard let locationLabel else { return nil }
        return URL(string: "https://www.google.com/maps/search/?api=1&query=\(locationLabel.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")")
    }

    private var contactLabel: String? {
        var parts: [String] = []
        for value in [assignment.contactName, assignment.contactPhone] {
            guard let value else { continue }
            let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !trimmed.isEmpty else { continue }
            parts.append(trimmed)
        }
        return parts.isEmpty ? nil : parts.joined(separator: " · ")
    }

    private func loadExecutionState() {
        guard let data = UserDefaults.standard.data(forKey: storageKey) else { return }
        if let decoded = try? JSONDecoder().decode(ExecutionState.self, from: data) {
            executionState = decoded
        }
    }

    private func saveExecutionState() {
        guard let data = try? JSONEncoder().encode(executionState) else { return }
        UserDefaults.standard.set(data, forKey: storageKey)
    }
}

private extension Calendar {
    func startOfWeek(for date: Date) -> Date {
        let components = dateComponents([.yearForWeekOfYear, .weekOfYear], from: date)
        return self.date(from: components) ?? startOfDay(for: date)
    }
}