import SwiftUI
import SolennixCore
import SolennixDesign

// MARK: - Smart Alert Section

struct InventorySmartAlertSection: View {
    let item: InventoryItem
    let demand7Days: Double
    let stockAfter7Days: Double
    let isLowStock: Bool
    let hasDemand: Bool

    var body: some View {
        let demand = demand7Days
        let stockAfter = stockAfter7Days
        let isCritical = demand > 0 && stockAfter < 0
        let isWarning = demand > 0 && stockAfter >= 0 && stockAfter < item.minimumStock
        let isLowOnly = isLowStock && demand == 0

        let alertColor: Color = isCritical || isLowOnly ? SolennixColors.error :
            (isWarning ? SolennixColors.warning : SolennixColors.success)
        let alertIcon = (isCritical || isWarning || isLowOnly) ? "exclamationmark.triangle.fill" : "checkmark.circle.fill"

        HStack(alignment: .top, spacing: Spacing.md) {
            Image(systemName: alertIcon)
                .foregroundStyle(alertColor)
                .font(.title3)
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 4) {
                Text({
                    if isCritical { return InventoryStrings.critical7Days }
                    if isWarning { return InventoryStrings.belowMinAfterEvents }
                    if isLowOnly { return InventoryStrings.belowMinRecommended }
                    if demand > 0 { return InventoryStrings.enough7Days }
                    if hasDemand { return InventoryStrings.noDemand7Days }
                    return InventoryStrings.noUpcomingEvents
                }())
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundStyle(alertColor)

                if isCritical {
                    Text(InventoryStrings.shortageMessage(
                        demand: Int(demand),
                        stock: Int(item.currentStock),
                        missing: Int(-stockAfter),
                        unit: item.unit
                    ))
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)
                } else if isLowOnly {
                    Text(InventoryStrings.lowStockMessage(
                        stock: Int(item.currentStock),
                        unit: item.unit,
                        minimum: Int(item.minimumStock)
                    ))
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)
                }
            }
            Spacer()
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .solennixRow()
        .listRowInsets(EdgeInsets(top: Spacing.sm, leading: Spacing.md, bottom: Spacing.sm, trailing: Spacing.md))
    }
}

// MARK: - Stock Health Bars

struct InventoryStockHealthBars: View {
    let item: InventoryItem
    let isLowStock: Bool
    let demand7Days: Double
    let stockAfter7Days: Double

    var body: some View {
        let demand = demand7Days
        let maxBar = max(item.currentStock, item.minimumStock, demand, 1)

        VStack(alignment: .leading, spacing: Spacing.md) {
            Text(InventoryStrings.stockHealthTitle)
                .font(.caption.weight(.semibold))
                .foregroundStyle(SolennixColors.textSecondary)

            InventoryHealthBar(
                label: InventoryStrings.currentStock,
                value: InventoryStrings.quantityWithUnit(Int(item.currentStock), unit: item.unit),
                fraction: item.currentStock / maxBar,
                color: isLowStock ? SolennixColors.error : SolennixColors.primary
            )
            InventoryHealthBar(
                label: InventoryStrings.recommendedMinimum,
                value: InventoryStrings.quantityWithUnit(Int(item.minimumStock), unit: item.unit),
                fraction: item.minimumStock / maxBar,
                color: SolennixColors.warning
            )
            if demand > 0 {
                InventoryHealthBar(
                    label: InventoryStrings.demandNext7Days,
                    value: InventoryStrings.quantityWithUnit(Int(demand), unit: item.unit),
                    fraction: demand / maxBar,
                    color: stockAfter7Days < 0 ? SolennixColors.error : SolennixColors.warning
                )
            }
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .solennixRow()
        .listRowInsets(EdgeInsets(top: Spacing.sm, leading: Spacing.md, bottom: Spacing.sm, trailing: Spacing.md))
    }
}

// MARK: - Health Bar

struct InventoryHealthBar: View {
    let label: String
    let value: String
    let fraction: Double
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(label)
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)
                Spacer()
                Text(value)
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundStyle(SolennixColors.text)
            }
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(SolennixColors.surface)
                        .frame(height: 8)
                    RoundedRectangle(cornerRadius: 4)
                        .fill(color)
                        .frame(width: geo.size.width * min(1.0, fraction), height: 8)
                }
            }
            .frame(height: 8)
            .accessibilityHidden(true)
        }
    }
}
