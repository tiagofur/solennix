import SwiftUI
import SolennixCore
import SolennixDesign

struct EventDetailQuickInfoItem: View {
    let icon: String
    let label: String
    let value: String
    var lineLimit: Int? = 1

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
                    .lineLimit(lineLimit)
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

    @ScaledMetric(relativeTo: .body) private var size: CGFloat = 56
    private var cappedSize: CGFloat { min(size, 84) }

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
        .frame(width: cappedSize, height: cappedSize)
        .background(SolennixColors.primaryLight)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
    }
}
