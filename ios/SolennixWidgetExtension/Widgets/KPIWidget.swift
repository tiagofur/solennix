import WidgetKit
import SwiftUI

// MARK: - Timeline Provider

struct KPIProvider: TimelineProvider {

    func placeholder(in context: Context) -> KPIEntry {
        KPIEntry(date: Date(), kpis: sampleKPIs)
    }

    func getSnapshot(in context: Context, completion: @escaping (KPIEntry) -> Void) {
        let kpis = WidgetDataProvider.shared.getKPIs()
        let entry = KPIEntry(date: Date(), kpis: kpis)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<KPIEntry>) -> Void) {
        let kpis = WidgetDataProvider.shared.getKPIs()
        let entry = KPIEntry(date: Date(), kpis: kpis)

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
}

// MARK: - Widget View

struct KPIWidgetView: View {
    var entry: KPIEntry
    @Environment(\.widgetFamily) var family

    // MARK: - @ScaledMetric sizes (Dynamic Type-safe, capped)
    @ScaledMetric(relativeTo: .largeTitle) private var revenueFontSize: CGFloat = 28
    private var cappedRevenueFontSize: CGFloat { min(revenueFontSize, 36) }

    var body: some View {
        switch family {
        case .systemSmall:
            smallWidget
        case .systemMedium:
            mediumWidget
        default:
            smallWidget
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
                Text("Este mes")
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
                Text("\(entry.kpis.eventsThisMonth) eventos")
                    .font(.caption)
            }
            .foregroundStyle(.secondary)

            Spacer()

            // Trend indicator (mock)
            HStack(spacing: 2) {
                Image(systemName: "arrow.up.right")
                    .font(.caption2)
                    .foregroundStyle(.green)
                Text("+12%")
                    .font(.caption2)
                    .fontWeight(.medium)
                    .foregroundStyle(.green)
            }
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
                        .foregroundStyle(.green)
                    Text("Ingresos")
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
                    Text("Por cobrar")
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
                    iconColor: .blue,
                    label: "Eventos",
                    value: "\(entry.kpis.eventsThisWeek) esta semana"
                )

                // Confirmed
                kpiRow(
                    icon: "checkmark.circle.fill",
                    iconColor: .green,
                    label: "Confirmados",
                    value: "\(entry.kpis.confirmedEvents)"
                )

                // Low stock
                if entry.kpis.lowStockCount > 0 {
                    kpiRow(
                        icon: "exclamationmark.triangle.fill",
                        iconColor: .red,
                        label: "Stock bajo",
                        value: "\(entry.kpis.lowStockCount) items"
                    )
                } else {
                    kpiRow(
                        icon: "checkmark.seal.fill",
                        iconColor: .green,
                        label: "Inventario",
                        value: "OK"
                    )
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding()
        .containerBackground(.fill.tertiary, for: .widget)
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
        .configurationDisplayName("KPIs del Negocio")
        .description("Monitorea ingresos, eventos y alertas importantes.")
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
    ))
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
    ))
}
