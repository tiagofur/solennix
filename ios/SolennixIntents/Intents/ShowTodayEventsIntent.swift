import AppIntents
import SwiftUI

// MARK: - Show Today Events Intent

struct ShowTodayEventsIntent: AppIntent {

    static var title: LocalizedStringResource = "Eventos de Hoy"
    static var description = IntentDescription("Muestra los eventos programados para hoy")

    static var openAppWhenRun: Bool = false

    nonisolated init() {}

    func perform() async throws -> some IntentResult & ProvidesDialog & ShowsSnippetView {
        let events = await fetchTodayEvents()

        if events.isEmpty {
            return .result(
                dialog: "No tienes eventos hoy. Disfruta tu dia libre!",
                view: NoEventsToday()
            )
        }

        let eventWord = events.count == 1 ? "evento" : "eventos"
        return .result(
            dialog: "Tienes \(events.count) \(eventWord) hoy.",
            view: TodayEventsSnippetView(events: events)
        )
    }

    private func fetchTodayEvents() async -> [TodayEvent] {
        // Mock data - in production, read from shared App Group or API
        return [
            TodayEvent(
                id: "1",
                clientName: "Maria Garcia",
                eventType: "Boda",
                time: "14:00",
                location: "Salon Jardin",
                guestCount: 150,
                status: "confirmed"
            )
        ]
    }
}

// MARK: - Today Event Model

struct TodayEvent: Identifiable {
    let id: String
    let clientName: String
    let eventType: String
    let time: String
    let location: String
    let guestCount: Int
    let status: String

    var statusColor: Color {
        switch status {
        case "confirmed": return .green
        case "quoted": return .orange
        default: return .blue
        }
    }
}

// MARK: - Snippet Views

struct TodayEventsSnippetView: View {
    let events: [TodayEvent]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: "sun.max.fill")
                    .foregroundStyle(.orange)
                Text("Hoy")
                    .font(.headline)
                Spacer()
            }

            ForEach(events) { event in
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text(event.time)
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundStyle(.blue)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.blue.opacity(0.1))
                            .clipShape(Capsule())

                        Circle()
                            .fill(event.statusColor)
                            .frame(width: 8, height: 8)

                        Spacer()
                    }

                    Text(event.clientName)
                        .font(.headline)

                    HStack(spacing: 12) {
                        Label(event.eventType, systemImage: "star")
                        Label(event.location, systemImage: "mappin")
                        Label("\(event.guestCount)", systemImage: "person.2")
                    }
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }
                .padding()
                .background(Color(.systemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
        .padding()
    }
}

struct NoEventsToday: View {
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 48))
                .foregroundStyle(.green)

            Text("Sin eventos hoy")
                .font(.headline)

            Text("Disfruta tu dia!")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding()
    }
}
