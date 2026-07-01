import WidgetKit
import SwiftUI
import SolennixDesign
import SolennixCore

// MARK: - Lock Screen Widget Provider

struct LockScreenProvider: TimelineProvider {

    func placeholder(in context: Context) -> LockScreenEntry {
        LockScreenEntry(
            date: Date(),
            nextEvent: sampleEvent,
            eventsToday: 2,
            kpis: sampleKPIs,
            decodeFailed: false
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (LockScreenEntry) -> Void) {
        let entry = makeEntry()
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<LockScreenEntry>) -> Void) {
        let entry = makeEntry()

        // Refresh every 15 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date()
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    /// Builds an entry from the shared store, surfacing events decode failure
    /// so the accessories can route to the `.error` state (REQ-WP-01).
    private func makeEntry() -> LockScreenEntry {
        let eventsResult = WidgetDataProvider.shared.loadUpcomingEvents()
        let events = eventsResult.events
        let kpis = WidgetDataProvider.shared.loadKPIs().kpis
        return LockScreenEntry(
            date: Date(),
            nextEvent: events.first,
            eventsToday: events.filter { $0.isToday }.count,
            kpis: kpis,
            decodeFailed: eventsResult.decodeFailed
        )
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
    /// True when the events payload existed but could not be decoded (→ `.error`).
    let decodeFailed: Bool
}

// MARK: - Lock Screen Widget View

struct LockScreenWidgetView: View {
    var entry: LockScreenEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        // REQ-WP-01: signed-out and a decode failure route to the shared state
        // surface before the accessory switch (decision D10). The existing
        // per-accessory empty branches also delegate to WidgetStateView (DRY).
        if WidgetAuthState.current == .signedOut {
            accessoryStateSurface(.signedOut)
        } else if entry.decodeFailed {
            accessoryStateSurface(.error)
        } else {
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
    }

    /// Renders an abnormal state (signed-out / error) in a form that fits each
    /// accessory family. Inline is single-line, so it uses a `Label` instead of
    /// the block-shaped `WidgetStateView`.
    @ViewBuilder
    private func accessoryStateSurface(_ state: WidgetStateView.State) -> some View {
        switch family {
        case .accessoryInline:
            Label {
                Text(state == .error ? "widget.state.error.title" : "widget.state.signedout.title")
            } icon: {
                Image(systemName: state == .error
                    ? "exclamationmark.triangle.fill"
                    : "person.crop.circle.badge.exclamationmark")
            }
            .foregroundStyle(.secondary)
        case .accessoryCircular:
            // Circular is tiny — icon only.
            WidgetStateView(state: state, compact: true)
        default:
            // Rectangular has room for icon + title.
            WidgetStateView(state: state)
        }
    }

    // MARK: - Circular Widget

    @ViewBuilder
    private var circularWidget: some View {
        if entry.eventsToday > 0 {
            circularFace {
                Text("\(entry.eventsToday)")
                    .font(.system(size: 22, weight: .bold, design: .rounded))

                Text("widget.lockscreen.today")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        } else if let event = entry.nextEvent {
            circularFace {
                Text("\(event.daysUntil)")
                    .font(.system(size: 22, weight: .bold, design: .rounded))

                Text("widget.lockscreen.days")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        } else {
            // No events today and none upcoming → shared compact empty state.
            WidgetStateView(state: .empty, compact: true)
        }
    }

    /// The circular accessory face: accessory background + centered content.
    private func circularFace<C: View>(@ViewBuilder _ content: () -> C) -> some View {
        ZStack {
            AccessoryWidgetBackground()
            VStack(spacing: 0) { content() }
        }
        .containerBackground(.fill.tertiary, for: .widget)
    }

    // MARK: - Rectangular Widget

    @ViewBuilder
    private var rectangularWidget: some View {
        if let event = entry.nextEvent {
            HStack(spacing: 8) {
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

                Spacer()
            }
            .containerBackground(.fill.tertiary, for: .widget)
        } else {
            // Signed in with no upcoming event → shared empty state.
            WidgetStateView(state: .empty)
        }
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
            Label("widget.lockscreen.no_upcoming_inline", systemImage: "calendar")
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
        .configurationDisplayName(LocalizedStringResource("widget.lockscreen.config_name"))
        .description(LocalizedStringResource("widget.lockscreen.config_desc"))
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
        ),
        decodeFailed: false
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
        ),
        decodeFailed: false
    )
}
