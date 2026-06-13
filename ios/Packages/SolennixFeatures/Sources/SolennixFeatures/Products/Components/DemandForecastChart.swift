import SwiftUI
import Charts
import SolennixCore
import SolennixDesign

// MARK: - Demand Data Point

public struct DemandDataPoint: Identifiable {
    public let id: String
    public let eventDate: Date
    public let clientName: String
    public let quantity: Int
    public let numPeople: Int
    public let unitPrice: Double

    public init(id: String, eventDate: Date, clientName: String, quantity: Int, numPeople: Int, unitPrice: Double = 0) {
        self.id = id
        self.eventDate = eventDate
        self.clientName = clientName
        self.quantity = quantity
        self.numPeople = numPeople
        self.unitPrice = unitPrice
    }

    public var revenue: Double {
        Double(quantity) * unitPrice
    }
}

// MARK: - Demand Forecast Chart

public struct DemandForecastChart: View {

    let dataPoints: [DemandDataPoint]
    let productName: String
    let basePrice: Double

    public init(dataPoints: [DemandDataPoint], productName: String, basePrice: Double = 0) {
        self.dataPoints = dataPoints
        self.productName = productName
        self.basePrice = basePrice
    }

    @ScaledMetric(relativeTo: .largeTitle) private var scaledEmptyIconSize: CGFloat = 32
    private var emptyIconSize: CGFloat { min(scaledEmptyIconSize, 72) }
    @ScaledMetric(relativeTo: .body) private var scaledChartHeight: CGFloat = 200
    private var cappedChartHeight: CGFloat { min(scaledChartHeight, 280) }

    // Hoist today (UTC-pinned) out of ForEach to compute once per body evaluation.
    // Uses the same technique as EventCountdownChip: compare UTC-midnight Dates with
    // a UTC calendar so that day boundaries are stable for UTC-negative users.
    private var todayUTC: Date {
        Date.fromServerDay(Date.localTodayString()) ?? Date()
    }

    private static let utcCalendar: Calendar = {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "UTC")!
        return cal
    }()

    private var hasData: Bool {
        !dataPoints.isEmpty
    }

    private var totalQuantity: Int {
        dataPoints.reduce(0) { $0 + $1.quantity }
    }

    private var totalPeople: Int {
        dataPoints.reduce(0) { $0 + $1.numPeople }
    }

    private var totalRevenue: Double {
        dataPoints.reduce(0) { sum, dp in
            sum + (dp.unitPrice > 0 ? dp.revenue : Double(dp.quantity) * basePrice)
        }
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            // Header
            HStack {
                Image(systemName: "chart.bar.fill")
                    .foregroundStyle(SolennixColors.primary)
                Text(ProductStrings.demandByDate)
                    .font(.headline)
                    .foregroundStyle(SolennixColors.text)
                Spacer()
                Text(ProductStrings.confirmedEvents)
                    .font(.caption2)
                    .foregroundStyle(SolennixColors.textSecondary)
            }

            if hasData {
                let today = todayUTC
                let cal = Self.utcCalendar

                // Chart
                Chart(dataPoints) { point in
                    BarMark(
                        x: .value(ProductStrings.chartAxisDate, point.eventDate, unit: .day),
                        y: .value(ProductStrings.chartAxisQuantity, point.quantity)
                    )
                    .foregroundStyle(SolennixGradient.premium)
                    .cornerRadius(4)
                }
                .chartXAxis {
                    AxisMarks(values: .stride(by: .day)) { value in
                        AxisValueLabel {
                            if let d = value.as(Date.self) {
                                Text(d.formattedServerDay(style: "d MMM", locale: FeatureL10n.locale))
                                    .font(.caption2)
                            }
                        }
                    }
                }
                .chartYAxis {
                    AxisMarks(position: .leading)
                }
                .frame(height: cappedChartHeight)
                .accessibilityLabel(ProductStrings.chartA11yLabel(dataPoints.count))

                // Summary
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(ProductStrings.upcomingEventsCount(dataPoints.count))
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(SolennixColors.text)

                    Text(ProductStrings.quantityForPeople(quantity: totalQuantity, people: totalPeople))
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                }

                Divider()

                // Event list with urgency badges — today hoisted, UTC calendar used for diff
                ForEach(dataPoints.prefix(5)) { point in
                    let diffDays = cal.dateComponents([.day], from: today, to: point.eventDate).day ?? 999
                    let isUrgent = diffDays <= 3
                    let isThisWeek = diffDays > 3 && diffDays <= 7
                    let pointRevenue = point.unitPrice > 0 ? point.revenue : Double(point.quantity) * basePrice

                    HStack {
                        Circle()
                            .fill(isUrgent ? SolennixColors.primary : (isThisWeek ? SolennixColors.warning : SolennixColors.primary.opacity(0.4)))
                            .frame(width: 8, height: 8)

                        VStack(alignment: .leading, spacing: 2) {
                            HStack(spacing: 4) {
                                Text(point.eventDate.formattedServerDay(style: "d MMM", locale: FeatureL10n.locale))
                                    .font(.subheadline.weight(.medium))
                                    .foregroundStyle(SolennixColors.text)

                                if diffDays == 0 {
                                    urgencyBadge(ProductStrings.today, color: SolennixColors.primary)
                                } else if diffDays == 1 {
                                    urgencyBadge(ProductStrings.tomorrow, color: SolennixColors.warning)
                                } else if diffDays > 1 && diffDays <= 7 {
                                    Text(ProductStrings.inDays(diffDays))
                                        .font(.caption2)
                                        .foregroundStyle(SolennixColors.textSecondary)
                                }
                            }

                            HStack(spacing: Spacing.sm) {
                                Text(point.clientName)
                                    .font(.caption)
                                    .foregroundStyle(SolennixColors.textSecondary)

                                if point.numPeople > 0 {
                                    HStack(spacing: 2) {
                                        Image(systemName: "person.2.fill")
                                            .font(.caption2)
                                        Text("\(point.numPeople)")
                                            .font(.caption2)
                                    }
                                    .foregroundStyle(SolennixColors.textTertiary)
                                }
                            }
                        }

                        Spacer()

                        VStack(alignment: .trailing, spacing: 2) {
                            Text(ProductStrings.quantityUnits(point.quantity))
                                .font(.subheadline.weight(.bold))
                                .foregroundStyle(SolennixColors.text)

                            if pointRevenue > 0 {
                                Text(pointRevenue.formatted(.currency(code: "MXN")))
                                    .font(.caption)
                                    .foregroundStyle(SolennixColors.textSecondary)
                            }
                        }
                    }
                    .padding(.vertical, Spacing.xs)
                    .padding(.horizontal, Spacing.sm)
                    .background(
                        RoundedRectangle(cornerRadius: 8)
                            .fill(isUrgent ? SolennixColors.primary.opacity(0.05) :
                                    (isThisWeek ? SolennixColors.warning.opacity(0.05) : SolennixColors.surface))
                    )
                }

                // Total row
                if totalQuantity > 0 {
                    Divider()

                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(ProductStrings.totalDemandUpper)
                                .font(.caption2)
                                .foregroundStyle(SolennixColors.textSecondary)
                            Text(ProductStrings.eventCount(dataPoints.count))
                                .font(.caption)
                                .foregroundStyle(SolennixColors.textSecondary)
                        }

                        Spacer()

                        VStack(alignment: .trailing, spacing: 2) {
                            Text(ProductStrings.quantityUnits(totalQuantity))
                                .font(.subheadline.weight(.bold))
                                .foregroundStyle(SolennixColors.text)

                            if totalRevenue > 0 {
                                Text(ProductStrings.estimatedAmount(totalRevenue.formatted(.currency(code: "MXN"))))
                                    .font(.caption)
                                    .foregroundStyle(SolennixColors.textSecondary)
                            }
                        }
                    }
                    .padding(.vertical, Spacing.xs)
                }
            } else {
                // Empty state
                VStack(spacing: Spacing.sm) {
                    Image(systemName: "calendar.badge.clock")
                        .font(.system(size: emptyIconSize))
                        .foregroundStyle(SolennixColors.textTertiary)

                    Text(ProductStrings.noUpcomingEvents)
                        .font(.subheadline)
                        .foregroundStyle(SolennixColors.textSecondary)

                    Text(ProductStrings.noUpcomingEventsDescription)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textTertiary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, Spacing.xl)
            }
        }
        .padding(Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
    }

    private func urgencyBadge(_ text: String, color: Color) -> some View {
        Text(text)
            .font(.caption2.weight(.semibold))
            .foregroundStyle(color)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(color.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 4))
    }
}

// MARK: - Preview

#Preview("Demand Forecast Chart") {
    DemandForecastChart(
        dataPoints: [
            DemandDataPoint(id: "1", eventDate: Date().addingTimeInterval(86400 * 2), clientName: "Maria Garcia", quantity: 50, numPeople: 100, unitPrice: 150),
            DemandDataPoint(id: "2", eventDate: Date().addingTimeInterval(86400 * 5), clientName: "Juan Lopez", quantity: 30, numPeople: 60, unitPrice: 150),
            DemandDataPoint(id: "3", eventDate: Date().addingTimeInterval(86400 * 8), clientName: "Ana Martinez", quantity: 80, numPeople: 150, unitPrice: 150)
        ],
        productName: "Paquete Premium",
        basePrice: 150
    )
    .padding()
}

#Preview("Empty Demand Chart") {
    DemandForecastChart(
        dataPoints: [],
        productName: "Producto Sin Demanda",
        basePrice: 100
    )
    .padding()
}
