import WidgetKit
import SwiftUI
import SolennixDesign
import SolennixCore
import AppIntents

// MARK: - Interactive Event Widget (iOS 17+)

/// Widget that allows marking events as completed directly from the Home Screen

// MARK: - Mark Event Complete Intent

struct MarkEventCompleteIntent: AppIntent {
    static var title: LocalizedStringResource = "widget.interactive.mark_complete.title"
    static var description = IntentDescription("widget.interactive.mark_complete.desc")

    @Parameter(title: "widget.interactive.param.event_id")
    var eventId: String

    init() {}

    init(eventId: String) {
        self.eventId = eventId
    }

    func perform() async throws -> some IntentResult {
        // Update local state in App Group
        var completedEvents = AppGroup.userDefaults.stringArray(forKey: "completed_events") ?? []
        if !completedEvents.contains(eventId) {
            completedEvents.append(eventId)
            AppGroup.userDefaults.set(completedEvents, forKey: "completed_events")
            AppGroup.userDefaults.synchronize()
        }

        // Reload widget timeline
        WidgetCenter.shared.reloadTimelines(ofKind: "InteractiveEventWidget")

        return .result()
    }
}

// MARK: - Quick Add Payment Intent

@available(iOS 18.0, *)
struct QuickAddPaymentIntent: AppIntent {
    static var title: LocalizedStringResource = "widget.interactive.quick_payment.title"
    static var description = IntentDescription("widget.interactive.quick_payment.desc")

    @Parameter(title: "widget.interactive.param.event_id")
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
        InteractiveEventEntry(date: Date(), event: sampleEvent, isCompleted: false, decodeFailed: false)
    }

    func getSnapshot(in context: Context, completion: @escaping (InteractiveEventEntry) -> Void) {
        let entry = makeEntry()
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<InteractiveEventEntry>) -> Void) {
        let entry = makeEntry()

        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date()) ?? Date()
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    /// Builds an entry from the shared store, surfacing decode failure so the
    /// widget can route to the `.error` state (REQ-WP-01).
    private func makeEntry() -> InteractiveEventEntry {
        let result = WidgetDataProvider.shared.loadUpcomingEvents()
        let todayEvent = result.events.first { $0.isToday }
        let completedEvents = AppGroup.userDefaults.stringArray(forKey: "completed_events") ?? []
        let isCompleted = todayEvent.map { completedEvents.contains($0.id) } ?? false

        return InteractiveEventEntry(
            date: Date(),
            event: todayEvent,
            isCompleted: isCompleted,
            decodeFailed: result.decodeFailed
        )
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
    /// True when the events payload existed but could not be decoded (→ `.error`).
    let decodeFailed: Bool
}

// MARK: - Interactive Widget View

struct InteractiveEventWidgetView: View {
    var entry: InteractiveEventEntry

    var body: some View {
        // REQ-WP-01: signed-out and decode-error route to the shared state
        // surface before the content; no-event-today also delegates to it.
        if WidgetAuthState.current == .signedOut {
            WidgetStateView(state: .signedOut)
        } else if entry.decodeFailed {
            WidgetStateView(state: .error)
        } else if let event = entry.event {
            VStack(alignment: .leading, spacing: 8) {
                // Header
                HStack {
                    Text("widget.interactive.event_today")
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
                            Text(verbatim: String.localizedStringWithFormat(String(localized: "widget.interactive.guests_fmt"), guests))
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
                                Text("widget.interactive.complete")
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
                            Text("widget.interactive.completed")
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
                                Text("widget.interactive.payment")
                                    .font(.caption)
                                    .fontWeight(.medium)
                            }
                            .foregroundStyle(SolennixColors.primary)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(SolennixColors.primary.opacity(0.15))
                            .clipShape(Capsule())
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .padding()
            .containerBackground(.fill.tertiary, for: .widget)
        } else {
            // No event today → shared empty state (replaces the bespoke block).
            WidgetStateView(state: .empty, systemImage: "calendar.badge.plus")
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
        .configurationDisplayName(LocalizedStringResource("widget.interactive.config_name"))
        .description(LocalizedStringResource("widget.interactive.config_desc"))
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
        isCompleted: false,
        decodeFailed: false
    )
}
