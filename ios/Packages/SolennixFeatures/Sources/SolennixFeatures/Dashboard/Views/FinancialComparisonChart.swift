import SwiftUI
import SolennixDesign

// MARK: - Financial Comparison Chart

/// Horizontal bar chart comparing net sales, cash collected, and outstanding VAT.
public struct FinancialComparisonChart: View {

    let netSales: Double
    let cashCollected: Double
    let vatOutstanding: Double

    public init(netSales: Double, cashCollected: Double, vatOutstanding: Double) {
        self.netSales = netSales
        self.cashCollected = cashCollected
        self.vatOutstanding = vatOutstanding
    }

    private var maxValue: Double {
        max(netSales, cashCollected, vatOutstanding, 1)
    }

    private func tr(_ key: String, _ value: String) -> String {
        FeatureL10n.text(key, value)
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            // Header
            HStack {
                Text(tr("dashboard.financial_comparison", "Comparativa financiera"))
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.text)

                Spacer()

                Text(tr("dashboard.this_month", "Este mes"))
                    .font(.caption2)
                    .foregroundStyle(SolennixColors.primary)
                    .padding(.horizontal, Spacing.sm)
                    .padding(.vertical, Spacing.xxs)
                    .background(SolennixColors.primaryLight)
                    .clipShape(Capsule())
            }

            // Bar rows
            GeometryReader { geometry in
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    barRow(
                        label: tr("dashboard.kpi.net_sales", "Ventas netas"),
                        value: netSales,
                        color: SolennixColors.kpiGreen,
                        maxWidth: geometry.size.width
                    )

                    barRow(
                        label: tr("dashboard.kpi.collected", "Cobrado"),
                        value: cashCollected,
                        color: SolennixColors.primary,
                        maxWidth: geometry.size.width
                    )

                    barRow(
                        label: tr("dashboard.kpi.vat_outstanding", "IVA pendiente"),
                        value: vatOutstanding,
                        color: SolennixColors.error,
                        maxWidth: geometry.size.width
                    )
                }
            }
            .frame(height: 100)
        }
        .padding(Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
        .shadowSm()
    }

    // MARK: - Bar Row

    private func barRow(label: String, value: Double, color: Color, maxWidth: CGFloat) -> some View {
        VStack(alignment: .leading, spacing: Spacing.xxs) {
            HStack {
                Text(label)
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)

                Spacer()

                Text(DashboardFormatting.currencyMXN(value))
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.text)
            }

            ZStack(alignment: .leading) {
                RoundedRectangle(cornerRadius: CornerRadius.sm)
                    .fill(SolennixColors.surfaceAlt)
                    .frame(height: 10)

                RoundedRectangle(cornerRadius: CornerRadius.sm)
                    .fill(color)
                    .frame(width: max(maxWidth * CGFloat(value / maxValue), 4), height: 10)
            }
        }
    }
}

// MARK: - Preview

#Preview("Financial Comparison Chart") {
    FinancialComparisonChart(
        netSales: 45_000,
        cashCollected: 32_000,
        vatOutstanding: 7_200
    )
    .padding()
    .background(SolennixColors.surfaceGrouped)
}
