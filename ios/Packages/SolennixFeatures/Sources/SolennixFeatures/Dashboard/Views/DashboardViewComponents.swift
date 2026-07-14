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
                .accessibilityHidden(true)

            Text(label)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(SolennixColors.text)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.md)
        .solennixCard(border: false)
        // VoiceOver: label text alone announces the action; icon is decorative.
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.isButton)
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
                .accessibilityHidden(true)
        }
        .padding(Spacing.md)
        .solennixCard(border: false)
        // VoiceOver: merge item name + stock into one utterance
        // ("Café, 2 unidades") instead of two separate pieces.
        .accessibilityElement(children: .combine)
        .accessibilityLabel(Text(itemName))
        .accessibilityValue(Text(stockText))
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
        // VoiceOver: read "Julio 14" as a single date label.
        .accessibilityElement(children: .combine)
        .accessibilityLabel(Text("\(month) \(day)"))
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
                .accessibilityHidden(true)

            Text(title)
                .font(.subheadline)
                .foregroundStyle(SolennixColors.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.xxl)
        .solennixCard(border: false)
        // VoiceOver: icon is decorative; the title text is the announcement.
        .accessibilityElement(children: .combine)
    }
}
