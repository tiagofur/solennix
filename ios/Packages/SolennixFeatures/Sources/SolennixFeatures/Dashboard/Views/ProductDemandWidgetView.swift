import SwiftUI
import SolennixCore

struct ProductDemandWidgetView: View {
    let products: [ProductDemandItem]
    let isLoading: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Label("Demanda de Productos", systemImage: "chart.bar")
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
                Text("Sin datos de productos aún")
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
                                Text("\(product.timesUsed) uso\(product.timesUsed == 1 ? "" : "s")")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                Spacer()
                                Text(formatMXN(product.totalRevenue))
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

    private func formatMXN(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "MXN"
        formatter.currencySymbol = "$"
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: amount)) ?? "$0"
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
