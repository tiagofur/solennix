import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

public struct TeamMemberPortalView: View {

    @Environment(\.horizontalSizeClass) private var sizeClass
    @State private var viewModel: TeamMemberPortalViewModel

    public init(apiClient: APIClient) {
        _viewModel = State(initialValue: TeamMemberPortalViewModel(apiClient: apiClient))
    }

    public var body: some View {
        NavigationStack {
            content
                .navigationTitle("Mis asignaciones")
                .navigationBarTitleDisplayMode(.large)
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button {
                            Task { await viewModel.loadAssignments() }
                        } label: {
                            Image(systemName: "arrow.clockwise")
                        }
                        .accessibilityLabel("Recargar asignaciones")
                    }
                }
        }
        .task {
            await viewModel.loadAssignments()
        }
        .refreshable {
            await viewModel.loadAssignments()
        }
        .background(SolennixColors.surfaceGrouped.ignoresSafeArea())
    }

    @ViewBuilder
    private var content: some View {
        if let errorMessage = viewModel.errorMessage, viewModel.assignments.isEmpty, !viewModel.isLoading {
            EmptyStateView(
                icon: "exclamationmark.triangle.fill",
                title: "No pudimos cargar tus asignaciones",
                message: errorMessage,
                actionTitle: "Reintentar"
            ) {
                Task { await viewModel.loadAssignments() }
            }
        } else if viewModel.isLoading && viewModel.assignments.isEmpty {
            ProgressView()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if viewModel.assignments.isEmpty {
            EmptyStateView(
                icon: "calendar.badge.clock",
                title: "Todavia no tenes asignaciones",
                message: "Cuando te asignen a un evento, va a aparecer aca con respuesta rapida."
            ) {}
        } else {
            ScrollView {
                LazyVStack(spacing: Spacing.md) {
                    ForEach(viewModel.assignments) { assignment in
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
                .padding(.horizontal, sizeClass == .regular ? Spacing.xxxl : Spacing.xl)
                .padding(.vertical, Spacing.lg)
            }
        }
    }
}

private struct TeamMemberAssignmentCard: View {

    let assignment: TeamMemberAssignment
    let isResponding: Bool
    let onAccept: () -> Void
    let onDecline: () -> Void

    private var isPending: Bool {
        assignment.status == .pending
    }

    private var feeLabel: String? {
        guard let feeAmount = assignment.feeAmount else { return nil }
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "MXN"
        formatter.maximumFractionDigits = 2
        return formatter.string(from: NSNumber(value: feeAmount))
    }

    private var statusLabel: String {
        switch assignment.status {
        case .pending: return "Pendiente"
        case .confirmed: return "Confirmada"
        case .declined: return "Rechazada"
        case .cancelled: return "Cancelada"
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
                Text("Rol: \(roleOverride)")
                    .font(.subheadline)
                    .foregroundStyle(SolennixColors.textSecondary)
            }

            if let feeLabel {
                Text("Pago: \(feeLabel)")
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
                        Text("Rechazar")
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(SolennixColors.error.opacity(0.14))
                            .foregroundStyle(SolennixColors.error)
                            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                    }
                    .disabled(isResponding)

                    Button {
                        onAccept()
                    } label: {
                        Text("Aceptar")
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(SolennixColors.primary)
                            .foregroundStyle(.white)
                            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                    }
                    .disabled(isResponding)
                }
            }
        }
        .padding(Spacing.lg)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
        .shadowSm()
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