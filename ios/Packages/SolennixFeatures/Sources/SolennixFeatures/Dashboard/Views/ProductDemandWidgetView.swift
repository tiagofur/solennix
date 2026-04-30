import SwiftUI
import SolennixCore

struct ProductDemandWidgetView: View {
    let products: [ProductDemandItem]
    let isLoading: Bool

    private func tr(_ key: String, _ value: String) -> String {
        FeatureL10n.text(key, value)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Label(tr("dashboard.widgets.product_demand.title", "Demanda de productos"), systemImage: "chart.bar")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                Spacer()
            }

            if isLoading {
                ForEach(0..<3, id: \.self) { _ in
                    VStack {
                        Skeleton()
                            .frame(height: 10)
                    }
                    .padding(.vertical, 8)
                }
            } else if products.isEmpty {
                Text(tr("dashboard.widgets.product_demand.empty", "Sin demanda registrada"))
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, 20)
            } else {
                VStack(spacing: 12) {
                    ForEach(products.prefix(5), id: \.id) { product in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(product.name)
                                .font(.subheadline)
                                .fontWeight(.medium)
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
                                    .foregroundColor(.secondary)
                                Spacer()
                                Text(DashboardFormatting.currencyMXN(product.totalRevenue))
                                    .font(.caption)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.primary)
                            }
                        }
                        .padding(.vertical, 8)
                        .padding(.horizontal, 12)
                        .background(Color(.systemGray6))
                        .cornerRadius(8)
                    }
                }
            }
        }
        .padding(16)
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color(.systemGray5), lineWidth: 1)
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
