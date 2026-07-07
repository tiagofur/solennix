import SwiftUI
import SolennixDesign

// MARK: - Dashboard Shared View Components

struct DashboardQuickActionButton: View {
    let icon: String
    let label: String
    let color: Color

    var body: some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: icon)
                .font(.body)
                .foregroundStyle(color)

            Text(label)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(SolennixColors.text)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.md)
        .solennixCard(border: false)
    }
}

struct DashboardLowStockCard: View {
    let itemName: String
    let stockText: String

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text(itemName)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(SolennixColors.text)

                Text(stockText)
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)
            }

            Spacer()

            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(SolennixColors.warning)
                .font(.body)
        }
        .padding(Spacing.md)
        .solennixCard(border: false)
    }
}

struct DashboardDateBox: View {
    let month: String
    let day: String

    @ScaledMetric(relativeTo: .body) private var size: CGFloat = 48
    private var cappedSize: CGFloat { min(size, 72) }

    var body: some View {
        VStack(spacing: Spacing.xxs) {
            Text(month)
                .font(.caption2)
                .fontWeight(.bold)
                .foregroundStyle(SolennixColors.primary)
                .textCase(.uppercase)

            Text(day)
                .font(.title3)
                .fontWeight(.bold)
                .foregroundStyle(SolennixColors.text)
        }
        .frame(width: cappedSize, height: cappedSize)
        .background(SolennixColors.primaryLight)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
    }
}

struct DashboardEmptyCardState: View {
    let icon: String
    let title: String

    // MARK: - @ScaledMetric sizes (Dynamic Type-safe, capped)
    @ScaledMetric(relativeTo: .body) private var emptyIconSize: CGFloat = 40
    private var cappedEmptyIconSize: CGFloat { min(emptyIconSize, 56) }

    var body: some View {
        VStack(spacing: Spacing.md) {
            Image(systemName: icon)
                .font(.system(size: cappedEmptyIconSize))
                .foregroundStyle(SolennixColors.textTertiary)

            Text(title)
                .font(.subheadline)
                .foregroundStyle(SolennixColors.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.xxl)
        .solennixCard(border: false)
    }
}
