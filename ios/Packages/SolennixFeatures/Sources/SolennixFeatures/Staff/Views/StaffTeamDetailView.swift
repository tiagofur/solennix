import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Staff Team Detail View

public struct StaffTeamDetailView: View {

    let teamId: String

    @State private var team: StaffTeam?
    @State private var isLoading: Bool = true
    @State private var errorMessage: String?
    @State private var showDeleteConfirm: Bool = false
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL

    private let apiClient: APIClient

    public init(teamId: String, apiClient: APIClient) {
        self.teamId = teamId
        self.apiClient = apiClient
    }

    public var body: some View {
        Group {
            if isLoading && team == nil {
                ProgressView(StaffStrings.teamsLoadingDetail)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let team {
                scrollContent(team)
            } else {
                EmptyStateView(
                    icon: "exclamationmark.triangle",
                    title: StaffStrings.errorTitle,
                    message: errorMessage ?? StaffStrings.teamNotFoundMessage,
                    iconColor: SolennixColors.primary
                )
            }
        }
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle(team?.name ?? StaffStrings.teamNavFallback)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if team != nil {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        NavigationLink(value: Route.staffTeamForm(id: teamId)) {
                            Label(StaffStrings.edit, systemImage: "pencil")
                        }

                        Divider()

                        Button(role: .destructive) {
                            showDeleteConfirm = true
                        } label: {
                            Label(StaffStrings.deleteAction, systemImage: "trash")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                            .foregroundStyle(SolennixColors.primary)
                            .accessibilityLabel(StaffStrings.moreActions)
                    }
                }
            }
        }
        .confirmationDialog(
            StaffStrings.teamDeleteTitle,
            isPresented: $showDeleteConfirm
        ) {
            Button(StaffStrings.deleteAction, role: .destructive) {
                Task {
                    do {
                        try await apiClient.deleteStaffTeam(id: teamId)
                        dismiss()
                    } catch {
                        errorMessage = StaffStrings.teamDeleteError
                    }
                }
            }
            Button(StaffStrings.cancel, role: .cancel) {}
        } message: {
            Text(StaffStrings.teamDeleteMessage(team?.name ?? ""))
        }
        .task { await loadData() }
    }

    // MARK: - Scroll Content

    private func scrollContent(_ team: StaffTeam) -> some View {
        ScrollView {
            VStack(spacing: Spacing.lg) {
                headerCard(team)

                if let notes = team.notes, !notes.isEmpty {
                    notesCard(notes)
                }

                membersSection(team)
            }
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, Spacing.lg)
        }
        .refreshable { await loadData() }
    }

    // MARK: - Header

    private func headerCard(_ team: StaffTeam) -> some View {
        VStack(spacing: Spacing.md) {
            ZStack {
                RoundedRectangle(cornerRadius: CornerRadius.lg)
                    .fill(SolennixColors.primaryLight)
                    .frame(width: 72, height: 72)

                Image(systemName: "person.3.fill")
                    .font(.title)
                    .foregroundStyle(SolennixColors.primary)
            }

            Text(team.name)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundStyle(SolennixColors.text)
                .multilineTextAlignment(.center)

            if let role = team.roleLabel, !role.isEmpty {
                HStack(spacing: Spacing.xs) {
                    Image(systemName: "briefcase.fill")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.primary)
                    Text(role)
                        .font(.subheadline)
                        .foregroundStyle(SolennixColors.textSecondary)
                }
            }

            let count = team.members?.count ?? team.memberCount ?? 0
            HStack(spacing: Spacing.xs) {
                Image(systemName: "person.2")
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textTertiary)
                Text(StaffStrings.memberCount(count))
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textTertiary)
            }
        }
        .padding(Spacing.lg)
        .frame(maxWidth: .infinity)
        .solennixCard(border: false)
    }

    // MARK: - Notes

    private func notesCard(_ notes: String) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack(spacing: Spacing.sm) {
                Image(systemName: "note.text")
                    .font(.caption)
                    .foregroundStyle(SolennixColors.primary)
                Text(StaffStrings.notesTitle)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.textSecondary)
            }

            Text(notes)
                .font(.body)
                .foregroundStyle(SolennixColors.text)
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .solennixCard(radius: CornerRadius.lg, border: false)
    }

    // MARK: - Members

    private func membersSection(_ team: StaffTeam) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text(StaffStrings.membersTitle)
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundStyle(SolennixColors.textSecondary)
                .padding(.horizontal, Spacing.sm)

            let sorted = (team.members ?? []).sorted { $0.position < $1.position }

            if sorted.isEmpty {
                Text(StaffStrings.teamEmptyMembers)
                    .font(.body)
                    .foregroundStyle(SolennixColors.textTertiary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(Spacing.md)
                    .solennixCard(radius: CornerRadius.lg, shadow: false, border: false)
            } else {
                VStack(spacing: Spacing.xs) {
                    ForEach(sorted) { member in
                        memberRow(member)
                    }
                }
            }
        }
    }

    private func memberRow(_ member: StaffTeamMember) -> some View {
        HStack(spacing: Spacing.md) {
            Avatar(name: member.staffName ?? "?", photoURL: nil, size: 40)

            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: Spacing.xs) {
                    Text(member.staffName ?? StaffStrings.memberNoName)
                        .font(.body)
                        .fontWeight(.semibold)
                        .foregroundStyle(SolennixColors.text)

                    if member.isLead {
                        Image(systemName: "crown.fill")
                            .font(.caption2)
                            .foregroundStyle(SolennixColors.primary)
                            .accessibilityLabel(StaffStrings.memberLeadAccessibility)
                    }
                }

                if let role = member.staffRoleLabel, !role.isEmpty {
                    Text(role)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                }

                HStack(spacing: Spacing.sm) {
                    if let phone = member.staffPhone, !phone.isEmpty {
                        Text(phone)
                            .font(.caption2)
                            .foregroundStyle(SolennixColors.textTertiary)
                    }
                    if let email = member.staffEmail, !email.isEmpty {
                        Text(email)
                            .font(.caption2)
                            .foregroundStyle(SolennixColors.textTertiary)
                            .lineLimit(1)
                    }
                }
            }

            Spacer()

            NavigationLink(value: Route.staffDetail(id: member.staffId)) {
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textTertiary)
            }
        }
        .padding(Spacing.md)
        .solennixCard(radius: CornerRadius.lg, shadow: false, border: false)
    }

    // MARK: - Load

    @MainActor
    private func loadData() async {
        isLoading = true
        errorMessage = nil

        do {
            team = try await apiClient.getStaffTeam(id: teamId)
        } catch {
            if let apiError = error as? APIError {
                errorMessage = apiError.errorDescription
            } else {
                errorMessage = StaffStrings.unexpectedError
            }
        }

        isLoading = false
    }
}

// MARK: - Preview

#Preview("Staff Team Detail") {
    NavigationStack {
        StaffTeamDetailView(teamId: "team-1", apiClient: APIClient())
    }
}
