import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - TeamMemberPortalView (Hub)

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
                .navigationTitle(teamPortalTr("team_portal.my_day", "Mi jornada"))
                .navigationBarTitleDisplayMode(.large)
                .toolbar {
                    ToolbarItem(placement: .topBarLeading) {
                        Button {
                            Task { await authManager.signOut() }
                        } label: {
                            Image(systemName: "rectangle.portrait.and.arrow.right")
                        }
                        .accessibilityLabel(teamPortalTr("team_portal.close_session_a11y", "Cerrar sesion"))
                    }

                    ToolbarItem(placement: .topBarTrailing) {
                        Button {
                            Task { await viewModel.loadAssignments() }
                        } label: {
                            Image(systemName: "arrow.clockwise")
                        }
                        .accessibilityLabel(teamPortalTr("team_portal.reload_a11y", "Recargar asignaciones"))
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
            TeamPortalAssignmentDetailSheet(assignment: assignment, viewModel: viewModel)
        }
        .background(SolennixColors.surfaceGrouped.ignoresSafeArea())
    }

    @ViewBuilder
    private var content: some View {
        if let errorMessage = viewModel.errorMessage, viewModel.assignments.isEmpty, !viewModel.isLoading {
            ContentUnavailableView {
                Label(teamPortalTr("team_portal.load_error", "No pudimos cargar tus asignaciones"), systemImage: "exclamationmark.triangle")
            } description: {
                Text(errorMessage)
            } actions: {
                Button(teamPortalTr("team_portal.retry", "Reintentar")) {
                    Task { await viewModel.loadAssignments() }
                }
            }
        } else if viewModel.isLoading && viewModel.assignments.isEmpty {
            ProgressView()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if viewModel.assignments.isEmpty {
            ContentUnavailableView {
                Label(teamPortalTr("team_portal.empty_title", "Todavia no tenes asignaciones"), systemImage: "calendar.badge.clock")
            } description: {
                Text(teamPortalTr("team_portal.empty_message", "Cuando te asignen a un evento, va a aparecer aca con respuesta rapida."))
            }
        } else {
            ScrollView {
                LazyVStack(spacing: Spacing.md) {
                    // Surface save/load errors while the list is populated (#875).
                    if let errorMessage = viewModel.errorMessage {
                        InlineErrorBanner(message: errorMessage) {
                            Task { await viewModel.loadAssignments() }
                        }
                    }

                    Picker(teamPortalTr("team_portal.section_label", "Seccion"), selection: $section) {
                        Text(teamPortalTr("team_portal.my_day", "Mi jornada")).tag(TeamMemberSection.work)
                        Text(teamPortalTr("calendar.title", "Calendario")).tag(TeamMemberSection.calendar)
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

    // MARK: - Computed grouping helpers

    private var pendingAssignments: [TeamMemberAssignment] {
        viewModel.assignments.filter { $0.status == .pending }
    }

    private var unreadTimelineCount: Int {
        viewModel.timeline.filter { $0.readAt == nil }.count
    }

    private var todayAssignments: [TeamMemberAssignment] {
        let today = Calendar.current.startOfDay(for: Date())
        return teamPortalAssignmentsByDate(viewModel.assignments)[today, default: []].sorted { $0.eventDate < $1.eventDate }
    }

    private var next7DaysAssignments: [TeamMemberAssignment] {
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        guard let nextWeek = calendar.date(byAdding: .day, value: 7, to: today) else {
            return []
        }

        return viewModel.assignments
            .filter { assignment in
                guard let date = teamPortalParseLocalDate(assignment.eventDate) else { return false }
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
        (teamPortalAssignmentsByDate(viewModel.assignments)[Calendar.current.startOfDay(for: selectedDate)] ?? [])
            .sorted(by: teamPortalCompareAssignmentsByShift)
    }

    private var weekDays: [Date] {
        let calendar = Calendar.current
        let start = calendar.startOfWeek(for: selectedDate)
        return (0..<7).compactMap { calendar.date(byAdding: .day, value: $0, to: start) }
    }

    private var weekAssignments: [(day: Date, items: [TeamMemberAssignment])] {
        let grouped = teamPortalAssignmentsByDate(viewModel.assignments)
        return weekDays.map { day in
            let key = Calendar.current.startOfDay(for: day)
            let items = (grouped[key] ?? []).sorted(by: teamPortalCompareAssignmentsByShift)
            return (day: day, items: items)
        }
    }

    // MARK: - Availability form helpers

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
        if let start = teamPortalParseLocalDate(item.startDate) {
            availabilityStartDate = start
        }
        if let end = teamPortalParseLocalDate(item.endDate) {
            availabilityEndDate = end
        }
        availabilityStartTime = item.startTime ?? ""
        availabilityEndTime = item.endTime ?? ""
        availabilityReason = item.reason ?? ""
    }

    // MARK: - Work section

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
                    Text(teamPortalTr("team_portal.go_to_today", "Ir a agenda de hoy"))
                        .font(.footnote.weight(.semibold))
                }
                .buttonStyle(.bordered)

                Button {
                    prioritizePendingInWork = true
                    section = .work
                } label: {
                    Text(teamPortalTr("team_portal.respond", "Responder asignaciones"))
                        .font(.footnote.weight(.semibold))
                }
                .buttonStyle(.borderedProminent)
            }

            let assignmentLists = TeamPortalAssignmentLists(
                pending: pendingAssignments,
                today: todayAssignments,
                next7Days: next7DaysAssignments
            )

            if prioritizePendingInWork {
                assignmentList(.pending, using: assignmentLists)
                assignmentList(.today, using: assignmentLists)
                assignmentList(.next7Days, using: assignmentLists)
            } else {
                assignmentList(.today, using: assignmentLists)
                assignmentList(.next7Days, using: assignmentLists)
                assignmentList(.pending, using: assignmentLists)
            }

            timelineSection
            availabilitySection
        }
    }

    private enum AssignmentListKind {
        case pending, today, next7Days
    }

    private struct TeamPortalAssignmentLists {
        let pending: [TeamMemberAssignment]
        let today: [TeamMemberAssignment]
        let next7Days: [TeamMemberAssignment]
    }

    private func assignmentList(_ kind: AssignmentListKind, using lists: TeamPortalAssignmentLists) -> TeamPortalAssignmentList {
        let title: String
        let emptyText: String
        let assignments: [TeamMemberAssignment]

        switch kind {
        case .pending:
            title = teamPortalTr("team_portal.pending_response", "Pendientes por responder")
            emptyText = teamPortalTr("team_portal.no_invitations", "No tenes invitaciones pendientes.")
            assignments = lists.pending
        case .today:
            title = teamPortalTr("calendar.today", "Hoy")
            emptyText = teamPortalTr("team_portal.no_today", "No tenes asignaciones para hoy.")
            assignments = lists.today
        case .next7Days:
            title = teamPortalTr("team_portal.next_7_days", "Proximos 7 dias")
            emptyText = teamPortalTr("team_portal.no_next_7", "No hay asignaciones en los proximos 7 dias.")
            assignments = lists.next7Days
        }

        return TeamPortalAssignmentList(
            title: title,
            emptyText: emptyText,
            assignments: assignments,
            isResponding: viewModel.isResponding,
            onAccept: { assignment in
                Task { await viewModel.respond(to: assignment, response: .accept) }
            },
            onDecline: { assignment in
                Task { await viewModel.respond(to: assignment, response: .decline) }
            }
        )
    }

    // MARK: - Timeline section

    @ViewBuilder
    private var timelineSection: some View {
        TeamPortalTimelineSection(
            timeline: viewModel.timeline,
            unreadCount: unreadTimelineCount,
            onSelect: { item in
                if item.readAt == nil {
                    Task { await viewModel.markTimelineRead(id: item.id) }
                }
                if let assignment = viewModel.assignments.first(where: { $0.eventStaffId == item.eventStaffId }) {
                    section = .calendar
                    if let date = teamPortalParseLocalDate(assignment.eventDate) {
                        selectedDate = date
                        displayedMonth = Calendar.current.startOfMonth(for: date)
                    }
                    selectedAssignmentDetail = assignment
                }
            }
        )
    }

    // MARK: - Calendar section

    @ViewBuilder
    private var calendarSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Picker(teamPortalTr("team_portal.calendar_mode", "Modo calendario"), selection: $calendarMode) {
                Text(teamPortalTr("team_portal.month", "Mes")).tag(CalendarMode.month)
                Text(teamPortalTr("team_portal.week", "Semana")).tag(CalendarMode.week)
                Text(teamPortalTr("team_portal.day", "Día")).tag(CalendarMode.day)
            }
            .pickerStyle(.segmented)

            if calendarMode == .month {
                TeamPortalMonthCalendarView(
                    displayedMonth: $displayedMonth,
                    selectedDate: $selectedDate,
                    statusDotsByDate: teamPortalStatusDotsByDate(teamPortalAssignmentsByDate(viewModel.assignments))
                )
            }

            if calendarMode == .week {
                TeamPortalWeekCalendarView(weekAssignments: weekAssignments) { day, assignment in
                    selectedDate = day
                    selectedAssignmentDetail = assignment
                }
            }

            if calendarMode == .day {
                TeamPortalDayCalendarView(
                    selectedDate: selectedDate,
                    assignments: selectedDayAssignments,
                    onTapRow: { assignment in
                        selectedAssignmentDetail = assignment
                    }
                )
            }

            TeamPortalAssignmentList(
                title: teamPortalTr("team_portal.events_of_day", "Eventos del dia"),
                emptyText: teamPortalTr("team_portal.no_assignments_date", "No hay asignaciones para esta fecha."),
                assignments: selectedDayAssignments,
                isResponding: viewModel.isResponding,
                onTap: { assignment in
                    selectedAssignmentDetail = assignment
                },
                onAccept: { assignment in
                    Task { await viewModel.respond(to: assignment, response: .accept) }
                },
                onDecline: { assignment in
                    Task { await viewModel.respond(to: assignment, response: .decline) }
                }
            )
        }
    }

    // MARK: - Availability section

    @ViewBuilder
    private var availabilitySection: some View {
        TeamPortalAvailabilitySection(
            startDate: $availabilityStartDate,
            endDate: $availabilityEndDate,
            startTime: $availabilityStartTime,
            endTime: $availabilityEndTime,
            reason: $availabilityReason,
            editingID: $editingUnavailableID,
            unavailableDates: viewModel.unavailableDates.sorted(by: { $0.startDate < $1.startDate }),
            isSaving: viewModel.isSavingAvailability,
            onSave: { saveAvailability() },
            onReset: { resetAvailabilityForm() },
            onEdit: { startEditingAvailability($0) },
            onDelete: { id in Task { await viewModel.deleteUnavailableDate(id: id) } }
        )
    }

    private func saveAvailability() {
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
    }
}

