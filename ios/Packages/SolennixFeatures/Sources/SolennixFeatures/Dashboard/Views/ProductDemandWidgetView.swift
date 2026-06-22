import SwiftUI
import SolennixCore
import SolennixDesign

struct ProductDemandWidgetView: View {
    let products: [ProductDemandItem]
    let isLoading: Bool

    private func tr(_ key: String, _ value: String) -> String {
        FeatureL10n.text(key, value)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack {
                Label(tr("dashboard.widgets.product_demand.title", "Demanda de productos"), systemImage: "chart.bar")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.text)
                Spacer()
            }

            if isLoading {
                ForEach(0..<3, id: \.self) { _ in
                    VStack {
                        Skeleton()
                            .frame(height: 10)
                    }
                    .padding(.vertical, Spacing.sm)
                }
            } else if products.isEmpty {
                Text(tr("dashboard.widgets.product_demand.empty", "Sin demanda registrada"))
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, Spacing.xl)
            } else {
                VStack(spacing: Spacing.sm) {
                    ForEach(products.prefix(5), id: \.id) { product in
                        NavigationLink(value: Route.productDetail(id: product.id)) {
                            VStack(alignment: .leading, spacing: Spacing.xs) {
                                Text(product.name)
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                    .foregroundStyle(SolennixColors.text)
                                    .lineLimit(1)
                                HStack {
                                    Text(String.localizedStringWithFormat(
                                        tr(
                                            product.timesUsed == 1
                                                ? "dashboard.widgets.product_demand.uses_one"
                                                : "dashboard.widgets.product_demand.uses_other",
                                            product.timesUsed == 1 ? "%lld uso" : "%lld usos"
                                        ),
                                        product.timesUsed
                                    ))
                                        .font(.caption)
                                        .foregroundStyle(SolennixColors.textSecondary)
                                    Spacer()
                                    Text(DashboardFormatting.currencyMXN(product.totalRevenue))
                                        .font(.caption)
                                        .fontWeight(.semibold)
                                        .foregroundStyle(SolennixColors.text)
                                }
                            }
                            .padding(.vertical, Spacing.sm)
                            .padding(.horizontal, Spacing.md)
                            .background(SolennixColors.surfaceAlt)
                            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
        .padding(Spacing.lg)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
        .shadowSm()
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(tr("dashboard.widgets.product_demand.title", "Demanda de productos"))
        .accessibilityValue(
            products.isEmpty
                ? tr("dashboard.widgets.product_demand.empty", "Sin demanda registrada")
                : products.prefix(5).map { "\($0.name): \(DashboardFormatting.currencyMXN($0.totalRevenue))" }
                          .joined(separator: ", ")
        )
    }
}

#Preview {
    VStack(spacing: 16) {
        ProductDemandWidgetView(
            products: [
                ProductDemandItem(id: "1", name: "Catering Platillos Variados", timesUsed: 25, totalRevenue: 45000),
                ProductDemandItem(id: "2", name: "Decoración Floral", timesUsed: 18, totalRevenue: 32000),
                ProductDemandItem(id: "3", name: "Música DJ", timesUsed: 15, totalRevenue: 28000),
            ],
            isLoading: false
        )
        
        ProductDemandWidgetView(
            products: [],
            isLoading: false
        )
        
        ProductDemandWidgetView(
            products: [],
            isLoading: true
        )
    }
    .padding()
}
