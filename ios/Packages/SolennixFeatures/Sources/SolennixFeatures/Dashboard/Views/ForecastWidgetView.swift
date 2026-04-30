import SwiftUI
import SolennixCore

struct ForecastWidgetView: View {
    let forecast: [ForecastDataPoint]
    let isLoading: Bool

    private func tr(_ key: String, _ value: String) -> String {
        FeatureL10n.text(key, value)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Label(tr("dashboard.widgets.forecast.title", "Pronóstico"), systemImage: "chart.line.uptrend.xyaxis")
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
                Text(tr("dashboard.widgets.forecast.empty", "Sin pronóstico disponible"))
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, 20)
            } else {
                // Summary grid
                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(tr("dashboard.widgets.forecast.projected_revenue", "Ingresos proyectados"))
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text(DashboardFormatting.currencyMXN(forecast.reduce(0) { $0 + $1.confirmedRevenue }))
                            .font(.headline)
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(12)
                    .background(Color(.systemGray6))
                    .cornerRadius(8)

                    VStack(alignment: .leading, spacing: 4) {
                        Text(tr("dashboard.widgets.forecast.confirmed_events", "Eventos confirmados"))
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
                                Text(DashboardFormatting.monthYear(from: point.month))
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                Spacer()
                                Text(DashboardFormatting.currencyMXN(point.confirmedRevenue))
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                            }
                            HStack {
                                Text(String.localizedStringWithFormat(
                                    tr(
                                        point.confirmedEventCount == 1
                                            ? "dashboard.widgets.forecast.events_one"
                                            : "dashboard.widgets.forecast.events_other",
                                        point.confirmedEventCount == 1 ? "%lld evento" : "%lld eventos"
                                    ),
                                    point.confirmedEventCount
                                ))
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
