import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Event Staff Detail View

/// Panel de solo lectura con el personal asignado a un evento. Se abre desde
/// el card "Personal asignado" en `EventDetailView`. Para editar la asignacion
/// se usa el form del evento (Step 4, subpanel de Personal).
public struct EventStaffDetailView: View {

    let eventId: String

    @State private var assignments: [EventStaff] = []
    @State private var isLoading: Bool = true
    @State private var errorMessage: String?

    private let apiClient: APIClient

    public init(eventId: String, apiClient: APIClient) {
        self.eventId = eventId
        self.apiClient = apiClient
    }

    public var body: some View {
        Group {
            if isLoading && assignments.isEmpty {
                ProgressView("Cargando...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                content
            }
        }
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle("Personal Asignado")
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadData() }
    }

    private var content: some View {
        ScrollView {
            VStack(spacing: Spacing.md) {
                if let errorMessage {
                    EmptyStateView(
                        icon: "wifi.exclamationmark",
                        title: "Error al cargar",
                        message: errorMessage,
                        actionTitle: "Reintentar"
                    ) {
                        Task { await loadData() }
                    }
                } else if assignments.isEmpty {
                    EmptyStateView(
                        icon: "person.3",
                        title: "Sin personal",
                        message: "Este evento no tiene colaboradores asignados. Editalo para agregar personal."
                    )
                } else {
                    HStack {
                        Text("\(assignments.count) colaboradores asignados")
                            .font(.subheadline)
                            .foregroundStyle(SolennixColors.textSecondary)
                        Spacer()
                        Text("Total: \(totalFee.asMXN)")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundStyle(SolennixColors.primary)
                    }
                    .padding(Spacing.md)
                    .background(SolennixColors.primaryLight)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))

                    ForEach(assignments) { assignment in
                        NavigationLink(value: Route.staffDetail(id: assignment.staffId)) {
                            assignmentRow(assignment)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, Spacing.lg)
        }
        .refreshable { await loadData() }
    }

    // MARK: - Assignment Row

    private func assignmentRow(_ assignment: EventStaff) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack(spacing: Spacing.sm) {
                Avatar(name: assignment.staffName ?? "?", photoURL: nil, size: 40)

                VStack(alignment: .leading, spacing: 2) {
                    Text(assignment.staffName ?? "Colaborador")
                        .font(.body)
                        .fontWeight(.semibold)
                        .foregroundStyle(SolennixColors.text)

                    let role = assignment.roleOverride ?? assignment.staffRoleLabel
                    if let role, !role.isEmpty {
                        Text(role)
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textSecondary)
                    }
                }

                Spacer()

                if let fee = assignment.feeAmount, fee > 0 {
                    Text(fee.asMXN)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundStyle(SolennixColors.primary)
                        .padding(.horizontal, Spacing.md)
                        .padding(.vertical, Spacing.xs)
                        .background(SolennixColors.primaryLight)
                        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                }
            }

            statusBadge(for: assignment.assignmentStatus)

            if let shift = formatShift(start: assignment.shiftStart, end: assignment.shiftEnd) {
                Label(shift, systemImage: "clock")
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)
            }

            if let phone = assignment.staffPhone, !phone.isEmpty {
                Label(phone, systemImage: "phone")
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)
            }

            if let email = assignment.staffEmail, !email.isEmpty {
                Label(email, systemImage: "envelope")
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)
                    .lineLimit(1)
            }

            if let notes = assignment.notes, !notes.isEmpty {
                Text(notes)
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)
                    .padding(.top, Spacing.xs)
            }

            if let sentAt = assignment.notificationSentAt, !sentAt.isEmpty {
                HStack(spacing: Spacing.xs) {
                    Image(systemName: "bell.badge.fill")
                        .font(.caption2)
                        .foregroundStyle(SolennixColors.success)
                    Text("Aviso enviado")
                        .font(.caption2)
                        .foregroundStyle(SolennixColors.success)
                }
            }
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
        .shadowSm()
    }

    // MARK: - Status Badge

    private func statusBadge(for status: AssignmentStatus) -> some View {
        HStack(spacing: 4) {
            Circle()
                .fill(statusColor(status))
                .frame(width: 6, height: 6)
            Text(statusLabel(status))
                .font(.caption2)
                .fontWeight(.semibold)
                .foregroundStyle(statusColor(status))
        }
        .padding(.horizontal, Spacing.sm)
        .padding(.vertical, 3)
        .background(statusBg(status))
        .clipShape(Capsule())
    }

    private func statusLabel(_ s: AssignmentStatus) -> String {
        switch s {
        case .pending:   return "Sin confirmar"
        case .confirmed: return "Confirmado"
        case .declined:  return "Rechazó"
        case .cancelled: return "Cancelado"
        }
    }

    private func statusColor(_ s: AssignmentStatus) -> Color {
        switch s {
        case .pending:   return SolennixColors.warning
        case .confirmed: return SolennixColors.success
        case .declined:  return SolennixColors.error
        case .cancelled: return SolennixColors.textTertiary
        }
    }

    private func statusBg(_ s: AssignmentStatus) -> Color {
        switch s {
        case .pending:   return SolennixColors.warningBg
        case .confirmed: return SolennixColors.successBg
        case .declined:  return SolennixColors.errorBg
        case .cancelled: return SolennixColors.surfaceAlt
        }
    }

    /// Formatea un rango de turno en HH:mm local para el usuario. Si uno
    /// solo de los extremos esta presente, lo muestra con "—" del otro lado.
    private func formatShift(start: String?, end: String?) -> String? {
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime]
        let isoFrac = ISO8601DateFormatter()
        isoFrac.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"

        func parse(_ s: String?) -> String? {
            guard let s, !s.isEmpty else { return nil }
            let d = iso.date(from: s) ?? isoFrac.date(from: s)
            return d.map { formatter.string(from: $0) }
        }

        let s = parse(start)
        let e = parse(end)
        if s == nil && e == nil { return nil }
        return "\(s ?? "—") – \(e ?? "—")"
    }

    // MARK: - Computed

    private var totalFee: Double {
        assignments.reduce(0) { $0 + ($1.feeAmount ?? 0) }
    }

    // MARK: - Data Loading

    @MainActor
    private func loadData() async {
        isLoading = true
        errorMessage = nil

        do {
            let result: [EventStaff] = try await apiClient.get(Endpoint.eventStaff(eventId))
            assignments = result
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
