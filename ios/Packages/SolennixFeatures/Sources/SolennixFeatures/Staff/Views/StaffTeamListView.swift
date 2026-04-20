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
            .navigationTitle("Equipos")
            .navigationBarTitleDisplayMode(.large)
            .searchable(text: $viewModel.searchText, prompt: "Buscar equipos")
            .refreshable { await viewModel.load() }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    NavigationLink(value: Route.staffTeamForm()) {
                        Image(systemName: "plus")
                            .font(.body)
                            .foregroundStyle(SolennixColors.primary)
                            .accessibilityLabel("Crear equipo")
                    }
                }
            }
            .confirmationDialog(
                "Eliminar equipo",
                isPresented: $viewModel.showDeleteConfirm,
                presenting: viewModel.deleteTarget
            ) { team in
                Button("Eliminar", role: .destructive) {
                    HapticsHelper.play(.warning)
                    Task { await viewModel.deleteTeam(team) }
                }
                Button("Cancelar", role: .cancel) {}
            } message: { team in
                Text("Se eliminara el equipo \(team.name). Los colaboradores individuales no se borran.")
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
                title: "Error al cargar",
                message: error,
                actionTitle: "Reintentar"
            ) {
                Task { await viewModel.load() }
            }
        } else if viewModel.isLoading && viewModel.teams.isEmpty {
            ProgressView("Cargando equipos...")
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if viewModel.filteredTeams.isEmpty && !viewModel.isLoading {
            if viewModel.searchText.isEmpty {
                EmptyStateView(
                    icon: "person.3.sequence",
                    title: "Sin equipos todavia",
                    message: "Agrupa a tu equipo de meseros o fotografos para asignarlos a un evento con un solo toque.",
                    actionTitle: "Crear equipo"
                ) {
                    // El boton del toolbar navega — este CTA es visual.
                }
            } else {
                EmptyStateView(
                    icon: "magnifyingglass",
                    title: "Sin resultados",
                    message: "No encontramos equipos que coincidan con tu busqueda"
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
                        Label("Eliminar", systemImage: "trash")
                    }

                    NavigationLink(value: Route.staffTeamForm(id: team.id)) {
                        Label("Editar", systemImage: "pencil")
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
        count == 1 ? "1 miembro" : "\(count) miembros"
    }
}

// MARK: - Preview

#Preview("Staff Team List") {
    NavigationStack {
        StaffTeamListView(apiClient: APIClient())
    }
}
