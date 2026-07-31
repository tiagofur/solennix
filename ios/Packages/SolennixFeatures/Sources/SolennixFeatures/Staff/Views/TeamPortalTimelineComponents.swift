import SwiftUI
import SolennixCore
import SolennixDesign

// MARK: - TeamPortalTimelineRow

/// Compact assignment row used by the calendar week/day views.
struct TeamPortalTimelineRow: View {
    let assignment: TeamMemberAssignment
    let timeRange: String?
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(alignment: .top, spacing: Spacing.sm) {
                RoundedRectangle(cornerRadius: 2)
                    .fill(SolennixColors.primary)
                    .frame(width: 3, height: 32)
                    .accessibilityHidden(true)

                VStack(alignment: .leading, spacing: 2) {
                    Text(assignment.eventName)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(SolennixColors.text)

                    if let timeRange {
                        Text(timeRange)
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textSecondary)
                    }
                }

                Spacer()
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(Spacing.sm)
            .background(SolennixColors.surfaceGrouped)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
            // VoiceOver: merge event name + time into one utterance.
            .accessibilityElement(children: .combine)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - TeamPortalTimelineSection

/// "Recent changes" section: header with unread count badge + timeline rows.
/// `onSelect` is fired when the user taps a row, with the matching assignment
/// (if any) so the parent can mark-read + navigate + open the detail sheet.
struct TeamPortalTimelineSection: View {
    let timeline: [TeamMemberChangeEvent]
    let unreadCount: Int
    let onSelect: (TeamMemberChangeEvent) -> Void

    var body: some View {
        HStack {
            Text(teamPortalTr("team_portal.recent_changes", "Cambios recientes"))
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(SolennixColors.textSecondary)

            Spacer()

            Text("\(unreadCount)")
                .font(.caption.weight(.semibold))
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(SolennixColors.surfaceGrouped)
                .clipShape(Capsule())
                .foregroundStyle(SolennixColors.textSecondary)
        }

        if timeline.isEmpty {
            Text(teamPortalTr("team_portal.no_recent_changes", "Sin cambios recientes en tus asignaciones."))
                .font(.subheadline)
                .foregroundStyle(SolennixColors.textSecondary)
                .padding(Spacing.md)
                .frame(maxWidth: .infinity, alignment: .leading)
                .solennixCard(radius: CornerRadius.lg, border: false)
        } else {
            ForEach(timeline) { item in
                TimelineRowButton(item: item, onSelect: onSelect)
            }
        }
    }
}

// MARK: - TimelineRowButton

/// One tappable timeline row (header + label + date + optional "Nuevo" badge).
private struct TimelineRowButton: View {
    let item: TeamMemberChangeEvent
    let onSelect: (TeamMemberChangeEvent) -> Void

    var body: some View {
        Button {
            onSelect(item)
        } label: {
            HStack(alignment: .top, spacing: Spacing.sm) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(item.eventName)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(SolennixColors.text)
                    Text(changeLabel(item.changeType))
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                    Text(item.eventDate)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                }

                Spacer()

                if item.readAt == nil {
                    Text(teamPortalTr("common.new", "Nuevo"))
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(SolennixColors.warning.opacity(0.18))
                        .foregroundStyle(SolennixColors.warning)
                        .clipShape(Capsule())
                }
            }
            .padding(Spacing.md)
            .frame(maxWidth: .infinity, alignment: .leading)
            .solennixCard(radius: CornerRadius.lg, border: false)
        }
        .buttonStyle(.plain)
    }

    private func changeLabel(_ changeType: String) -> String {
        switch changeType {
        case "location_changed": return teamPortalTr("team_portal.change_location", "Cambio de ubicación")
        case "role_changed": return teamPortalTr("team_portal.change_role", "Cambio de rol")
        case "shift_changed": return teamPortalTr("team_portal.change_shift", "Cambio de turno")
        case "status_changed": return teamPortalTr("team_portal.change_status", "Cambio de estado")
        case "assignment_added": return teamPortalTr("team_portal.new_assignment", "Nueva asignación")
        case "assignment_removed": return teamPortalTr("team_portal.removed_assignment", "Asignación removida")
        default: return teamPortalTr("team_portal.updated_assignment", "Actualización de asignación")
        }
    }
}
