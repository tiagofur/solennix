import SwiftUI
import SolennixCore
import SolennixDesign

// MARK: - KPI Section

struct InventoryKPISection: View {
    let item: InventoryItem
    let stockValue: Double

    var body: some View {
        HStack(spacing: 0) {
            InventoryKPICard(
                icon: "dollarsign.circle.fill",
                iconColor: SolennixColors.primary,
                label: InventoryStrings.unitCost,
                value: (item.unitCost ?? 0) > 0
                    ? (item.unitCost ?? 0).formatted(.currency(code: "MXN"))
                    : "—",
                subtitle: InventoryStrings.perUnit(item.unit),
                a11yLabel: "\(InventoryStrings.unitCost): \((item.unitCost ?? 0) > 0 ? (item.unitCost ?? 0).formatted(.currency(code: "MXN")) : "—")"
            )

            Divider()
                .frame(height: 50)

            InventoryKPICard(
                icon: "chart.bar.fill",
                iconColor: SolennixColors.primary,
                label: InventoryStrings.stockValue,
                value: item.unitCost != nil
                    ? stockValue.formatted(.currency(code: "MXN"))
                    : "—",
                subtitle: InventoryStrings.totalValue,
                a11yLabel: "\(InventoryStrings.stockValue): \(item.unitCost != nil ? stockValue.formatted(.currency(code: "MXN")) : "—")"
            )
        }
        .solennixRow()
        .listRowInsets(EdgeInsets(top: Spacing.sm, leading: Spacing.md, bottom: Spacing.sm, trailing: Spacing.md))
    }
}

// MARK: - KPI Card

struct InventoryKPICard: View {
    let icon: String
    let iconColor: Color
    let label: String
    let value: String
    let subtitle: String
    let a11yLabel: String

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.caption2)
                    .foregroundStyle(iconColor)
                Text(label)
                    .font(.caption2)
                    .foregroundStyle(SolennixColors.textSecondary)
                    .textCase(.uppercase)
            }
            Text(value)
                .font(.title3)
                .fontWeight(.bold)
                .foregroundStyle(SolennixColors.text)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
            Text(subtitle)
                .font(.caption2)
                .foregroundStyle(SolennixColors.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(Spacing.md)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(a11yLabel)
    }
}
