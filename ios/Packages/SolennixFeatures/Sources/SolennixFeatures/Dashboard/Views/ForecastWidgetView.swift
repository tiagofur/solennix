import SwiftUI
import SolennixCore
import SolennixDesign

struct ForecastWidgetView: View {
    let forecast: [ForecastDataPoint]
    let isLoading: Bool

    private func tr(_ key: String, _ value: String) -> String {
        FeatureL10n.text(key, value)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack {
                Label(tr("dashboard.widgets.forecast.title", "Pronóstico"), systemImage: "chart.line.uptrend.xyaxis")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.text)
                Spacer()
            }

            if isLoading {
                VStack {
                    Skeleton()
                        .frame(height: 10)
                    Skeleton()
                        .frame(height: 10)
                }
                .padding(.vertical, Spacing.sm)
            } else if forecast.isEmpty {
                Text(tr("dashboard.widgets.forecast.empty", "Sin pronóstico disponible"))
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, Spacing.xl)
            } else {
                // Summary grid
                HStack(spacing: Spacing.sm) {
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Text(tr("dashboard.widgets.forecast.projected_revenue", "Ingresos proyectados"))
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textSecondary)
                        Text(DashboardFormatting.currencyMXN(forecast.reduce(0) { $0 + $1.confirmedRevenue }))
                            .font(.headline)
                            .fontWeight(.semibold)
                            .foregroundStyle(SolennixColors.text)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(Spacing.md)
                    .background(SolennixColors.surfaceAlt)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))

                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Text(tr("dashboard.widgets.forecast.confirmed_events", "Eventos confirmados"))
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textSecondary)
                        Text("\(forecast.reduce(0) { $0 + $1.confirmedEvents })")
                            .font(.headline)
                            .fontWeight(.semibold)
                            .foregroundStyle(SolennixColors.text)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(Spacing.md)
                    .background(SolennixColors.surfaceAlt)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
                }

                VStack(spacing: Spacing.sm) {
                    ForEach(forecast.prefix(6), id: \.month) { point in
                        VStack(alignment: .leading, spacing: Spacing.xs) {
                            HStack {
                                Text(DashboardFormatting.monthYear(from: point.month))
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                    .foregroundStyle(SolennixColors.text)
                                Spacer()
                                Text(DashboardFormatting.currencyMXN(point.confirmedRevenue))
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                                    .foregroundStyle(SolennixColors.text)
                            }
                            HStack {
                                Text(String.localizedStringWithFormat(
                                    tr(
                                        point.confirmedEvents == 1
                                            ? "dashboard.widgets.forecast.events_one"
                                            : "dashboard.widgets.forecast.events_other",
                                        point.confirmedEvents == 1 ? "%lld evento" : "%lld eventos"
                                    ),
                                    point.confirmedEvents
                                ))
                                    .font(.caption)
                                    .foregroundStyle(SolennixColors.textSecondary)
                                Spacer()
                            }
                        }
                        .padding(.vertical, Spacing.sm)
                        .padding(.horizontal, Spacing.md)
                        .background(SolennixColors.surfaceAlt)
                        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
                    }
                }
            }
        }
        .padding(Spacing.lg)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.card))
        .shadowSm()
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(tr("dashboard.widgets.forecast.title", "Pronóstico"))
        .accessibilityValue(
            forecast.isEmpty
                ? tr("dashboard.widgets.forecast.empty", "Sin pronóstico disponible")
                : forecast.prefix(6).map { point in
                    "\(DashboardFormatting.monthYear(from: point.month)): \(DashboardFormatting.currencyMXN(point.confirmedRevenue))"
                  }.joined(separator: ", ")
        )
    }
}

#Preview {
    VStack(spacing: 16) {
        ForecastWidgetView(
            forecast: [
                ForecastDataPoint(month: "2024-05", confirmedRevenue: 45000, confirmedEvents: 3),
                ForecastDataPoint(month: "2024-06", confirmedRevenue: 62000, confirmedEvents: 5),
                ForecastDataPoint(month: "2024-07", confirmedRevenue: 58000, confirmedEvents: 4),
                ForecastDataPoint(month: "2024-08", confirmedRevenue: 75000, confirmedEvents: 6),
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
