import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Staff Team List View

public struct StaffTeamListView: View {

    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @State private var viewModel: StaffTeamListViewModel
    @Environment(ToastManager.self) private var toastManager

    public init(apiClient: APIClient) {
        _viewModel = State(initialValue: StaffTeamListViewModel(apiClient: apiClient))
    }

    public var body: some View {
        content
            .background(SolennixColors.surfaceGrouped)
            // Fix 15: sensory feedback when delete confirmation appears
            .sensoryFeedback(.warning, trigger: viewModel.showDeleteConfirm) { _, newValue in newValue }
            .navigationTitle(StaffStrings.teamsTitle)
            .navigationBarTitleDisplayMode(.large)
            .solennixSearchable(text: $viewModel.searchText, prompt: StaffStrings.teamsSearchPrompt)
            .refreshable { await viewModel.load() }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    NavigationLink(value: Route.staffTeamForm()) {
                        Image(systemName: "plus")
                            .font(.body)
                            .foregroundStyle(SolennixColors.primary)
                            .accessibilityLabel(StaffStrings.teamsAddAccessibility)
                    }
                }
            }
            .confirmationDialog(
                StaffStrings.teamDeleteTitle,
                isPresented: $viewModel.showDeleteConfirm,
                presenting: viewModel.deleteTarget
            ) { team in
                Button(StaffStrings.deleteAction, role: .destructive) {
                    HapticsHelper.play(.warning)
                    // Fix 16: soft-delete + undo (mirroring StaffListView pattern)
                    guard let removed = viewModel.softDeleteTeam(team) else { return }
                    toastManager.showUndo(
                        message: StaffStrings.teamDeletedToast(team.name),
                        onUndo: {
                            viewModel.restoreTeam(removed.team, at: removed.index)
                            HapticsHelper.play(.success)
                        },
                        onExpire: {
                            Task { await viewModel.confirmDeleteTeam(removed.team) }
                        }
                    )
                }
                Button(StaffStrings.cancel, role: .cancel) {}
            } message: { team in
                Text(StaffStrings.teamDeleteMessage(team.name))
            }
            .task {
                await viewModel.load()
            }
    }

    // MARK: - Content

    @ViewBuilder
    private var content: some View {
        if let error = viewModel.errorMessage, viewModel.teams.isEmpty, !viewModel.isLoading {
            EmptyStateView(
                icon: "wifi.exclamationmark",
                title: StaffStrings.errorLoadingTitle,
                message: error,
                actionTitle: StaffStrings.retry
            ) {
                Task { await viewModel.load() }
            }
        } else if viewModel.isLoading && viewModel.teams.isEmpty {
            // Fix 12: in-List skeleton rows instead of bare ProgressView
            teamSkeletonList
        } else if viewModel.filteredTeams.isEmpty && !viewModel.isLoading {
            if viewModel.searchText.isEmpty {
                // Fix 13: real NavigationLink CTA
                teamsFirstRunView
            } else {
                EmptyStateView(
                    icon: "magnifyingglass",
                    title: StaffStrings.filteredEmptyTitle,
                    message: StaffStrings.teamsFilteredEmptyMessage
                )
            }
        } else {
            teamList
        }
    }

    // MARK: - Team List

    private var teamList: some View {
        List {
            // Fix 11: wrap ForEach in a Section
            Section {
                ForEach(viewModel.filteredTeams) { team in
                    ZStack {
                        teamRow(team)
                        NavigationLink(value: Route.staffTeamDetail(id: team.id)) {
                            EmptyView()
                        }
                        .opacity(0)
                        .accessibilityHidden(true)
                    }
                    // Fix 11: card background + separator tint
                    .listRowBackground(SolennixColors.card)
                    .listRowSeparatorTint(SolennixColors.primary.opacity(0.2))
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel(teamAccessibilityLabel(team))
                    .accessibilityAddTraits(.isButton)
                    .accessibilityAction(named: StaffStrings.deleteAction) {
                        viewModel.deleteTarget = team
                        viewModel.showDeleteConfirm = true
                    }
                    .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                        Button(role: .destructive) {
                            HapticsHelper.play(.warning)
                            viewModel.deleteTarget = team
                            viewModel.showDeleteConfirm = true
                        } label: {
                            Label(StaffStrings.deleteAction, systemImage: "trash")
                        }

                        NavigationLink(value: Route.staffTeamForm(id: team.id)) {
                            Label(StaffStrings.edit, systemImage: "pencil")
                        }
                        // Fix 15: accent tint on edit swipe
                        .tint(SolennixColors.accent)
                    }
                    .contextMenu {
                        NavigationLink(value: Route.staffTeamForm(id: team.id)) {
                            Label(StaffStrings.edit, systemImage: "pencil")
                        }
                        Divider()
                        Button(role: .destructive) {
                            HapticsHelper.play(.warning)
                            viewModel.deleteTarget = team
                            viewModel.showDeleteConfirm = true
                        } label: {
                            Label(StaffStrings.deleteAction, systemImage: "trash")
                        }
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .listSectionSpacing(.compact)
        .scrollContentBackground(.hidden)
        .background(SolennixColors.surfaceGrouped)
    }

    // MARK: - First-Run Empty (Fix 13)

    private var teamsFirstRunView: some View {
        VStack(spacing: 0) {
            EmptyStateView(
                icon: "person.3.sequence",
                title: StaffStrings.teamsEmptyTitle,
                message: StaffStrings.teamsEmptyMessage
            )
            NavigationLink(value: Route.staffTeamForm()) {
                Text(StaffStrings.teamsEmptyAction)
                    .font(.headline)
                    .foregroundStyle(SolennixColors.onPrimary)
                    .padding(.horizontal, Spacing.xl)
                    .padding(.vertical, 16)
                    .background(SolennixGradient.premium)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                    .shadowFab()
            }
            .padding(.bottom, Spacing.xxl)
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Skeleton List (Fix 12)

    private var teamSkeletonList: some View {
        List {
            Section {
                ForEach(0..<4, id: \.self) { _ in
                    TeamSkeletonRow()
                        .listRowBackground(SolennixColors.card)
                        .listRowSeparatorTint(SolennixColors.primary.opacity(0.2))
                }
                .accessibilityHidden(true)
            }
        }
        .listStyle(.insetGrouped)
        .listSectionSpacing(.compact)
        .scrollContentBackground(.hidden)
        .background(SolennixColors.surfaceGrouped)
    }

    // MARK: - Team Row (Fix 15: Dynamic Type stacking)

    private func teamRow(_ team: StaffTeam) -> some View {
        Group {
            if dynamicTypeSize >= .accessibility1 {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    HStack(spacing: Spacing.md) {
                        teamIcon
                        teamNameText(team)
                    }
                    teamSubtitle(team)
                }
                .padding(.vertical, Spacing.xs)
            } else {
                HStack(spacing: Spacing.md) {
                    teamIcon

                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        teamNameText(team)
                        teamSubtitle(team)
                    }
                }
                .padding(.vertical, Spacing.xs)
            }
        }
    }

    private var teamIcon: some View {
        ZStack {
            RoundedRectangle(cornerRadius: CornerRadius.md)
                .fill(SolennixColors.primaryLight)
                .frame(width: 44, height: 44)

            Image(systemName: "person.3.fill")
                .font(.body)
                .foregroundStyle(SolennixColors.primary)
        }
    }

    private func teamNameText(_ team: StaffTeam) -> some View {
        Text(team.name)
            .font(.body)
            .fontWeight(.semibold)
            .foregroundStyle(SolennixColors.text)
    }

    @ViewBuilder
    private func teamSubtitle(_ team: StaffTeam) -> some View {
        HStack(spacing: Spacing.sm) {
            if let role = team.roleLabel, !role.isEmpty {
                HStack(spacing: 2) {
                    Image(systemName: "briefcase")
                        .font(.caption2)
                    Text(role)
                        .font(.caption)
                }
                .foregroundStyle(SolennixColors.textSecondary)
            }

            if let count = team.memberCount {
                HStack(spacing: 2) {
                    Image(systemName: "person.2")
                        .font(.caption2)
                    // Fix 17: call StaffStrings.memberCount directly (no wrapper)
                    Text(StaffStrings.memberCount(count))
                        .font(.caption)
                }
                .foregroundStyle(SolennixColors.textTertiary)
            }
        }
    }

    // MARK: - Accessibility (Fix 11)

    private func teamAccessibilityLabel(_ team: StaffTeam) -> String {
        var parts = [team.name]
        if let role = team.roleLabel, !role.isEmpty { parts.append(role) }
        if let count = team.memberCount { parts.append(StaffStrings.memberCount(count)) }
        return parts.joined(separator: ", ")
    }
}

// MARK: - Team Skeleton Row (Fix 12)

/// Skeleton placeholder matching teamRow shape:
/// icon square + name bar + role/member-count bars.
struct TeamSkeletonRow: View {
    public init() {}

    public var body: some View {
        HStack(spacing: Spacing.md) {
            // Icon square stub
            RoundedRectangle(cornerRadius: CornerRadius.md)
                .fill(SolennixColors.surfaceAlt)
                .frame(width: 44, height: 44)

            VStack(alignment: .leading, spacing: Spacing.xs) {
                SkeletonLine(width: 160, height: 14)   // name — body
                SkeletonLine(width: 100, height: 10)   // role/member count — caption
            }
        }
        .padding(.vertical, Spacing.xs)
    }
}

// MARK: - Preview

#Preview("Staff Team List") {
    NavigationStack {
        StaffTeamListView(apiClient: APIClient())
    }
}
