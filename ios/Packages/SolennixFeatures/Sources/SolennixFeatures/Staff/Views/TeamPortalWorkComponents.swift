import SwiftUI
import SolennixCore
import SolennixDesign

// MARK: - TeamMemberAssignmentCard

/// Assignment card used in the Work section's pending / today / next-7-days lists.
struct TeamMemberAssignmentCard: View {

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
        case .pending: return teamPortalTr("team_portal.pending", "Pendiente")
        case .confirmed: return teamPortalTr("team_portal.confirmed", "Confirmada")
        case .declined: return teamPortalTr("team_portal.declined", "Rechazada")
        case .cancelled: return teamPortalTr("team_portal.cancelled", "Cancelada")
        }
    }

    var body: some View {
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
            // VoiceOver: merge event name + date + status badge into one
            // utterance ("Boda García, 2026-07-20, Pendiente").
            .accessibilityElement(children: .combine)

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
                        Text(teamPortalTr("team_portal.reject", "Rechazar"))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(SolennixColors.error.opacity(0.14))
                            .foregroundStyle(SolennixColors.error)
                            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                    }
                    .disabled(isResponding)

                    PremiumButton(
                        title: teamPortalTr("common.accept", "Aceptar"),
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

// MARK: - TeamPortalAssignmentList

/// Collapses the three near-identical list builders (pending / today / next-7-days)
/// into one reusable section.
struct TeamPortalAssignmentList: View {
    let title: String
    let emptyText: String
    let assignments: [TeamMemberAssignment]
    let isResponding: Bool
    /// Optional card tap (used by the calendar day list to open the detail sheet).
    var onTap: ((TeamMemberAssignment) -> Void)? = nil
    let onAccept: (TeamMemberAssignment) -> Void
    let onDecline: (TeamMemberAssignment) -> Void

    var body: some View {
        Text(title)
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(SolennixColors.textSecondary)

        if assignments.isEmpty {
            Text(emptyText)
                .font(.subheadline)
                .foregroundStyle(SolennixColors.textSecondary)
                .padding(Spacing.lg)
                .frame(maxWidth: .infinity, alignment: .leading)
                .solennixCard(radius: CornerRadius.lg, border: false)
        } else {
            ForEach(assignments) { assignment in
                TeamMemberAssignmentCard(
                    assignment: assignment,
                    isResponding: isResponding,
                    onTap: {
                        onTap?(assignment)
                    },
                    onAccept: {
                        onAccept(assignment)
                    },
                    onDecline: {
                        onDecline(assignment)
                    }
                )
            }
        }
    }
}
