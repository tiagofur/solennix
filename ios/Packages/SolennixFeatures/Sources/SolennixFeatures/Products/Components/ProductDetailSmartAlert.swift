import SwiftUI
import SolennixDesign

// MARK: - Product Detail Smart Alert

/// Translucent iOS-style smart demand banner shown under the title card.
/// All demand inputs are passed in explicitly so the component stays presentational.
struct ProductDetailSmartAlert: View {

    /// Units demanded within the next 7 days.
    let demand7Days: Int
    /// True when there is any recorded demand (controls the empty-state copy).
    let hasDemand: Bool
    /// Estimated revenue across the 7-day window.
    let estimatedRevenue7Days: Double
    /// Total units demanded across all upcoming events.
    let totalDemand: Int
    /// Number of demand data points (events) backing the totals.
    let eventCount: Int

    private var isHighDemand: Bool { demand7Days > 0 }

    var body: some View {
        HStack(alignment: .top, spacing: Spacing.md) {
            Image(systemName: isHighDemand ? "exclamationmark.triangle.fill" : "checkmark.circle.fill")
                .foregroundStyle(isHighDemand ? SolennixColors.primary : SolennixColors.success)
                .font(.title3)

            VStack(alignment: .leading, spacing: 4) {
                Text(isHighDemand
                     ? ProductStrings.unitsNext7Days(demand7Days)
                     : hasDemand ? ProductStrings.noImmediateDemand : ProductStrings.noUpcomingEvents
                )
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(isHighDemand ? SolennixColors.primary : SolennixColors.success)

                Group {
                    if isHighDemand {
                        if estimatedRevenue7Days > 0 {
                            Text(ProductStrings.revenueMessage(estimatedRevenue7Days.formatted(.currency(code: "MXN"))))
                        } else {
                            Text(ProductStrings.highDemandWeek)
                        }
                    } else if hasDemand {
                        Text(ProductStrings.demandSummary(units: totalDemand, events: eventCount))
                    } else {
                        Text(ProductStrings.noConfirmedEvents)
                    }
                }
                .font(.caption)
                .foregroundStyle(SolennixColors.textSecondary)
            }

            Spacer()
        }
        .padding(Spacing.md)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
        .overlay(
            RoundedRectangle(cornerRadius: CornerRadius.md)
                .stroke(isHighDemand ? SolennixColors.primary.opacity(0.2) : Color.primary.opacity(0.06), lineWidth: 0.5)
        )
        .shadow(color: Color.black.opacity(0.03), radius: 6, y: 3)
        .padding(.horizontal, Spacing.md)
    }
}
