import AppIntents
import SwiftUI

// MARK: - Event Count Intent

struct EventCountIntent: AppIntent {

    static let title: LocalizedStringResource = "Conteo de Eventos"
    static let description = IntentDescription("Cuenta cuantos eventos tienes programados")

    static let openAppWhenRun: Bool = false

    @Parameter(title: "Periodo", default: .thisWeek)
    var period: EventPeriod

    func perform() async throws -> some IntentResult & ProvidesDialog & ShowsSnippetView {
        let counts = await fetchEventCounts()

        let count: Int
        let periodText: String

        switch period {
        case .today:
            count = counts.today
            periodText = "hoy"
        case .thisWeek:
            count = counts.thisWeek
            periodText = "esta semana"
        case .thisMonth:
            count = counts.thisMonth
            periodText = "este mes"
        }

        let dialog: String
        if count == 0 {
            dialog = "No tienes eventos \(periodText)."
        } else if count == 1 {
            dialog = "Tienes 1 evento \(periodText)."
        } else {
            dialog = "Tienes \(count) eventos \(periodText)."
        }

        return .result(
            dialog: IntentDialog(stringLiteral: dialog),
            view: EventCountSnippetView(counts: counts, selectedPeriod: period)
        )
    }

    private func fetchEventCounts() async -> EventCounts {
        // Mock data - in production, read from shared App Group or API
        return EventCounts(today: 1, thisWeek: 4, thisMonth: 12, confirmed: 10, quoted: 2)
    }
}

// MARK: - Event Period Enum

enum EventPeriod: String, AppEnum {
    case today = "hoy"
    case thisWeek = "esta_semana"
    case thisMonth = "este_mes"

    static let typeDisplayRepresentation = TypeDisplayRepresentation(name: "Periodo")

    static let caseDisplayRepresentations: [EventPeriod: DisplayRepresentation] = [
        .today: "Hoy",
        .thisWeek: "Esta semana",
        .thisMonth: "Este mes"
    ]
}

// MARK: - Event Counts Model

struct EventCounts {
    let today: Int
    let thisWeek: Int
    let thisMonth: Int
    let confirmed: Int
    let quoted: Int
}

// MARK: - Snippet View

struct EventCountSnippetView: View {
    let counts: EventCounts
    let selectedPeriod: EventPeriod

    var body: some View {
        VStack(spacing: 16) {
            // Main count
            HStack {
                VStack(alignment: .leading) {
                    Text(periodLabel)
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    Text("\(selectedCount)")
                        .font(.system(size: 48, weight: .bold, design: .rounded))
                        .foregroundStyle(.blue)

                    Text(selectedCount == 1 ? "evento" : "eventos")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Image(systemName: "calendar")
                    .font(.system(size: 40))
                    .foregroundStyle(.blue.opacity(0.3))
            }

            Divider()

            // Breakdown
            HStack(spacing: 24) {
                countBadge(label: "Confirmados", count: counts.confirmed, color: .green)
                countBadge(label: "Cotizados", count: counts.quoted, color: .orange)
            }
        }
        .padding()
    }

    private var selectedCount: Int {
        switch selectedPeriod {
        case .today: return counts.today
        case .thisWeek: return counts.thisWeek
        case .thisMonth: return counts.thisMonth
        }
    }

    private var periodLabel: String {
        switch selectedPeriod {
        case .today: return "Hoy"
        case .thisWeek: return "Esta semana"
        case .thisMonth: return "Este mes"
        }
    }

    private func countBadge(label: String, count: Int, color: Color) -> some View {
        VStack(spacing: 4) {
            Text("\(count)")
                .font(.title2)
                .fontWeight(.bold)
                .foregroundStyle(color)

            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
    }
}
