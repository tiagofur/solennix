import SwiftUI
import SolennixCore
import SolennixDesign

struct AttentionEventsCard: View {

    let events: [DashboardAttentionEvent]

    var body: some View {
        if !events.isEmpty {
            VStack(alignment: .leading, spacing: Spacing.md) {
                header

                VStack(spacing: Spacing.sm) {
                    ForEach(events) { attentionEvent in
                        NavigationLink(value: Route.eventDetail(id: attentionEvent.event.id)) {
                            attentionEventRow(attentionEvent)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .padding(Spacing.md)
            .background(SolennixColors.card)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
            .shadowSm()
        }
    }

    private var header: some View {
        HStack(spacing: Spacing.sm) {
            ZStack {
                Circle()
                    .fill(SolennixColors.primaryLight)
                    .frame(width: 36, height: 36)

                Image(systemName: "exclamationmark.circle.fill")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(SolennixColors.warning)
            }

            Text("Requieren atencion")
                .font(.headline)
                .foregroundStyle(SolennixColors.text)

            Text("\(events.count)")
                .font(.caption)
                .fontWeight(.bold)
                .foregroundStyle(SolennixColors.warning)
                .padding(.horizontal, Spacing.sm)
                .padding(.vertical, Spacing.xs)
                .background(SolennixColors.warning.opacity(0.15))
                .clipShape(Capsule())

            Spacer()
        }
    }

    private func attentionEventRow(_ attentionEvent: DashboardAttentionEvent) -> some View {
        HStack(alignment: .top, spacing: Spacing.md) {
            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text(attentionEvent.event.serviceType)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.text)
                    .multilineTextAlignment(.leading)

                Text(attentionEvent.clientName)
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)

                HStack(spacing: Spacing.sm) {
                    Label(compactDate(for: attentionEvent.event.eventDate), systemImage: "calendar")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textTertiary)

                    if shouldShowPendingAmount(for: attentionEvent) {
                        Text(attentionEvent.outstandingAmount.asMXN)
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundStyle(SolennixColors.warning)
                    }
                }
            }

            Spacer(minLength: Spacing.sm)

            VStack(alignment: .trailing, spacing: Spacing.sm) {
                reasonBadge(for: attentionEvent.kind)

                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textTertiary)
            }
        }
        .padding(Spacing.md)
        .background(SolennixColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
        // VoiceOver: one utterance per row — "Pago pendiente: Boda de Ana,
        // 15 Jun, restan $8,500. Abrir detalle." — instead of one swipe per
        // chip, label, icon.
        .accessibilityElement(children: .combine)
        .accessibilityLabel(accessibilityLabel(for: attentionEvent))
        .accessibilityHint("Abrir detalle del evento")
    }

    private func accessibilityLabel(for attentionEvent: DashboardAttentionEvent) -> String {
        var parts = [
            attentionEvent.kind.title,
            attentionEvent.event.serviceType,
            "de \(attentionEvent.clientName)",
            compactDate(for: attentionEvent.event.eventDate),
        ]
        if shouldShowPendingAmount(for: attentionEvent) {
            parts.append("restan \(attentionEvent.outstandingAmount.asMXN)")
        }
        return parts.joined(separator: ", ")
    }

    private func reasonBadge(for kind: DashboardAttentionEventKind) -> some View {
        Text(kind.title)
            .font(.caption2)
            .fontWeight(.bold)
            .foregroundStyle(reasonForegroundColor(for: kind))
            .padding(.horizontal, Spacing.sm)
            .padding(.vertical, Spacing.xs)
            .background(reasonBackgroundColor(for: kind))
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.sm))
    }

    private func shouldShowPendingAmount(for attentionEvent: DashboardAttentionEvent) -> Bool {
        attentionEvent.kind == .pendingPayment && attentionEvent.outstandingAmount > 0.01
    }

    private func compactDate(for dateString: String) -> String {
        guard let date = Self.inputDateFormatter.date(from: String(dateString.prefix(10))) else {
            return String(dateString.prefix(10))
        }

        return Self.outputDateFormatter.string(from: date)
    }

    private func reasonForegroundColor(for kind: DashboardAttentionEventKind) -> Color {
        switch kind {
        case .overdueEvent:
            return SolennixColors.error
        case .pendingPayment:
            return SolennixColors.warning
        case .unconfirmedEvent:
            return SolennixColors.primary
        }
    }

    private func reasonBackgroundColor(for kind: DashboardAttentionEventKind) -> Color {
        switch kind {
        case .overdueEvent:
            return SolennixColors.errorBg
        case .pendingPayment:
            return SolennixColors.warning.opacity(0.15)
        case .unconfirmedEvent:
            return SolennixColors.primaryLight
        }
    }

    private static let inputDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    private static let outputDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "es_MX")
        formatter.dateFormat = "d MMM"
        return formatter
    }()
}

#Preview("Attention Events Card") {
    NavigationStack {
        AttentionEventsCard(events: [])
            .padding()
            .background(SolennixColors.surfaceGrouped)
    }
}
