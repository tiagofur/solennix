import WidgetKit
import SwiftUI

// MARK: - Lock Screen Widget Provider

struct LockScreenProvider: TimelineProvider {

    func placeholder(in context: Context) -> LockScreenEntry {
        LockScreenEntry(
            date: Date(),
            nextEvent: sampleEvent,
            eventsToday: 2,
            kpis: sampleKPIs
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (LockScreenEntry) -> Void) {
        let events = WidgetDataProvider.shared.getUpcomingEvents()
        let kpis = WidgetDataProvider.shared.getKPIs()
        let entry = LockScreenEntry(
            date: Date(),
            nextEvent: events.first,
            eventsToday: events.filter { $0.isToday }.count,
            kpis: kpis
        )
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<LockScreenEntry>) -> Void) {
        let events = WidgetDataProvider.shared.getUpcomingEvents()
        let kpis = WidgetDataProvider.shared.getKPIs()
        let entry = LockScreenEntry(
            date: Date(),
            nextEvent: events.first,
            eventsToday: events.filter { $0.isToday }.count,
            kpis: kpis
        )

        // Refresh every 15 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date()
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    private var sampleEvent: WidgetEvent {
        WidgetEvent(
            id: "1",
            clientName: "Maria Garcia",
            eventType: "Boda",
            eventDate: Date(),
            startTime: "14:00",
            location: "Salon Jardin",
            guestCount: 150,
            status: "confirmed",
            totalAmount: 45000
        )
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

// MARK: - Lock Screen Entry

struct LockScreenEntry: TimelineEntry {
    let date: Date
    let nextEvent: WidgetEvent?
    let eventsToday: Int
    let kpis: WidgetKPIs
}

// MARK: - Lock Screen Widget View

struct LockScreenWidgetView: View {
    var entry: LockScreenEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .accessoryCircular:
            circularWidget
        case .accessoryRectangular:
            rectangularWidget
        case .accessoryInline:
            inlineWidget
        default:
            circularWidget
        }
    }

    // MARK: - Circular Widget

    private var circularWidget: some View {
        ZStack {
            AccessoryWidgetBackground()

            VStack(spacing: 0) {
                if entry.eventsToday > 0 {
                    Text("\(entry.eventsToday)")
                        .font(.system(size: 22, weight: .bold, design: .rounded))

                    Text("hoy")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                } else if let event = entry.nextEvent {
                    Text("\(event.daysUntil)")
                        .font(.system(size: 22, weight: .bold, design: .rounded))

                    Text("dias")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                } else {
                    Image(systemName: "calendar")
                        .font(.title3)
                    Text("0")
                        .font(.caption2)
                }
            }
        }
        .containerBackground(.fill.tertiary, for: .widget)
    }

    // MARK: - Rectangular Widget

    private var rectangularWidget: some View {
        HStack(spacing: 8) {
            // Event indicator
            if let event = entry.nextEvent {
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 4) {
                        Image(systemName: "calendar")
                            .font(.caption2)
                        Text(event.formattedDate)
                            .font(.caption2)
                            .fontWeight(.semibold)
                    }

                    Text(event.clientName)
                        .font(.headline)
                        .lineLimit(1)

                    HStack(spacing: 4) {
                        Text(event.eventType)
                            .font(.caption)
                            .foregroundStyle(.secondary)

                        if let time = event.startTime {
                            Text("• \(time)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            } else {
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 4) {
                        Image(systemName: "calendar")
                            .font(.caption2)
                        Text("Solennix")
                            .font(.caption2)
                            .fontWeight(.semibold)
                    }

                    Text("Sin eventos")
                        .font(.headline)

                    Text("proximos")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()
        }
        .containerBackground(.fill.tertiary, for: .widget)
    }

    // MARK: - Inline Widget

    private var inlineWidget: some View {
        if let event = entry.nextEvent {
            Label {
                Text("\(event.formattedDate): \(event.clientName)")
            } icon: {
                Image(systemName: "calendar")
            }
        } else {
            Label("Sin eventos proximos", systemImage: "calendar")
        }
    }
}

// MARK: - Widget Definition

struct LockScreenWidget: Widget {
    let kind: String = "LockScreenWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: LockScreenProvider()) { entry in
            LockScreenWidgetView(entry: entry)
        }
        .configurationDisplayName("Eventos en Lock Screen")
        .description("Ve tu proximo evento desde la pantalla de bloqueo.")
        .supportedFamilies([
            .accessoryCircular,
            .accessoryRectangular,
            .accessoryInline
        ])
    }
}

// MARK: - Preview

#Preview("Circular", as: .accessoryCircular) {
    LockScreenWidget()
} timeline: {
    LockScreenEntry(
        date: Date(),
        nextEvent: WidgetEvent(
            id: "1",
            clientName: "Maria Garcia",
            eventType: "Boda",
            eventDate: Date(),
            startTime: "14:00",
            location: nil,
            guestCount: nil,
            status: "confirmed",
            totalAmount: nil
        ),
        eventsToday: 2,
        kpis: WidgetKPIs(
            monthlyRevenue: 0,
            eventsThisMonth: 0,
            eventsThisWeek: 0,
            lowStockCount: 0,
            pendingPayments: 0,
            confirmedEvents: 0,
            quotedEvents: 0
        )
    )
}

#Preview("Rectangular", as: .accessoryRectangular) {
    LockScreenWidget()
} timeline: {
    LockScreenEntry(
        date: Date(),
        nextEvent: WidgetEvent(
            id: "1",
            clientName: "Maria Garcia",
            eventType: "Boda",
            eventDate: Date(),
            startTime: "14:00",
            location: nil,
            guestCount: nil,
            status: "confirmed",
            totalAmount: nil
        ),
        eventsToday: 2,
        kpis: WidgetKPIs(
            monthlyRevenue: 0,
            eventsThisMonth: 0,
            eventsThisWeek: 0,
            lowStockCount: 0,
            pendingPayments: 0,
            confirmedEvents: 0,
            quotedEvents: 0
        )
    )
}
