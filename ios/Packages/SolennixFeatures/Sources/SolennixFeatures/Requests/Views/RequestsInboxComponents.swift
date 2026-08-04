import SwiftUI
import SolennixCore
import SolennixDesign

// MARK: - Status badge

struct PublicRequestStatusBadge: View {
    let status: PublicRequestStatus

    var body: some View {
        Text(RequestsStrings.statusLabel(status))
            .font(.caption2.weight(.semibold))
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .foregroundStyle(foreground)
            .background(background, in: Capsule())
    }

    private var foreground: Color {
        switch status {
        case .pending, .infoRequested: return SolennixColors.warning
        case .responded, .acceptedByClient: return SolennixColors.info
        case .booked: return SolennixColors.success
        case .declinedProvider, .declinedClient, .expired: return SolennixColors.error
        }
    }

    private var background: Color {
        foreground.opacity(0.12)
    }
}

// MARK: - List row

struct PublicRequestRow: View {
    let request: PublicRequest

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    if !request.isRead {
                        Circle()
                            .fill(SolennixColors.primary)
                            .frame(width: 8, height: 8)
                            .accessibilityLabel(RequestsStrings.unreadBadgeA11y)
                    }
                    Text(request.displayName)
                        .font(.body.weight(request.isRead ? .regular : .semibold))
                        .foregroundStyle(SolennixColors.text)
                        .lineLimit(1)
                }
                Text(request.eventType ?? RequestsStrings.noEventType)
                    .font(.subheadline)
                    .foregroundStyle(SolennixColors.textSecondary)
                    .lineLimit(1)
                HStack(spacing: 8) {
                    if let date = request.eventDate, !date.isEmpty {
                        Label(date, systemImage: "calendar")
                    }
                    if let location = request.location, !location.isEmpty {
                        Label(location, systemImage: "mappin")
                    }
                }
                .font(.caption)
                .foregroundStyle(SolennixColors.textTertiary)
                .lineLimit(1)
            }
            Spacer(minLength: 8)
            PublicRequestStatusBadge(status: request.status)
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Skeleton

struct PublicRequestSkeletonRow: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            RoundedRectangle(cornerRadius: 4)
                .fill(SolennixColors.surfaceAlt)
                .frame(width: 140, height: 14)
            RoundedRectangle(cornerRadius: 4)
                .fill(SolennixColors.surfaceAlt)
                .frame(width: 200, height: 12)
            RoundedRectangle(cornerRadius: 4)
                .fill(SolennixColors.surfaceAlt)
                .frame(width: 100, height: 10)
        }
        .padding(.vertical, 8)
        .redacted(reason: .placeholder)
    }
}
