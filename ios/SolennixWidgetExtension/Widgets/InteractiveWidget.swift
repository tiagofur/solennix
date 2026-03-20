import WidgetKit
import SwiftUI
import AppIntents

// MARK: - Interactive Event Widget (iOS 17+)

/// Widget that allows marking events as completed directly from the Home Screen

// MARK: - Mark Event Complete Intent

struct MarkEventCompleteIntent: AppIntent {
    static var title: LocalizedStringResource = "Marcar Evento Completado"
    static var description = IntentDescription("Marca un evento como completado")

    @Parameter(title: "Event ID")
    var eventId: String

    init() {}

    init(eventId: String) {
        self.eventId = eventId
    }

    func perform() async throws -> some IntentResult {
        // Update local state in App Group
        var completedEvents = AppGroup.userDefaults?.stringArray(forKey: "completed_events") ?? []
        if !completedEvents.contains(eventId) {
            completedEvents.append(eventId)
            AppGroup.userDefaults?.set(completedEvents, forKey: "completed_events")
        }

        // Reload widget timeline
        WidgetCenter.shared.reloadTimelines(ofKind: "InteractiveEventWidget")

        return .result()
    }
}

// MARK: - Quick Add Payment Intent

@available(iOS 18.0, *)
struct QuickAddPaymentIntent: AppIntent {
    static var title: LocalizedStringResource = "Agregar Pago Rapido"
    static var description = IntentDescription("Abre la app para agregar un pago")

    @Parameter(title: "Event ID")
    var eventId: String

    init() {}

    init(eventId: String) {
        self.eventId = eventId
    }

    func perform() async throws -> some IntentResult & OpensIntent {
        // This will open the app with a deep link to the payment screen
        guard let url = URL(string: "solennix://event/\(eventId)/payment") else {
            return .result(opensIntent: OpenURLIntent(URL(string: "solennix://")!))
        }
        return .result(opensIntent: OpenURLIntent(url))
    }
}

// MARK: - Timeline Provider

struct InteractiveEventProvider: TimelineProvider {

    func placeholder(in context: Context) -> InteractiveEventEntry {
        InteractiveEventEntry(date: Date(), event: sampleEvent, isCompleted: false)
    }

    func getSnapshot(in context: Context, completion: @escaping (InteractiveEventEntry) -> Void) {
        let events = WidgetDataProvider.shared.getUpcomingEvents()
        let todayEvent = events.first { $0.isToday }
        let completedEvents = AppGroup.userDefaults?.stringArray(forKey: "completed_events") ?? []
        let isCompleted = todayEvent.map { completedEvents.contains($0.id) } ?? false

        let entry = InteractiveEventEntry(
            date: Date(),
            event: todayEvent ?? sampleEvent,
            isCompleted: isCompleted
        )
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<InteractiveEventEntry>) -> Void) {
        let events = WidgetDataProvider.shared.getUpcomingEvents()
        let todayEvent = events.first { $0.isToday }
        let completedEvents = AppGroup.userDefaults?.stringArray(forKey: "completed_events") ?? []
        let isCompleted = todayEvent.map { completedEvents.contains($0.id) } ?? false

        let entry = InteractiveEventEntry(
            date: Date(),
            event: todayEvent,
            isCompleted: isCompleted
        )

        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date()
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    private var sampleEvent: WidgetEvent {
        WidgetEvent(
            id: "sample",
            clientName: "Cliente Ejemplo",
            eventType: "Evento",
            eventDate: Date(),
            startTime: "14:00",
            location: "Ubicacion",
            guestCount: 100,
            status: "confirmed",
            totalAmount: 25000
        )
    }
}

// MARK: - Timeline Entry

struct InteractiveEventEntry: TimelineEntry {
    let date: Date
    let event: WidgetEvent?
    let isCompleted: Bool
}

// MARK: - Interactive Widget View

struct InteractiveEventWidgetView: View {
    var entry: InteractiveEventEntry

    var body: some View {
        if let event = entry.event {
            VStack(alignment: .leading, spacing: 8) {
                // Header
                HStack {
                    Text("Evento de Hoy")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundStyle(.secondary)

                    Spacer()

                    if entry.isCompleted {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(.green)
                    }
                }

                // Event info
                VStack(alignment: .leading, spacing: 4) {
                    Text(event.clientName)
                        .font(.headline)
                        .lineLimit(1)

                    HStack(spacing: 8) {
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

                    if let guests = event.guestCount {
                        HStack(spacing: 2) {
                            Image(systemName: "person.2")
                                .font(.caption2)
                            Text("\(guests) invitados")
                                .font(.caption)
                        }
                        .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                // Action buttons
                HStack(spacing: 8) {
                    // Mark complete button
                    if !entry.isCompleted {
                        Button(intent: MarkEventCompleteIntent(eventId: event.id)) {
                            HStack(spacing: 4) {
                                Image(systemName: "checkmark")
                                    .font(.caption2)
                                Text("Completar")
                                    .font(.caption)
                                    .fontWeight(.medium)
                            }
                            .foregroundStyle(.white)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color.green)
                            .clipShape(Capsule())
                        }
                        .buttonStyle(.plain)
                    } else {
                        HStack(spacing: 4) {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.caption2)
                            Text("Completado")
                                .font(.caption)
                                .fontWeight(.medium)
                        }
                        .foregroundStyle(.green)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.green.opacity(0.15))
                        .clipShape(Capsule())
                    }

                    Spacer()

                    // Quick payment button (requires iOS 18+ for OpenURLIntent)
                    if #available(iOS 18.0, *) {
                        Button(intent: QuickAddPaymentIntent(eventId: event.id)) {
                            HStack(spacing: 4) {
                                Image(systemName: "dollarsign")
                                    .font(.caption2)
                                Text("Pago")
                                    .font(.caption)
                                    .fontWeight(.medium)
                            }
                            .foregroundStyle(.blue)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color.blue.opacity(0.15))
                            .clipShape(Capsule())
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .padding()
            .containerBackground(.fill.tertiary, for: .widget)
        } else {
            // No event today
            VStack(spacing: 8) {
                Image(systemName: "calendar.badge.checkmark")
                    .font(.largeTitle)
                    .foregroundStyle(.secondary)

                Text("Sin eventos hoy")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .containerBackground(.fill.tertiary, for: .widget)
        }
    }
}

// MARK: - Widget Definition

struct InteractiveEventWidget: Widget {
    let kind: String = "InteractiveEventWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: InteractiveEventProvider()) { entry in
            InteractiveEventWidgetView(entry: entry)
        }
        .configurationDisplayName("Evento Activo")
        .description("Interactua con tu evento del dia directamente desde el widget.")
        .supportedFamilies([.systemMedium])
    }
}

// MARK: - Preview

#Preview("Interactive Event", as: .systemMedium) {
    InteractiveEventWidget()
} timeline: {
    InteractiveEventEntry(
        date: Date(),
        event: WidgetEvent(
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
        isCompleted: false
    )
}
