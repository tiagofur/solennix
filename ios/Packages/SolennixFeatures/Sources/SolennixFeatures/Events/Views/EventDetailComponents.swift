import SwiftUI
import SolennixCore
import SolennixDesign

struct EventDetailQuickInfoItem: View {
    let icon: String
    let label: String
    let value: String

    var body: some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: icon)
                .font(.caption)
                .foregroundStyle(SolennixColors.primary)
                .frame(width: 16)

            VStack(alignment: .leading, spacing: 2) {
                Text(label)
                    .font(.caption2)
                    .foregroundStyle(SolennixColors.textTertiary)
                    .textCase(.uppercase)

                Text(value)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.text)
                    .lineLimit(1)
            }

            Spacer()
        }
    }
}

struct EventDetailMiniKPI: View {
    let label: String
    let value: String
    let color: Color
    let bgColor: Color

    var body: some View {
        VStack(spacing: Spacing.xs) {
            Text(value)
                .font(.caption)
                .fontWeight(.bold)
                .foregroundStyle(color)
                .lineLimit(1)
                .minimumScaleFactor(0.7)

            Text(label)
                .font(.caption2)
                .foregroundStyle(SolennixColors.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.sm)
        .background(bgColor)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
    }
}

struct EventDetailDateBox: View {
    let month: String
    let day: String

    var body: some View {
        VStack(spacing: Spacing.xxs) {
            Text(month)
                .font(.caption2)
                .fontWeight(.semibold)
                .foregroundStyle(SolennixColors.primary)
                .textCase(.uppercase)

            Text(day)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundStyle(SolennixColors.text)
        }
        .frame(width: 56, height: 56)
        .background(SolennixColors.primaryLight)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
    }
}

struct EventDetailSummaryNavCard: View {
    let icon: String
    let title: String
    let count: Int?
    let subtitle: String?
    let color: Color
    let route: Route

    var body: some View {
        NavigationLink(value: route) {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                HStack {
                    Image(systemName: icon)
                        .font(.body)
                        .foregroundStyle(color)

                    Spacer()

                    if let count, count > 0 {
                        Text("\(count)")
                            .font(.caption)
                            .fontWeight(.bold)
                            .foregroundStyle(color)
                            .padding(.horizontal, Spacing.sm)
                            .padding(.vertical, 2)
                            .background(color.opacity(0.1))
                            .clipShape(Capsule())
                    }
                }

                Text(title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.text)

                if let subtitle, !subtitle.isEmpty {
                    Text(subtitle)
                        .font(.caption2)
                        .foregroundStyle(SolennixColors.textSecondary)
                        .lineLimit(1)
                } else {
                    Image(systemName: "chevron.right")
                        .font(.caption2)
                        .foregroundStyle(SolennixColors.textTertiary)
                }
            }
            .padding(Spacing.md)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(SolennixColors.card)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
            .shadowSm()
        }
        .buttonStyle(.plain)
    }
}
