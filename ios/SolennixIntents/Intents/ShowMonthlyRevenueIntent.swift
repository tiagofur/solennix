import AppIntents
import SwiftUI

// MARK: - Show Monthly Revenue Intent

struct ShowMonthlyRevenueIntent: AppIntent {

    static let title: LocalizedStringResource = "Ingresos del Mes"
    static let description = IntentDescription("Muestra los ingresos totales del mes actual")

    static let openAppWhenRun: Bool = false

    func perform() async throws -> some IntentResult & ProvidesDialog & ShowsSnippetView {
        let revenue = await fetchMonthlyRevenue()

        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "MXN"
        formatter.maximumFractionDigits = 0

        let formattedRevenue = formatter.string(from: NSNumber(value: revenue.total)) ?? "$0"
        let formattedPending = formatter.string(from: NSNumber(value: revenue.pending)) ?? "$0"

        var dialog = "Este mes has generado \(formattedRevenue)."
        if revenue.pending > 0 {
            dialog += " Tienes \(formattedPending) pendientes de cobro."
        }

        return .result(
            dialog: IntentDialog(stringLiteral: dialog),
            view: MonthlyRevenueSnippetView(revenue: revenue)
        )
    }

    private func fetchMonthlyRevenue() async -> MonthlyRevenue {
        // Mock data - in production, read from shared App Group or API
        return MonthlyRevenue(
            total: 125000,
            collected: 90000,
            pending: 35000,
            eventsCount: 8,
            previousMonthTotal: 110000
        )
    }
}

// MARK: - Monthly Revenue Model

struct MonthlyRevenue {
    let total: Double
    let collected: Double
    let pending: Double
    let eventsCount: Int
    let previousMonthTotal: Double

    var growthPercentage: Double {
        guard previousMonthTotal > 0 else { return 0 }
        return ((total - previousMonthTotal) / previousMonthTotal) * 100
    }

    var isGrowthPositive: Bool {
        growthPercentage >= 0
    }

    var formattedTotal: String {
        formatCurrency(total)
    }

    var formattedCollected: String {
        formatCurrency(collected)
    }

    var formattedPending: String {
        formatCurrency(pending)
    }

    private func formatCurrency(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "MXN"
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: value)) ?? "$0"
    }
}

// MARK: - Snippet View

struct MonthlyRevenueSnippetView: View {
    let revenue: MonthlyRevenue

    var body: some View {
        VStack(spacing: 16) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Ingresos de \(currentMonthName)")
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    Text(revenue.formattedTotal)
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .foregroundStyle(.primary)

                    // Growth indicator
                    HStack(spacing: 4) {
                        Image(systemName: revenue.isGrowthPositive ? "arrow.up.right" : "arrow.down.right")
                            .font(.caption)

                        Text(String(format: "%.1f%%", abs(revenue.growthPercentage)))
                            .font(.caption)
                            .fontWeight(.medium)

                        Text("vs mes anterior")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                    .foregroundStyle(revenue.isGrowthPositive ? .green : .red)
                }

                Spacer()

                Image(systemName: "chart.line.uptrend.xyaxis")
                    .font(.system(size: 36))
                    .foregroundStyle(.green.opacity(0.3))
            }

            Divider()

            // Breakdown
            HStack(spacing: 24) {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 4) {
                        Circle()
                            .fill(.green)
                            .frame(width: 8, height: 8)
                        Text("Cobrado")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Text(revenue.formattedCollected)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                }

                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 4) {
                        Circle()
                            .fill(.orange)
                            .frame(width: 8, height: 8)
                        Text("Pendiente")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Text(revenue.formattedPending)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 4) {
                    Text("\(revenue.eventsCount)")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundStyle(.blue)
                    Text("eventos")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding()
    }

    private var currentMonthName: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM"
        formatter.locale = Locale(identifier: "es_MX")
        return formatter.string(from: Date()).capitalized
    }
}
