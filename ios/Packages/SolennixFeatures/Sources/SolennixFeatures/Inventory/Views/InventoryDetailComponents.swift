import SwiftUI
import SolennixCore
import SolennixDesign

// MARK: - Localized Type Name Helper

func localizedTypeName(_ type: InventoryType) -> String {
    switch type {
    case .ingredient: return InventoryStrings.ingredientType
    case .equipment:  return InventoryStrings.equipmentType
    case .supply:     return InventoryStrings.supplyType
    }
}

// MARK: - Stock Status Card

struct InventoryStockStatusCard: View {
    let item: InventoryItem
    let isLowStock: Bool
    let stockFontSize: CGFloat
    let onAdjustStock: () -> Void

    var body: some View {
        let percentage = item.minimumStock > 0 ? min(1.0, item.currentStock / item.minimumStock) : 1.0
        let stockFormatted = item.currentStock.formatted(.number.precision(.fractionLength(0...2)))

        VStack(spacing: Spacing.md) {
            HStack {
                Image(systemName: isLowStock ? "exclamationmark.triangle.fill" : "checkmark.circle.fill")
                    .font(.title2)
                    .foregroundStyle(isLowStock ? SolennixColors.error : SolennixColors.success)
                Text(isLowStock ? InventoryStrings.stockLow : InventoryStrings.stockOk)
                    .font(.headline)
                    .foregroundStyle(isLowStock ? SolennixColors.error : SolennixColors.success)
                Spacer()

                HStack(spacing: Spacing.xs) {
                    Text(localizedTypeName(item.type))
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundStyle(SolennixColors.textSecondary)
                        .padding(.horizontal, Spacing.sm)
                        .padding(.vertical, Spacing.xs)
                        .background(SolennixColors.surface)
                        .clipShape(Capsule())

                    Button {
                        onAdjustStock()
                    } label: {
                        Text(InventoryStrings.adjustStock)
                            .font(.caption.weight(.bold))
                            .foregroundStyle(SolennixColors.primary)
                            .padding(.horizontal, Spacing.sm)
                            .padding(.vertical, Spacing.xs)
                            .background(SolennixColors.primaryLight)
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }
            }

            HStack(alignment: .lastTextBaseline, spacing: Spacing.xs) {
                Text(stockFormatted)
                    .font(.system(size: stockFontSize, weight: .bold, design: .rounded))
                    .foregroundStyle(SolennixColors.text)
                Text(item.unit)
                    .font(.title3)
                    .foregroundStyle(SolennixColors.textSecondary)
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text(InventoryStrings.minimumShort)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textTertiary)
                    Text(InventoryStrings.minimumValue(Int(item.minimumStock), unit: item.unit))
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(SolennixColors.textSecondary)
                }
            }
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(InventoryStrings.stockStatusA11y(
                stock: stockFormatted,
                unit: item.unit,
                isLow: isLowStock,
                minimum: item.minimumStock > 0 ? Int(item.minimumStock) : nil
            ))

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 2)
                        .fill(SolennixColors.surface)
                        .frame(height: 4)
                    RoundedRectangle(cornerRadius: 2)
                        .fill(isLowStock ? SolennixColors.error : SolennixColors.success)
                        .frame(width: geo.size.width * percentage, height: 4)
                }
            }
            .frame(height: 4)
            .accessibilityHidden(true)
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity)
        .solennixRow()
        .listRowInsets(EdgeInsets(top: Spacing.sm, leading: Spacing.md, bottom: Spacing.sm, trailing: Spacing.md))
    }
}
