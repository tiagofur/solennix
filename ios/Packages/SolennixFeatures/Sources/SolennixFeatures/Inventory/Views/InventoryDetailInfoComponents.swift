import SwiftUI
import SolennixCore
import SolennixDesign

// MARK: - Info Card

struct InventoryInfoCard: View {
    let item: InventoryItem

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text(InventoryStrings.information)
                .font(.caption.weight(.semibold))
                .foregroundStyle(SolennixColors.textSecondary)

            if let cost = item.unitCost, cost > 0 {
                HStack(spacing: Spacing.md) {
                    Image(systemName: "dollarsign.circle.fill")
                        .foregroundStyle(SolennixColors.primary)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(InventoryStrings.costPerUnit)
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textSecondary)
                        Text(cost.formatted(.currency(code: "MXN")))
                            .font(.subheadline.weight(.medium))
                    }
                }

                Divider()

                HStack(spacing: Spacing.md) {
                    Image(systemName: "chart.bar.fill")
                        .foregroundStyle(SolennixColors.textTertiary)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(InventoryStrings.totalStockValue)
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textSecondary)
                        Text((cost * item.currentStock).formatted(.currency(code: "MXN")))
                            .font(.subheadline.weight(.medium))
                    }
                }
            } else {
                Text(InventoryStrings.noUnitCost)
                    .font(.subheadline)
                    .foregroundStyle(SolennixColors.textTertiary)
                    .italic()
            }

            // Fix #1: lastUpdated display via cached Date.from(isoString:) helper — no per-render allocation
            if let lastUpdated = Date.from(isoString: item.lastUpdated) {
                Divider()

                HStack(spacing: Spacing.md) {
                    Image(systemName: "clock")
                        .foregroundStyle(SolennixColors.textTertiary)
                        .accessibilityHidden(true)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(InventoryStrings.lastUpdated)
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textSecondary)
                        Text(lastUpdated.formattedServerDayTemplate("dMMMyyyy HH:mm", locale: Date.mexicanLocale))
                            .font(.subheadline.weight(.medium))
                    }
                }
            }
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .solennixRow()
        .listRowInsets(EdgeInsets(top: Spacing.sm, leading: Spacing.md, bottom: Spacing.sm, trailing: Spacing.md))
    }
}
