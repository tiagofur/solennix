import SwiftUI
import SolennixCore
import SolennixDesign

// MARK: - Demand Forecast Section

struct InventoryDemandForecastSection: View {
    let rows: [DemandRowData]
    let total: Double
    let unit: String
    let emptyIconSize: CGFloat

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack {
                Image(systemName: "calendar")
                    .foregroundStyle(SolennixColors.primary)
                    .accessibilityHidden(true)
                Text(InventoryStrings.demandByDate)
                    .font(.headline)
                    .foregroundStyle(SolennixColors.text)
                Spacer()
                Text(InventoryStrings.confirmedEvents)
                    .font(.caption2)
                    .foregroundStyle(SolennixColors.textSecondary)
            }

            if rows.isEmpty {
                VStack(spacing: Spacing.sm) {
                    Image(systemName: "calendar.badge.clock")
                        .font(.system(size: emptyIconSize))
                        .foregroundStyle(SolennixColors.textTertiary)
                        .accessibilityHidden(true)
                    Text(InventoryStrings.noConfirmedEvents)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(.horizontal, Spacing.md)
                .padding(.vertical, Spacing.lg)
                .accessibilityElement(children: .combine)
            } else {
                ForEach(rows, id: \.entry.id) { row in
                    InventoryDemandRow(row: row)
                }

                Divider()
                HStack {
                    Text(InventoryStrings.totalDemand)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                    Spacer()
                    Text(total.formatted(.number.precision(.fractionLength(0...2))) + " \(unit)")
                        .font(.subheadline)
                        .fontWeight(.bold)
                        .foregroundStyle(SolennixColors.text)
                }
            }
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .solennixRow()
        .listRowInsets(EdgeInsets(top: Spacing.sm, leading: Spacing.md, bottom: Spacing.sm, trailing: Spacing.md))
    }
}

// MARK: - Demand Row

struct InventoryDemandRow: View {
    let row: DemandRowData

    var body: some View {
        let entry = row.entry
        // Fix #2: diffDays already computed with utcCalendar against todayUTC
        let diffDays = row.diffDays
        let isWithinWeek = diffDays >= 0 && diffDays <= 7

        HStack {
            Circle()
                .fill(row.isInsufficient ? SolennixColors.error : (isWithinWeek ? SolennixColors.warning : SolennixColors.primary.opacity(0.4)))
                .frame(width: 8, height: 8)
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 4) {
                    // Fix #1: entry.eventDate already parsed with fromServerDay; format with UTC formatter
                    Text(entry.eventDate.formattedServerDay(style: "d MMM"))
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(SolennixColors.text)

                    if diffDays == 0 {
                        InventoryBadgeLabel(text: InventoryStrings.today, color: SolennixColors.primary)
                    } else if diffDays == 1 {
                        InventoryBadgeLabel(text: InventoryStrings.tomorrow, color: SolennixColors.warning)
                    } else if diffDays > 1 && diffDays <= 7 {
                        Text(InventoryStrings.inDays(diffDays))
                            .font(.caption2)
                            .foregroundStyle(SolennixColors.textSecondary)
                    }
                }
                Text(entry.eventName)
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)
                    .lineLimit(1)
            }

            Spacer()

            // Fix #10: .formatted instead of Int() truncation
            Text(entry.quantity.formatted(.number.precision(.fractionLength(0...2))) + " \(entry.unit)")
                .font(.subheadline)
                .fontWeight(.bold)
                .foregroundStyle(row.isInsufficient ? SolennixColors.error : SolennixColors.text)
        }
        .padding(.vertical, Spacing.xs)
        // Fix #10: a11y combined label for demand rows
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(InventoryStrings.demandRowA11y(
            name: entry.eventName,
            quantity: entry.quantity.formatted(.number.precision(.fractionLength(0...2))),
            unit: entry.unit,
            diffDays: diffDays,
            isInsufficient: row.isInsufficient
        ))
    }
}

// MARK: - Badge Label

struct InventoryBadgeLabel: View {
    let text: String
    let color: Color

    var body: some View {
        Text(text)
            .font(.caption2)
            .fontWeight(.semibold)
            .foregroundStyle(color)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(color.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 4))
    }
}
