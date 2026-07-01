import WidgetKit
import SwiftUI
import SolennixDesign
import SolennixCore

// MARK: - Timeline Provider

struct KPIProvider: TimelineProvider {

    func placeholder(in context: Context) -> KPIEntry {
        KPIEntry(date: Date(), kpis: sampleKPIs, decodeFailed: false, hasData: true)
    }

    func getSnapshot(in context: Context, completion: @escaping (KPIEntry) -> Void) {
        let result = WidgetDataProvider.shared.loadKPIs()
        let entry = KPIEntry(date: Date(), kpis: result.kpis, decodeFailed: result.decodeFailed, hasData: result.hasData)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<KPIEntry>) -> Void) {
        let result = WidgetDataProvider.shared.loadKPIs()
        let entry = KPIEntry(date: Date(), kpis: result.kpis, decodeFailed: result.decodeFailed, hasData: result.hasData)

        // Refresh every 30 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 30, to: Date()) ?? Date()
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    private var sampleKPIs: WidgetKPIs {
        WidgetKPIs(
            monthlyRevenue: 125000,
            eventsThisMonth: 8,
            eventsThisWeek: 3,
            lowStockCount: 5,
            pendingPayments: 35000,
            confirmedEvents: 6,
            quotedEvents: 4
        )
    }
}

// MARK: - Timeline Entry

struct KPIEntry: TimelineEntry {
    let date: Date
    let kpis: WidgetKPIs
    /// True when a payload existed but could not be decoded (→ `.error`).
    let decodeFailed: Bool
    /// True when any KPI payload exists in the App Group (drives `.empty`).
    let hasData: Bool
}

// MARK: - Widget View

struct KPIWidgetView: View {
    var entry: KPIEntry
    @Environment(\.widgetFamily) var family

    // MARK: - @ScaledMetric sizes (Dynamic Type-safe, capped)
    @ScaledMetric(relativeTo: .largeTitle) private var revenueFontSize: CGFloat = 28
    private var cappedRevenueFontSize: CGFloat { min(revenueFontSize, 36) }

    var body: some View {
        // REQ-WP-01: every family renders the four states. signed-out and a
        // decode failure short-circuit to the shared state surface before the
        // family switch (decision D10 / #3135).
        if WidgetAuthState.current == .signedOut {
            WidgetStateView(state: .signedOut)
        } else if entry.decodeFailed {
            WidgetStateView(state: .error)
        } else if !entry.hasData {
            WidgetStateView(state: .empty)
        } else {
            switch family {
            case .systemSmall:
                smallWidget
            case .systemMedium:
                mediumWidget
            default:
                smallWidget
            }
        }
    }

    // MARK: - Small Widget (Revenue Focus)

    private var smallWidget: some View {
        VStack(alignment: .leading, spacing: 4) {
            // Header
            HStack {
                Image(systemName: "chart.bar.fill")
                    .font(.caption2)
                    .foregroundStyle(.green)
                Text("widget.kpi.this_month")
                    .font(.caption2)
                    .fontWeight(.medium)
                    .foregroundStyle(.secondary)
                Spacer()
            }

            Spacer()

            // Revenue
            Text(entry.kpis.formattedRevenue)
                .font(.system(size: cappedRevenueFontSize, weight: .bold, design: .rounded))
                .foregroundStyle(.primary)
                .lineLimit(1)
                .minimumScaleFactor(0.6)

            // Events count
            HStack(spacing: 4) {
                Image(systemName: "calendar")
                    .font(.caption2)
                Text(verbatim: String.localizedStringWithFormat(String(localized: "widget.kpi.events_count_fmt"), entry.kpis.eventsThisMonth))
                    .font(.caption)
            }
            .foregroundStyle(.secondary)

            Spacer()

            // Trend indicator (decision #3134 / REQ-WP-03): neutral by default.
            // Renders only when the backend supplies a real `revenueTrend` —
            // never a fabricated "+12%" (NFR-WP-01).
            trendIndicator
        }
        .padding()
        .containerBackground(.fill.tertiary, for: .widget)
    }

    // MARK: - Medium Widget (Multi KPI)

    private var mediumWidget: some View {
        HStack(spacing: 16) {
            // Left: Revenue
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Image(systemName: "dollarsign.circle.fill")
                        .symbolRenderingMode(.palette)
                        .foregroundStyle(.green, .white)
                    Text("widget.kpi.revenue")
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundStyle(.secondary)
                }

                Text(entry.kpis.formattedRevenue)
                    .font(.title2)
                    .fontWeight(.bold)

                Spacer()

                // Pending payments
                VStack(alignment: .leading, spacing: 2) {
                    Text("widget.kpi.pending")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    Text(entry.kpis.formattedPendingPayments)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundStyle(.orange)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            Divider()

            // Right: Event & Stock KPIs
            VStack(alignment: .leading, spacing: 12) {
                // Events
                kpiRow(
                    icon: "calendar",
                    iconColor: SolennixColors.primary,
                    label: String(localized: "widget.kpi.events"),
                    value: String.localizedStringWithFormat(String(localized: "widget.kpi.this_week_fmt"), entry.kpis.eventsThisWeek)
                )

                // Confirmed
                kpiRow(
                    icon: "checkmark.circle.fill",
                    iconColor: .green,
                    label: String(localized: "widget.kpi.confirmed"),
                    value: "\(entry.kpis.confirmedEvents)"
                )

                // Low stock
                if entry.kpis.lowStockCount > 0 {
                    kpiRow(
                        icon: "exclamationmark.triangle.fill",
                        iconColor: .red,
                        label: String(localized: "widget.kpi.low_stock"),
                        value: String.localizedStringWithFormat(String(localized: "widget.kpi.items_fmt"), entry.kpis.lowStockCount)
                    )
                } else {
                    kpiRow(
                        icon: "checkmark.seal.fill",
                        iconColor: .green,
                        label: String(localized: "widget.kpi.inventory"),
                        value: String(localized: "widget.kpi.inventory_ok")
                    )
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding()
        .containerBackground(.fill.tertiary, for: .widget)
    }

    // MARK: - Trend (neutral seam)

    /// Renders the trend glyph + percentage when the backend provides one, or a
    /// neutral em dash when it does not (decision #3134, REQ-WP-03).
    @ViewBuilder
    private var trendIndicator: some View {
        if let trend = entry.kpis.revenueTrend {
            HStack(spacing: 2) {
                Image(systemName: trendArrow(trend.direction))
                    .font(.caption2)
                Text(formattedPercentage(trend))
                    .font(.caption2)
                    .fontWeight(.medium)
            }
            .foregroundStyle(trendColor(trend.direction))
        } else {
            Text(verbatim: "—")
                .font(.caption2)
                .fontWeight(.medium)
                .foregroundStyle(.secondary)
        }
    }

    private func trendArrow(_ direction: WidgetTrend.Direction) -> String {
        switch direction {
        case .up: return "arrow.up.right"
        case .down: return "arrow.down.right"
        case .flat: return "arrow.right"
        }
    }

    private func trendColor(_ direction: WidgetTrend.Direction) -> Color {
        switch direction {
        case .up: return .green
        case .down: return .red
        case .flat: return .secondary
        }
    }

    private func formattedPercentage(_ trend: WidgetTrend) -> String {
        let value = Int(trend.percentage.rounded())
        switch trend.direction {
        case .up: return "+\(value)%"
        case .down: return "-\(value)%"
        case .flat: return "\(value)%"
        }
    }

    // MARK: - KPI Row

    private func kpiRow(icon: String, iconColor: Color, label: String, value: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .font(.caption)
                .foregroundStyle(iconColor)
                .frame(width: 16)

            VStack(alignment: .leading, spacing: 0) {
                Text(label)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                Text(value)
                    .font(.caption)
                    .fontWeight(.medium)
            }
        }
    }
}

// MARK: - Widget Definition

struct KPIWidget: Widget {
    let kind: String = "KPIWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: KPIProvider()) { entry in
            KPIWidgetView(entry: entry)
        }
        .configurationDisplayName(LocalizedStringResource("widget.kpi.config_name"))
        .description(LocalizedStringResource("widget.kpi.config_desc"))
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// MARK: - Preview

#Preview("Small KPI", as: .systemSmall) {
    KPIWidget()
} timeline: {
    KPIEntry(date: Date(), kpis: WidgetKPIs(
        monthlyRevenue: 125000,
        eventsThisMonth: 8,
        eventsThisWeek: 3,
        lowStockCount: 5,
        pendingPayments: 35000,
        confirmedEvents: 6,
        quotedEvents: 4
    ), decodeFailed: false, hasData: true)
}

#Preview("Medium KPI", as: .systemMedium) {
    KPIWidget()
} timeline: {
    KPIEntry(date: Date(), kpis: WidgetKPIs(
        monthlyRevenue: 125000,
        eventsThisMonth: 8,
        eventsThisWeek: 3,
        lowStockCount: 5,
        pendingPayments: 35000,
        confirmedEvents: 6,
        quotedEvents: 4
    ), decodeFailed: false, hasData: true)
}
