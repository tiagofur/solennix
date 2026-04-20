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
                ProgressView("Cargando equipo...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let team {
                scrollContent(team)
            } else {
                EmptyStateView(
                    icon: "exclamationmark.triangle",
                    title: "Error",
                    message: errorMessage ?? "No se pudo cargar el equipo"
                )
            }
        }
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle(team?.name ?? "Equipo")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if team != nil {
                ToolbarItem(placement: .topBarTrailing) {
                    NavigationLink(value: Route.staffTeamForm(id: teamId)) {
                        Text("Editar")
                            .foregroundStyle(SolennixColors.primary)
                    }
                }
            }
        }
        .confirmationDialog(
            "Eliminar equipo",
            isPresented: $showDeleteConfirm
        ) {
            Button("Eliminar", role: .destructive) {
                Task {
                    do {
                        try await apiClient.deleteStaffTeam(id: teamId)
                        dismiss()
                    } catch {
                        errorMessage = "Error al eliminar el equipo"
                    }
                }
            }
            Button("Cancelar", role: .cancel) {}
        } message: {
            Text("Se eliminara el equipo \(team?.name ?? ""). Los colaboradores individuales no se borran.")
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

                deleteButton
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
                Text(count == 1 ? "1 miembro" : "\(count) miembros")
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textTertiary)
            }
        }
        .padding(Spacing.lg)
        .frame(maxWidth: .infinity)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
        .shadowSm()
    }

    // MARK: - Notes

    private func notesCard(_ notes: String) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack(spacing: Spacing.sm) {
                Image(systemName: "note.text")
                    .font(.caption)
                    .foregroundStyle(SolennixColors.primary)
                Text("Notas")
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
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
        .shadowSm()
    }

    // MARK: - Members

    private func membersSection(_ team: StaffTeam) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text("Miembros")
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundStyle(SolennixColors.textSecondary)
                .padding(.horizontal, Spacing.sm)

            let sorted = (team.members ?? []).sorted { $0.position < $1.position }

            if sorted.isEmpty {
                Text("Este equipo todavia no tiene miembros. Editalo para agregarlos.")
                    .font(.body)
                    .foregroundStyle(SolennixColors.textTertiary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(Spacing.md)
                    .background(SolennixColors.card)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
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
                    Text(member.staffName ?? "(sin nombre)")
                        .font(.body)
                        .fontWeight(.semibold)
                        .foregroundStyle(SolennixColors.text)

                    if member.isLead {
                        Image(systemName: "crown.fill")
                            .font(.caption2)
                            .foregroundStyle(SolennixColors.primary)
                            .accessibilityLabel("Lidera el equipo")
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
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
    }

    // MARK: - Delete

    private var deleteButton: some View {
        Button {
            showDeleteConfirm = true
        } label: {
            HStack(spacing: Spacing.sm) {
                Image(systemName: "trash")
                Text("Eliminar equipo")
            }
            .font(.subheadline)
            .fontWeight(.medium)
            .foregroundStyle(SolennixColors.error)
            .frame(maxWidth: .infinity)
            .padding(Spacing.md)
            .background(SolennixColors.card)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
        }
        .buttonStyle(.plain)
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
                errorMessage = "Ocurrio un error inesperado."
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
