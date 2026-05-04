import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Staff Team List View

public struct StaffTeamListView: View {

    @State private var viewModel: StaffTeamListViewModel

    public init(apiClient: APIClient) {
        _viewModel = State(initialValue: StaffTeamListViewModel(apiClient: apiClient))
    }

    public var body: some View {
        content
            .background(SolennixColors.surfaceGrouped)
            .navigationTitle(StaffStrings.teamsTitle)
            .navigationBarTitleDisplayMode(.large)
            .searchable(text: $viewModel.searchText, prompt: StaffStrings.teamsSearchPrompt)
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
                    Task { await viewModel.deleteTeam(team) }
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
            ProgressView(StaffStrings.teamsLoading)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if viewModel.filteredTeams.isEmpty && !viewModel.isLoading {
            if viewModel.searchText.isEmpty {
                EmptyStateView(
                    icon: "person.3.sequence",
                    title: StaffStrings.teamsEmptyTitle,
                    message: StaffStrings.teamsEmptyMessage,
                    actionTitle: StaffStrings.teamsEmptyAction
                ) {
                    // El boton del toolbar navega — este CTA es visual.
                }
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

    private var teamList: some View {
        List {
            ForEach(viewModel.filteredTeams) { team in
                NavigationLink(value: Route.staffTeamDetail(id: team.id)) {
                    teamRow(team)
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
                    .tint(.blue)
                }
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .background(SolennixColors.surfaceGrouped)
    }

    // MARK: - Row

    private func teamRow(_ team: StaffTeam) -> some View {
        HStack(spacing: Spacing.md) {
            ZStack {
                RoundedRectangle(cornerRadius: CornerRadius.md)
                    .fill(SolennixColors.primaryLight)
                    .frame(width: 44, height: 44)

                Image(systemName: "person.3.fill")
                    .font(.body)
                    .foregroundStyle(SolennixColors.primary)
            }

            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text(team.name)
                    .font(.body)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.text)

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
                            Text(memberCountLabel(count))
                                .font(.caption)
                        }
                        .foregroundStyle(SolennixColors.textTertiary)
                    }
                }
            }
        }
        .padding(.vertical, Spacing.xs)
    }

    private func memberCountLabel(_ count: Int) -> String {
        StaffStrings.memberCount(count)
    }
}

// MARK: - Preview

#Preview("Staff Team List") {
    NavigationStack {
        StaffTeamListView(apiClient: APIClient())
    }
}
