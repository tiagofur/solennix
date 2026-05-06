import AppIntents
import SwiftUI

// MARK: - Show Upcoming Events Intent

struct ShowUpcomingEventsIntent: AppIntent {

    static let title: LocalizedStringResource = "Mostrar Proximos Eventos"
    static let description = IntentDescription("Muestra tus proximos eventos programados")

    static let openAppWhenRun: Bool = false

    nonisolated init() {}

    @Parameter(title: "Numero de eventos", default: 5)
    var count: Int

    func perform() async throws -> some IntentResult & ProvidesDialog & ShowsSnippetView {
        // In a real implementation, this would fetch from the API or local cache
        let events = await fetchUpcomingEvents(limit: count)

        if events.isEmpty {
            return .result(
                dialog: "No tienes eventos proximos programados.",
                view: EmptyEventsView()
            )
        }

        _ = events.map { "\($0.date): \($0.clientName) - \($0.eventType)" }.joined(separator: "\n")

        return .result(
            dialog: "Tienes \(events.count) eventos proximos.",
            view: UpcomingEventsSnippetView(events: events)
        )
    }

    private func fetchUpcomingEvents(limit: Int) async -> [EventSummary] {
        // Mock data - in production, read from shared App Group or API
        return [
            EventSummary(id: "1", clientName: "Maria Garcia", eventType: "Boda", date: "Hoy", time: "14:00"),
            EventSummary(id: "2", clientName: "Carlos Lopez", eventType: "XV Anos", date: "Manana", time: "18:00"),
            EventSummary(id: "3", clientName: "Ana Martinez", eventType: "Corporativo", date: "15 Mar", time: "12:00")
        ].prefix(limit).map { $0 }
    }
}

// MARK: - Event Summary Model

struct EventSummary: Identifiable {
    let id: String
    let clientName: String
    let eventType: String
    let date: String
    let time: String
}

// MARK: - Snippet Views

struct UpcomingEventsSnippetView: View {
    let events: [EventSummary]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            ForEach(events) { event in
                HStack(spacing: 12) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(event.date)
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundStyle(.orange)

                        Text(event.clientName)
                            .font(.headline)

                        HStack(spacing: 4) {
                            Text(event.eventType)
                            Text("•")
                            Text(event.time)
                        }
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    }

                    Spacer()
                }
                .padding(.vertical, 8)

                if event.id != events.last?.id {
                    Divider()
                }
            }
        }
        .padding()
    }
}

struct EmptyEventsView: View {
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: "calendar.badge.checkmark")
                .font(.largeTitle)
                .foregroundStyle(.secondary)

            Text("Sin eventos proximos")
                .font(.headline)
        }
        .padding()
    }
}
