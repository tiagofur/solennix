import SwiftUI
import SolennixCore
import SolennixDesign

// MARK: - Product Detail Composition Section

/// Reusable composition section card (ingredients / supplies / equipment).
/// Renders a header with optional badge, an optional table header (suppressed
/// at accessibility Dynamic Type), item rows, and an optional total footer.
struct ProductDetailCompositionSection: View {

    let title: String
    let icon: String
    let iconColor: Color
    let items: [ProductIngredient]
    let dynamicTypeSize: DynamicTypeSize

    var showCost: Bool = false
    var badge: String? = nil
    var badgeColor: Color = SolennixColors.primary
    var totalLabel: String? = nil
    var totalValue: Double? = nil
    var totalColor: Color = SolennixColors.text

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            HStack {
                HStack(spacing: Spacing.sm) {
                    Image(systemName: icon)
                        .foregroundStyle(iconColor)
                    Text(title)
                        .font(.headline)
                        .foregroundStyle(SolennixColors.text)
                }

                Spacer()

                if let badge {
                    Text(badge)
                        .font(.caption2.weight(.medium))
                        .foregroundStyle(badgeColor)
                        .padding(.horizontal, Spacing.sm)
                        .padding(.vertical, Spacing.xs)
                        .background(badgeColor.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                }
            }
            .padding(Spacing.md)

            Divider()

            if dynamicTypeSize < .accessibility1 {
                // Table header
                HStack {
                    Text(ProductStrings.ingredientHeader)
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(SolennixColors.textSecondary)
                    Spacer()
                    Text(ProductStrings.quantityHeader)
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(SolennixColors.textSecondary)
                    if showCost {
                        Text(ProductStrings.estimatedCostHeader)
                            .font(.caption2.weight(.semibold))
                            .foregroundStyle(SolennixColors.textSecondary)
                            .frame(width: 80, alignment: .trailing)
                    }
                }
                .padding(.horizontal, Spacing.md)
                .padding(.vertical, Spacing.sm)
                .background(SolennixColors.surface)
            }

            // Items
            ForEach(items) { ingredient in
                Divider().opacity(0.5)
                let qtyFormatted = ingredient.quantityRequired.formatted(.number.precision(.fractionLength(0...2)))
                let rowLayout = dynamicTypeSize >= .accessibility1
                    ? AnyLayout(VStackLayout(alignment: .leading, spacing: 4))
                    : AnyLayout(HStackLayout())
                rowLayout {
                    Text(ingredient.ingredientName ?? ProductStrings.unknownItem)
                        .font(.subheadline)
                        .foregroundStyle(SolennixColors.text)

                    if dynamicTypeSize < .accessibility1 {
                        Spacer()
                    }

                    Text("\(qtyFormatted) \(ingredient.unit ?? ProductStrings.unitFallback)")
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(SolennixColors.text)

                    if showCost {
                        let cost = ingredient.quantityRequired * (ingredient.unitCost ?? 0)
                        Text(cost > 0 ? cost.formatted(.currency(code: "MXN")) : "—")
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(totalColor)
                            .frame(width: dynamicTypeSize >= .accessibility1 ? nil : 80, alignment: dynamicTypeSize >= .accessibility1 ? .leading : .trailing)
                    }
                }
                .padding(.horizontal, Spacing.md)
                .padding(.vertical, Spacing.sm)
                .frame(minHeight: 44)
                .contentShape(Rectangle())
                .accessibilityElement(children: .combine)
            }

            // Total footer
            if let totalLabel, let totalValue {
                Divider()
                let footerLayout = dynamicTypeSize >= .accessibility1
                    ? AnyLayout(VStackLayout(alignment: .leading, spacing: 4))
                    : AnyLayout(HStackLayout())
                footerLayout {
                    Text(totalLabel)
                        .font(.subheadline)
                        .foregroundStyle(SolennixColors.textSecondary)
                    if dynamicTypeSize < .accessibility1 {
                        Spacer()
                    }
                    Text(totalValue.formatted(.currency(code: "MXN")))
                        .font(.title3.weight(.bold))
                        .foregroundStyle(totalColor)
                }
                .padding(Spacing.md)
            }
        }
        .solennixCard(radius: CornerRadius.lg, shadow: false, border: false)
        .padding(.horizontal, Spacing.md)
    }
}
