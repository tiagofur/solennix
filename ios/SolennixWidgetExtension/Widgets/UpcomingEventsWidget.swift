import WidgetKit
import SwiftUI

// MARK: - Timeline Provider

struct UpcomingEventsProvider: TimelineProvider {

    func placeholder(in context: Context) -> UpcomingEventsEntry {
        UpcomingEventsEntry(date: Date(), events: sampleEvents)
    }

    func getSnapshot(in context: Context, completion: @escaping (UpcomingEventsEntry) -> Void) {
        let events = WidgetDataProvider.shared.getUpcomingEvents()
        let entry = UpcomingEventsEntry(date: Date(), events: events.isEmpty ? sampleEvents : events)
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<UpcomingEventsEntry>) -> Void) {
        let events = WidgetDataProvider.shared.getUpcomingEvents()
        let entry = UpcomingEventsEntry(date: Date(), events: events)

        // Refresh every 15 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date()
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    // Sample data for previews
    private var sampleEvents: [WidgetEvent] {
        [
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
            ),
            WidgetEvent(
                id: "2",
                clientName: "Carlos Lopez",
                eventType: "XV Anos",
                eventDate: Calendar.current.date(byAdding: .day, value: 1, to: Date()) ?? Date(),
                startTime: "18:00",
                location: "Club Social",
                guestCount: 200,
                status: "confirmed",
                totalAmount: 55000
            ),
            WidgetEvent(
                id: "3",
                clientName: "Ana Martinez",
                eventType: "Corporativo",
                eventDate: Calendar.current.date(byAdding: .day, value: 3, to: Date()) ?? Date(),
                startTime: "12:00",
                location: "Hotel Plaza",
                guestCount: 80,
                status: "quoted",
                totalAmount: 28000
            )
        ]
    }
}

// MARK: - Timeline Entry

struct UpcomingEventsEntry: TimelineEntry {
    let date: Date
    let events: [WidgetEvent]
}

// MARK: - Widget View

struct UpcomingEventsWidgetView: View {
    var entry: UpcomingEventsEntry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            smallWidget
        case .systemMedium:
            mediumWidget
        case .systemLarge:
            largeWidget
        default:
            smallWidget
        }
    }

    // MARK: - Small Widget

    private var smallWidget: some View {
        VStack(alignment: .leading, spacing: 4) {
            // Header
            HStack {
                Image(systemName: "calendar")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                Text("Proximo")
                    .font(.caption2)
                    .fontWeight(.medium)
                    .foregroundStyle(.secondary)
                Spacer()
            }

            Spacer()

            if let event = entry.events.first {
                VStack(alignment: .leading, spacing: 2) {
                    Text(event.formattedDate)
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundStyle(event.isToday ? .orange : .primary)

                    Text(event.clientName)
                        .font(.headline)
                        .lineLimit(1)

                    Text(event.eventType)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            } else {
                Text("Sin eventos proximos")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            // Event count
            if entry.events.count > 1 {
                Text("+\(entry.events.count - 1) mas")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
        .containerBackground(.fill.tertiary, for: .widget)
    }

    // MARK: - Medium Widget

    private var mediumWidget: some View {
        HStack(spacing: 12) {
            // Left: Next event highlight
            if let event = entry.events.first {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Proximo")
                        .font(.caption2)
                        .fontWeight(.medium)
                        .foregroundStyle(.secondary)

                    Text(event.formattedDate)
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundStyle(event.isToday ? .orange : .primary)

                    Spacer()

                    Text(event.clientName)
                        .font(.headline)
                        .lineLimit(1)

                    Text(event.eventType)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)

                    if let time = event.startTime {
                        HStack(spacing: 2) {
                            Image(systemName: "clock")
                                .font(.caption2)
                            Text(time)
                                .font(.caption)
                        }
                        .foregroundStyle(.secondary)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }

            Divider()

            // Right: Event list
            VStack(alignment: .leading, spacing: 6) {
                ForEach(Array(entry.events.prefix(3).enumerated()), id: \.element.id) { index, event in
                    if index > 0 {
                        eventRow(event)
                    }
                }

                if entry.events.count > 3 {
                    Text("+\(entry.events.count - 3) mas")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }

                Spacer()
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding()
        .containerBackground(.fill.tertiary, for: .widget)
    }

    // MARK: - Large Widget

    private var largeWidget: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Header
            HStack {
                Image(systemName: "calendar")
                    .foregroundStyle(.blue)
                Text("Proximos Eventos")
                    .font(.headline)
                Spacer()
                Text("\(entry.events.count)")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 2)
                    .background(Color.blue)
                    .clipShape(Capsule())
            }

            Divider()

            // Event list
            if entry.events.isEmpty {
                Spacer()
                Text("No hay eventos proximos")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                Spacer()
            } else {
                ForEach(Array(entry.events.prefix(5).enumerated()), id: \.element.id) { index, event in
                    largeEventRow(event)
                    if index < min(entry.events.count - 1, 4) {
                        Divider()
                    }
                }

                if entry.events.count > 5 {
                    HStack {
                        Spacer()
                        Text("Ver \(entry.events.count - 5) mas")
                            .font(.caption)
                            .foregroundStyle(.blue)
                        Spacer()
                    }
                }
            }

            Spacer(minLength: 0)
        }
        .padding()
        .containerBackground(.fill.tertiary, for: .widget)
    }

    // MARK: - Event Row (Medium)

    private func eventRow(_ event: WidgetEvent) -> some View {
        HStack(spacing: 8) {
            Circle()
                .fill(statusColor(for: event.status))
                .frame(width: 6, height: 6)

            VStack(alignment: .leading, spacing: 0) {
                Text(event.clientName)
                    .font(.caption)
                    .fontWeight(.medium)
                    .lineLimit(1)

                Text(event.formattedDate)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
    }

    // MARK: - Large Event Row

    private func largeEventRow(_ event: WidgetEvent) -> some View {
        HStack(spacing: 12) {
            // Date badge
            VStack(spacing: 0) {
                Text(dayOfWeek(event.eventDate))
                    .font(.caption2)
                    .fontWeight(.medium)
                    .foregroundStyle(.secondary)

                Text(dayNumber(event.eventDate))
                    .font(.title3)
                    .fontWeight(.bold)
                    .foregroundStyle(event.isToday ? .orange : .primary)
            }
            .frame(width: 40)

            // Event info
            VStack(alignment: .leading, spacing: 2) {
                Text(event.clientName)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .lineLimit(1)

                HStack(spacing: 8) {
                    Text(event.eventType)
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    if let guests = event.guestCount {
                        HStack(spacing: 2) {
                            Image(systemName: "person.2")
                                .font(.caption2)
                            Text("\(guests)")
                                .font(.caption)
                        }
                        .foregroundStyle(.secondary)
                    }
                }
            }

            Spacer()

            // Status
            Circle()
                .fill(statusColor(for: event.status))
                .frame(width: 8, height: 8)
        }
    }

    // MARK: - Helpers

    private func statusColor(for status: String) -> Color {
        switch status {
        case "confirmed": return .green
        case "quoted": return .orange
        case "completed": return .gray
        case "cancelled": return .red
        default: return .blue
        }
    }

    private func dayOfWeek(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE"
        formatter.locale = Locale(identifier: "es_MX")
        return formatter.string(from: date).uppercased()
    }

    private func dayNumber(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "d"
        return formatter.string(from: date)
    }
}

// MARK: - Widget Definition

struct UpcomingEventsWidget: Widget {
    let kind: String = "UpcomingEventsWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: UpcomingEventsProvider()) { entry in
            UpcomingEventsWidgetView(entry: entry)
        }
        .configurationDisplayName("Proximos Eventos")
        .description("Ve tus proximos eventos de un vistazo.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

// MARK: - Preview

private let previewSampleEvents: [WidgetEvent] = [
    WidgetEvent(
        id: "1",
        clientName: "María García",
        eventType: "Boda",
        eventDate: Date(),
        startTime: "14:00",
        location: "Salón Jardín",
        guestCount: 150,
        status: "confirmed",
        totalAmount: 45000
    ),
    WidgetEvent(
        id: "2",
        clientName: "Carlos López",
        eventType: "XV Años",
        eventDate: Calendar.current.date(byAdding: .day, value: 1, to: Date()) ?? Date(),
        startTime: "18:00",
        location: "Club Social",
        guestCount: 200,
        status: "confirmed",
        totalAmount: 55000
    ),
    WidgetEvent(
        id: "3",
        clientName: "Ana Martínez",
        eventType: "Corporativo",
        eventDate: Calendar.current.date(byAdding: .day, value: 3, to: Date()) ?? Date(),
        startTime: "12:00",
        location: "Hotel Plaza",
        guestCount: 80,
        status: "quoted",
        totalAmount: 28000
    )
]

#Preview("Small", as: .systemSmall) {
    UpcomingEventsWidget()
} timeline: {
    UpcomingEventsEntry(date: Date(), events: previewSampleEvents)
}

#Preview("Medium", as: .systemMedium) {
    UpcomingEventsWidget()
} timeline: {
    UpcomingEventsEntry(date: Date(), events: previewSampleEvents)
}

#Preview("Large", as: .systemLarge) {
    UpcomingEventsWidget()
} timeline: {
    UpcomingEventsEntry(date: Date(), events: previewSampleEvents)
}
