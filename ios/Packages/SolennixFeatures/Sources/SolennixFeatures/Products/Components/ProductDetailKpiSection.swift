import SwiftUI
import SolennixCore
import SolennixDesign

// MARK: - Product Detail KPI Section

/// 4-up KPI card grid (price / unit cost / margin / upcoming events).
/// Switches to a single-column stacked layout at accessibility Dynamic Type sizes.
struct ProductDetailKpiSection: View {

    let product: Product
    let viewModel: ProductDetailViewModel
    let dynamicTypeSize: DynamicTypeSize

    var body: some View {
        let marginValue = viewModel.margin
        let marginColor: Color = {
            guard let m = marginValue else { return SolennixColors.textSecondary }
            return m >= 50 ? SolennixColors.success : (m >= 20 ? SolennixColors.text : SolennixColors.warning)
        }()
        let marginDisplay = marginValue.map { String(format: "%.1f%%", $0) } ?? "—"
        let marginSubtitle = marginValue != nil ? ProductStrings.profitEstimated : ProductStrings.noRecipe

        return VStack(spacing: 0) {
            if dynamicTypeSize >= .accessibility1 {
                kpiCard(
                    icon: "dollarsign.circle.fill",
                    iconColor: SolennixColors.primary,
                    label: ProductStrings.basePrice,
                    value: product.basePrice.formatted(.currency(code: "MXN")),
                    subtitle: ProductStrings.perUnit,
                    a11yLabel: "\(ProductStrings.basePrice): \(product.basePrice.formatted(.currency(code: "MXN")))"
                )

                Divider()
                    .padding(.horizontal, Spacing.md)

                kpiCard(
                    icon: "square.stack.3d.up.fill",
                    iconColor: SolennixColors.textSecondary,
                    label: ProductStrings.unitCost,
                    value: viewModel.unitCost.formatted(.currency(code: "MXN")),
                    subtitle: ProductStrings.inSupplies,
                    a11yLabel: "\(ProductStrings.unitCost): \(viewModel.unitCost.formatted(.currency(code: "MXN")))"
                )

                Divider()
                    .padding(.horizontal, Spacing.md)

                kpiCard(
                    icon: "arrow.up.right",
                    iconColor: marginColor,
                    label: ProductStrings.marginEstimated,
                    value: marginDisplay,
                    subtitle: marginSubtitle,
                    valueColor: marginColor,
                    a11yLabel: "\(ProductStrings.marginEstimated): \(marginDisplay)"
                )

                Divider()
                    .padding(.horizontal, Spacing.md)

                kpiCard(
                    icon: "calendar",
                    iconColor: SolennixColors.primary,
                    label: ProductStrings.upcomingEvents,
                    value: "\(viewModel.demandData.count)",
                    subtitle: ProductStrings.confirmed,
                    a11yLabel: "\(ProductStrings.upcomingEvents): \(viewModel.demandData.count)"
                )
            } else {
                HStack(spacing: 0) {
                    kpiCard(
                        icon: "dollarsign.circle.fill",
                        iconColor: SolennixColors.primary,
                        label: ProductStrings.basePrice,
                        value: product.basePrice.formatted(.currency(code: "MXN")),
                        subtitle: ProductStrings.perUnit,
                        a11yLabel: "\(ProductStrings.basePrice): \(product.basePrice.formatted(.currency(code: "MXN")))"
                    )

                    Divider()
                        .frame(height: 70)

                    kpiCard(
                        icon: "square.stack.3d.up.fill",
                        iconColor: SolennixColors.textSecondary,
                        label: ProductStrings.unitCost,
                        value: viewModel.unitCost.formatted(.currency(code: "MXN")),
                        subtitle: ProductStrings.inSupplies,
                        a11yLabel: "\(ProductStrings.unitCost): \(viewModel.unitCost.formatted(.currency(code: "MXN")))"
                    )
                }

                Divider()
                    .padding(.horizontal, Spacing.md)

                HStack(spacing: 0) {
                    kpiCard(
                        icon: "arrow.up.right",
                        iconColor: marginColor,
                        label: ProductStrings.marginEstimated,
                        value: marginDisplay,
                        subtitle: marginSubtitle,
                        valueColor: marginColor,
                        a11yLabel: "\(ProductStrings.marginEstimated): \(marginDisplay)"
                    )

                    Divider()
                        .frame(height: 70)

                    kpiCard(
                        icon: "calendar",
                        iconColor: SolennixColors.primary,
                        label: ProductStrings.upcomingEvents,
                        value: "\(viewModel.demandData.count)",
                        subtitle: ProductStrings.confirmed,
                        a11yLabel: "\(ProductStrings.upcomingEvents): \(viewModel.demandData.count)"
                    )
                }
            }
        }
        .solennixCard(radius: CornerRadius.lg, shadow: false, border: false)
        .padding(.horizontal, Spacing.md)
    }

    // MARK: - KPI Card

    @ViewBuilder
    private func kpiCard(
        icon: String,
        iconColor: Color,
        label: String,
        value: String,
        subtitle: String,
        valueColor: Color = SolennixColors.text,
        a11yLabel: String
    ) -> some View {
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
                .foregroundStyle(valueColor)
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
