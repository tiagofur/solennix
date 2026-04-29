import SwiftUI
import SolennixCore

struct ForecastWidgetView: View {
    let forecast: [ForecastDataPoint]
    let isLoading: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Label("Proyección de Ingresos", systemImage: "chart.line.uptrend.xyaxis")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                Spacer()
            }

            if isLoading {
                VStack {
                    Skeleton()
                        .frame(height: 10)
                    Skeleton()
                        .frame(height: 10)
                }
                .padding(.vertical, 8)
            } else if forecast.isEmpty {
                Text("Sin proyecciones disponibles")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, 20)
            } else {
                // Summary grid
                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Ingresos Proyectados")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text(formatMXN(forecast.reduce(0) { $0 + $1.confirmedRevenue }))
                            .font(.headline)
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(12)
                    .background(Color(.systemGray6))
                    .cornerRadius(8)

                    VStack(alignment: .leading, spacing: 4) {
                        Text("Confirmados")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text("\(forecast.reduce(0) { $0 + $1.confirmedEventCount })")
                            .font(.headline)
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(12)
                    .background(Color(.systemGray6))
                    .cornerRadius(8)
                }

                VStack(spacing: 12) {
                    ForEach(forecast.prefix(6), id: \.month) { point in
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text(formatMonth(point.month))
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                Spacer()
                                Text(formatMXN(point.confirmedRevenue))
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                            }
                            HStack {
                                Text("\(point.confirmedEventCount) evento\(point.confirmedEventCount == 1 ? "" : "s")")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                Spacer()
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

    private func formatMonth(_ monthStr: String) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM"
        formatter.locale = Locale(identifier: "es_MX")
        
        if let date = formatter.date(from: monthStr) {
            let displayFormatter = DateFormatter()
            displayFormatter.dateFormat = "MMM yyyy"
            displayFormatter.locale = Locale(identifier: "es_MX")
            return displayFormatter.string(from: date).capitalized
        }
        return monthStr
    }
}

#Preview {
    VStack(spacing: 16) {
        ForecastWidgetView(
            forecast: [
                ForecastDataPoint(month: "2024-05", confirmedRevenue: 45000, confirmedEventCount: 3),
                ForecastDataPoint(month: "2024-06", confirmedRevenue: 62000, confirmedEventCount: 5),
                ForecastDataPoint(month: "2024-07", confirmedRevenue: 58000, confirmedEventCount: 4),
                ForecastDataPoint(month: "2024-08", confirmedRevenue: 75000, confirmedEventCount: 6),
            ],
            isLoading: false
        )
        
        ForecastWidgetView(
            forecast: [],
            isLoading: false
        )
        
        ForecastWidgetView(
            forecast: [],
            isLoading: true
        )
    }
    .padding()
}
