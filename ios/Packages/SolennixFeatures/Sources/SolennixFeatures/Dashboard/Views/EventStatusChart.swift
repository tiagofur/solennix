import SwiftUI
import SolennixCore
import SolennixDesign

// MARK: - Event Status Chart

/// Simple horizontal bar chart showing event counts per status.
public struct EventStatusChart: View {

    let statusCounts: [EventStatus: Int]

    public init(statusCounts: [EventStatus: Int]) {
        self.statusCounts = statusCounts
    }

    private var totalCount: Int {
        statusCounts.values.reduce(0, +)
    }

    private func tr(_ key: String, _ value: String) -> String {
        FeatureL10n.text(key, value)
    }

    /// Ordered statuses for consistent display.
    private var orderedStatuses: [EventStatus] {
        [.quoted, .confirmed, .completed, .cancelled].filter { statusCounts[$0, default: 0] > 0 }
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text(tr("dashboard.event_status", "Estado de eventos"))
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundStyle(SolennixColors.text)

            // Bar chart
            GeometryReader { geometry in
                HStack(spacing: 2) {
                    ForEach(orderedStatuses, id: \.self) { status in
                        let count = statusCounts[status, default: 0]
                        let proportion = totalCount > 0 ? CGFloat(count) / CGFloat(totalCount) : 0

                        RoundedRectangle(cornerRadius: CornerRadius.sm)
                            .fill(colorForStatus(status))
                            .frame(width: max(geometry.size.width * proportion - 2, 4))
                    }
                }
            }
            .frame(height: 12)

            // Labels
            HStack(spacing: Spacing.md) {
                ForEach(orderedStatuses, id: \.self) { status in
                    let count = statusCounts[status, default: 0]
                    HStack(spacing: Spacing.xs) {
                        Circle()
                            .fill(colorForStatus(status))
                            .frame(width: 8, height: 8)

                        Text("\(count)")
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundStyle(SolennixColors.text)

                        Text(labelForStatus(status))
                            .font(.caption2)
                            .foregroundStyle(SolennixColors.textSecondary)
                    }
                }
            }
        }
        .padding(Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
        .shadowSm()
        // VoiceOver: collapse the bar + legend dots into a single summary so
        // the user hears "Estado de Eventos: 3 cotizados, 5 confirmados, 2
        // completados, 1 cancelado" instead of ~12 unlabeled pieces.
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(tr("dashboard.event_status_accessibility", "Estado de eventos del mes"))
        .accessibilityValue(accessibilitySummary)
    }

    private var accessibilitySummary: String {
        orderedStatuses.map { status in
            "\(statusCounts[status, default: 0]) \(labelForStatus(status).lowercased())"
        }.joined(separator: ", ")
    }

    // MARK: - Helpers

    private func colorForStatus(_ status: EventStatus) -> Color {
        switch status {
        case .quoted:    return SolennixColors.statusQuoted
        case .confirmed: return SolennixColors.statusConfirmed
        case .completed: return SolennixColors.statusCompleted
        case .cancelled: return SolennixColors.statusCancelled
        }
    }

    private func labelForStatus(_ status: EventStatus) -> String {
        switch status {
        case .quoted:    return tr("dashboard.status.quoted", "Cotizado")
        case .confirmed: return tr("dashboard.status.confirmed", "Confirmado")
        case .completed: return tr("dashboard.status.completed", "Completado")
        case .cancelled: return tr("dashboard.status.cancelled", "Cancelado")
        }
    }
}

// MARK: - Preview

#Preview("Event Status Chart") {
    EventStatusChart(statusCounts: [
        .quoted: 3,
        .confirmed: 5,
        .completed: 2,
        .cancelled: 1
    ])
    .padding()
    .background(SolennixColors.surfaceGrouped)
}
