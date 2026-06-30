import AppIntents
import SwiftUI
import SolennixDesign

// MARK: - Show Monthly Revenue Intent

struct ShowMonthlyRevenueIntent: AppIntent {

    static var title: LocalizedStringResource = "intent.revenue.title"
    static var description = IntentDescription("intent.revenue.desc")

    static var openAppWhenRun: Bool = false

    nonisolated init() {}

    @MainActor
    func perform() async throws -> some IntentResult & ProvidesDialog & ShowsSnippetView {
        guard IntentSharedDataStore.hasProAccess else {
            return .result(
                dialog: IntentDialog(stringLiteral: String(localized: "intent.dialog.pro_required")),
                view: PlanRequiredSnippetView()
            )
        }

        let revenue = await fetchMonthlyRevenue()

        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "MXN"
        formatter.maximumFractionDigits = 0

        let formattedRevenue = formatter.string(from: NSNumber(value: revenue.total)) ?? "$0"
        let formattedPending = formatter.string(from: NSNumber(value: revenue.pending)) ?? "$0"

        var dialog = String(format: String(localized: "intent.revenue.dialog.generated_fmt"), formattedRevenue)
        if revenue.pending > 0 {
            dialog += String(format: String(localized: "intent.revenue.dialog.pending_suffix_fmt"), formattedPending)
        }

        return .result(
            dialog: IntentDialog(stringLiteral: dialog),
            view: MonthlyRevenueSnippetView(revenue: revenue)
        )
    }

    private func fetchMonthlyRevenue() async -> MonthlyRevenue {
        guard let kpis = IntentSharedDataStore.loadKPIs() else {
            return MonthlyRevenue(
                total: 0,
                collected: 0,
                pending: 0,
                eventsCount: 0,
                previousMonthTotal: 0
            )
        }

        let collected = max(0, kpis.monthlyRevenue - kpis.pendingPayments)
        return MonthlyRevenue(
            total: kpis.monthlyRevenue,
            collected: collected,
            pending: kpis.pendingPayments,
            eventsCount: kpis.eventsThisMonth,
            previousMonthTotal: 0
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

    // MARK: - @ScaledMetric sizes (Dynamic Type-safe, capped)
    @ScaledMetric(relativeTo: .largeTitle) private var revenueFontSize: CGFloat = 32
    private var cappedRevenueFontSize: CGFloat { min(revenueFontSize, 40) }
    @ScaledMetric(relativeTo: .body) private var revenueIconSize: CGFloat = 36
    private var cappedRevenueIconSize: CGFloat { min(revenueIconSize, 52) }

    var body: some View {
        VStack(spacing: 16) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(verbatim: String(format: String(localized: "intent.revenue.snippet.revenue_month_fmt"), currentMonthName))
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    Text(revenue.formattedTotal)
                        .font(.system(size: cappedRevenueFontSize, weight: .bold, design: .rounded))
                        .foregroundStyle(.primary)

                    // Growth indicator
                    HStack(spacing: 4) {
                        Image(systemName: revenue.isGrowthPositive ? "arrow.up.right" : "arrow.down.right")
                            .font(.caption)

                        Text(String(format: "%.1f%%", abs(revenue.growthPercentage)))
                            .font(.caption)
                            .fontWeight(.medium)

                        Text("intent.revenue.snippet.vs_prev")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                    .foregroundStyle(revenue.isGrowthPositive ? .green : .red)
                }

                Spacer()

                Image(systemName: "chart.line.uptrend.xyaxis")
                    .font(.system(size: cappedRevenueIconSize))
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
                        Text("intent.revenue.snippet.collected")
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
                        Text("intent.revenue.snippet.pending")
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
                        .foregroundStyle(SolennixColors.primary)
                    Text("intent.revenue.snippet.events")
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
        formatter.locale = Locale.current
        return formatter.string(from: Date()).capitalized
    }
}
