import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - AssistantPortalView (Secretario, solo lectura)

/// Read-only portal for the `assistant` (Secretario) role.
///
/// Shows the upcoming-events agenda, per-event staffing (staff + RSVP +
/// summary) and the staff directory. No finances, no clients, no mutations.
/// Visual style mirrors `TeamMemberPortalView` (same cards, badges, banners).
public struct AssistantPortalView: View {

    private enum AssistantSection: String, CaseIterable, Identifiable {
        case agenda
        case directory

        var id: String { rawValue }
    }

    @Environment(AuthManager.self) private var authManager
    @Environment(\.horizontalSizeClass) private var sizeClass
    @State private var viewModel: AssistantPortalViewModel
    @State private var section: AssistantSection = .agenda
    @State private var expandedEventIds: Set<String> = []
    @State private var directoryQuery: String = ""

    public init(apiClient: APIClient) {
        _viewModel = State(initialValue: AssistantPortalViewModel(apiClient: apiClient))
    }

    public var body: some View {
        NavigationStack {
            content
                .navigationTitle(StaffStrings.assistantTitle)
                .navigationBarTitleDisplayMode(.large)
                .toolbar {
                    ToolbarItem(placement: .topBarLeading) {
                        Button {
                            Task { await authManager.signOut() }
                        } label: {
                            Image(systemName: "rectangle.portrait.and.arrow.right")
                        }
                        .accessibilityLabel(StaffStrings.assistantSignOutAccessibility)
                    }

                    ToolbarItem(placement: .topBarTrailing) {
                        Button {
                            Task { await viewModel.load() }
                        } label: {
                            Image(systemName: "arrow.clockwise")
                        }
                        .accessibilityLabel(StaffStrings.assistantReloadAccessibility)
                    }
                }
        }
        .task {
            await viewModel.load()
        }
        .refreshable {
            await viewModel.load()
        }
        .background(SolennixColors.surfaceGrouped.ignoresSafeArea())
    }

    @ViewBuilder
    private var content: some View {
        if let errorMessage = viewModel.errorMessage,
           viewModel.events.isEmpty, viewModel.directory.isEmpty, !viewModel.isLoading {
            ContentUnavailableView {
                Label(StaffStrings.assistantLoadError, systemImage: "exclamationmark.triangle")
            } description: {
                Text(errorMessage)
            } actions: {
                Button(StaffStrings.retry) {
                    Task { await viewModel.load() }
                }
            }
        } else if viewModel.isLoading && viewModel.events.isEmpty && viewModel.directory.isEmpty {
            ProgressView(StaffStrings.assistantLoading)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else {
            ScrollView {
                LazyVStack(spacing: Spacing.md) {
                    if let errorMessage = viewModel.errorMessage {
                        InlineErrorBanner(message: errorMessage) {
                            Task { await viewModel.load() }
                        }
                    }

                    Picker(StaffStrings.assistantTitle, selection: $section) {
                        Text(StaffStrings.assistantAgenda).tag(AssistantSection.agenda)
                        Text(StaffStrings.assistantDirectory).tag(AssistantSection.directory)
                    }
                    .pickerStyle(.segmented)

                    if section == .agenda {
                        agendaSection
                    } else {
                        directorySection
                    }
                }
                .padding(.horizontal, sizeClass == .regular ? Spacing.xxxl : Spacing.xl)
                .padding(.vertical, Spacing.lg)
            }
            .assistantSearchable(
                text: $directoryQuery,
                prompt: StaffStrings.assistantSearchStaff,
                active: section == .directory
            )
        }
    }

    private func eventName(_ event: Event) -> String {
        event.serviceType.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            ? event.id
            : event.serviceType
    }

    // MARK: - Agenda (upcoming events + staffing)

    @ViewBuilder
    private var agendaSection: some View {
        if viewModel.events.isEmpty {
            ContentUnavailableView {
                Label(StaffStrings.assistantEmptyEvents, systemImage: "calendar.badge.clock")
            } description: {
                Text(StaffStrings.assistantEmptyEventsMessage)
            }
        } else {
            ForEach(viewModel.events) { event in
                eventCard(event)
            }
        }
    }

    private func eventCard(_ event: Event) -> some View {
        let isExpanded = expandedEventIds.contains(event.id)
        return VStack(alignment: .leading, spacing: Spacing.sm) {
            Button {
                withAnimation(.smooth) {
                    if isExpanded {
                        expandedEventIds.remove(event.id)
                    } else {
                        expandedEventIds.insert(event.id)
                        Task { await viewModel.loadStaffing(eventId: event.id) }
                    }
                }
            } label: {
                HStack(alignment: .top, spacing: Spacing.sm) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(eventName(event))
                            .font(.headline)
                            .foregroundStyle(SolennixColors.text)

                        Text(event.eventDate)
                            .font(.subheadline)
                            .foregroundStyle(SolennixColors.textSecondary)

                        if let place = eventPlace(event), !place.isEmpty {
                            Text(place)
                                .font(.footnote)
                                .foregroundStyle(SolennixColors.textTertiary)
                        }
                    }

                    Spacer()

                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textTertiary)
                }
            }
            .buttonStyle(.plain)
            .accessibilityHint(isExpanded ? "" : StaffStrings.assistantStaffingTitle)

            if isExpanded {
                Divider()
                staffingSection(eventId: event.id)
            }
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .solennixCard(border: false)
    }

    @ViewBuilder
    private func staffingSection(eventId: String) -> some View {
        if viewModel.staffingLoadingIds.contains(eventId), viewModel.staffingByEvent[eventId] == nil {
            HStack {
                Spacer()
                ProgressView()
                Spacer()
            }
            .padding(.vertical, Spacing.sm)
        } else if let roster = viewModel.staffingByEvent[eventId], !roster.isEmpty {
            staffingSummary(eventId: eventId)

            VStack(spacing: Spacing.sm) {
                ForEach(roster) { assignment in
                    staffingRow(assignment)
                }
            }
        } else {
            Text(StaffStrings.assistantNoStaff)
                .font(.footnote)
                .foregroundStyle(SolennixColors.textSecondary)
        }
    }

    private func staffingSummary(eventId: String) -> some View {
        let counts = viewModel.summary(for: eventId)
        return HStack(spacing: Spacing.xs) {
            summaryCapsule(
                icon: "checkmark.circle.fill",
                color: SolennixColors.success,
                background: SolennixColors.successBg,
                text: StaffStrings.assistantSummaryConfirmed(counts.confirmed)
            )

            if counts.pending > 0 {
                summaryCapsule(
                    icon: "clock.fill",
                    color: SolennixColors.warning,
                    background: SolennixColors.warningBg,
                    text: StaffStrings.assistantSummaryPending(counts.pending)
                )
            }

            if counts.declined > 0 {
                summaryCapsule(
                    icon: "xmark.circle.fill",
                    color: SolennixColors.error,
                    background: SolennixColors.errorBg,
                    text: StaffStrings.assistantSummaryDeclined(counts.declined)
                )
            }

            if counts.cancelled > 0 {
                summaryCapsule(
                    icon: "minus.circle.fill",
                    color: SolennixColors.textSecondary,
                    background: SolennixColors.textTertiary.opacity(0.14),
                    text: StaffStrings.assistantSummaryCancelled(counts.cancelled)
                )
            }
        }
    }

    private func summaryCapsule(icon: String, color: Color, background: Color, text: String) -> some View {
        HStack(spacing: 3) {
            Image(systemName: icon)
                .font(.caption2)
                .foregroundStyle(color)
            Text(text)
                .font(.caption2)
                .fontWeight(.medium)
        }
        .padding(.horizontal, Spacing.xs)
        .padding(.vertical, 3)
        .background(background)
        .clipShape(Capsule())
        .accessibilityElement(children: .combine)
    }

    private func staffingRow(_ assignment: EventStaff) -> some View {
        HStack(spacing: Spacing.sm) {
            Avatar(name: assignment.staffName ?? "?", size: 36)

            VStack(alignment: .leading, spacing: 2) {
                Text(assignment.staffName ?? "?")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.text)

                if let role = assignment.roleOverride ?? assignment.staffRoleLabel, !role.isEmpty {
                    Text(role)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                }

                if let shift = shiftLabel(start: assignment.shiftStart, end: assignment.shiftEnd) {
                    Text(shift)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textTertiary)
                }
            }

            Spacer()

            Text(statusLabel(assignment.assignmentStatus))
                .font(.caption.weight(.semibold))
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(statusBackground(assignment.assignmentStatus))
                .foregroundStyle(statusForeground(assignment.assignmentStatus))
                .clipShape(Capsule())
        }
        .accessibilityElement(children: .combine)
    }

    // MARK: - Directory (read-only)

    @ViewBuilder
    private var directorySection: some View {
        let filtered = filteredDirectory
        if filtered.isEmpty {
            ContentUnavailableView {
                Label(StaffStrings.assistantEmptyDirectory, systemImage: "person.2")
            }
        } else {
            VStack(spacing: Spacing.sm) {
                ForEach(filtered) { member in
                    HStack(spacing: Spacing.sm) {
                        Avatar(name: member.name, size: 36)

                        VStack(alignment: .leading, spacing: 2) {
                            Text(member.name)
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .foregroundStyle(SolennixColors.text)

                            if let role = member.roleLabel, !role.isEmpty {
                                Text(role)
                                    .font(.caption)
                                    .foregroundStyle(SolennixColors.textSecondary)
                            }
                        }

                        Spacer()
                    }
                    .padding(Spacing.sm)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .solennixCard(border: false)
                }
            }
        }
    }

    private var filteredDirectory: [Staff] {
        let query = directoryQuery.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !query.isEmpty else { return viewModel.directory }
        return viewModel.directory.filter {
            $0.name.localizedCaseInsensitiveContains(query)
                || ($0.roleLabel?.localizedCaseInsensitiveContains(query) ?? false)
        }
    }

    // MARK: - Formatting helpers

    private func eventPlace(_ event: Event) -> String? {
        [event.location, event.city]
            .compactMap { $0?.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
            .joined(separator: " · ")
            .nilIfEmpty
    }

    private func statusLabel(_ status: AssignmentStatus) -> String {
        switch status {
        case .pending: return StaffStrings.assistantStatusPending
        case .confirmed: return StaffStrings.assistantStatusConfirmed
        case .declined: return StaffStrings.assistantStatusDeclined
        case .cancelled: return StaffStrings.assistantStatusCancelled
        }
    }

    private func statusBackground(_ status: AssignmentStatus) -> Color {
        switch status {
        case .pending: return SolennixColors.warning.opacity(0.14)
        case .confirmed: return SolennixColors.success.opacity(0.14)
        case .declined: return SolennixColors.error.opacity(0.14)
        case .cancelled: return SolennixColors.textTertiary.opacity(0.14)
        }
    }

    private func statusForeground(_ status: AssignmentStatus) -> Color {
        switch status {
        case .pending: return SolennixColors.warning
        case .confirmed: return SolennixColors.success
        case .declined: return SolennixColors.error
        case .cancelled: return SolennixColors.textSecondary
        }
    }

    private func shiftLabel(start: String?, end: String?) -> String? {
        let formatter = DateFormatter()
        formatter.locale = Locale.autoupdatingCurrent
        formatter.timeStyle = .short
        formatter.dateStyle = .none

        func short(_ raw: String?) -> String? {
            guard let raw, let date = teamPortalParseDateTime(raw) else { return nil }
            return formatter.string(from: date)
        }

        switch (short(start), short(end)) {
        case let (lhs?, rhs?):
            return "\(lhs) – \(rhs)"
        case let (lhs?, nil):
            return lhs
        case let (nil, rhs?):
            return rhs
        case (nil, nil):
            return nil
        }
    }
}

private extension String {
    var nilIfEmpty: String? {
        trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : self
    }
}

private extension View {
    /// Applies `.searchable` only when `active`, so the agenda section has
    /// no search field at all (instead of a hidden one).
    @ViewBuilder
    func assistantSearchable(text: Binding<String>, prompt: String, active: Bool) -> some View {
        if active {
            searchable(text: text, prompt: prompt)
        } else {
            self
        }
    }
}
