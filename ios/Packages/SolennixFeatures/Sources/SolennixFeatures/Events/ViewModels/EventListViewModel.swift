import Foundation
import Observation
import SolennixCore
import SolennixNetwork

// MARK: - Event List View Model

@Observable
public final class EventListViewModel {

    // MARK: - State

    public var events: [Event] = []
    public var clients: [Client] = []
    public var searchQuery: String = ""
    public var selectedStatus: EventStatus? = nil
    public var isLoading: Bool = false
    public var errorMessage: String? = nil

    // MARK: - Dependencies

    private let apiClient: APIClient

    // MARK: - Init

    public init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    // MARK: - Client Map

    private var clientMap: [String: Client] {
        Dictionary(uniqueKeysWithValues: clients.map { ($0.id, $0) })
    }

    public func clientName(for clientId: String) -> String {
        clientMap[clientId]?.name ?? "Cliente"
    }

    // MARK: - Status Filters

    public var statusFilters: [(status: EventStatus?, label: String, count: Int)] {
        let counts = Dictionary(grouping: events, by: { $0.status }).mapValues { $0.count }
        return [
            (nil, "Todos", events.count),
            (.quoted, "Cotizado", counts[.quoted] ?? 0),
            (.confirmed, "Confirmado", counts[.confirmed] ?? 0),
            (.completed, "Completado", counts[.completed] ?? 0),
            (.cancelled, "Cancelado", counts[.cancelled] ?? 0)
        ]
    }

    // MARK: - Filtered Events

    public var filteredEvents: [Event] {
        var result = events

        if let status = selectedStatus {
            result = result.filter { $0.status == status }
        }

        if !searchQuery.isEmpty {
            let query = searchQuery.lowercased()
            result = result.filter { event in
                event.serviceType.lowercased().contains(query) ||
                (clientMap[event.clientId]?.name.lowercased().contains(query) == true) ||
                (event.location?.lowercased().contains(query) == true) ||
                (event.city?.lowercased().contains(query) == true)
            }
        }

        return result.sorted { $0.eventDate > $1.eventDate }
    }

    // MARK: - Data Loading

    @MainActor
    public func loadEvents() async {
        isLoading = true
        errorMessage = nil
        do {
            async let eventsResult: [Event] = apiClient.get(Endpoint.events)
            async let clientsResult: [Client] = apiClient.get(Endpoint.clients)
            events = try await eventsResult
            clients = try await clientsResult
        } catch {
            errorMessage = "Error cargando eventos"
        }
        isLoading = false
    }

    @MainActor
    public func refresh() async {
        await loadEvents()
    }

    // MARK: - CSV Export

    public func generateCsvContent() -> String {
        var csv = "Nombre,Fecha,Cliente,Estado,Total,Personas,Lugar\n"
        let statusLabels: [EventStatus: String] = [
            .quoted: "Cotizado", .confirmed: "Confirmado",
            .completed: "Completado", .cancelled: "Cancelado"
        ]
        for event in filteredEvents {
            let name = event.serviceType.escapingCsv
            let date = String(event.eventDate.prefix(10)).escapingCsv
            let client = clientName(for: event.clientId).escapingCsv
            let status = (statusLabels[event.status] ?? event.status.rawValue).escapingCsv
            let total = event.totalAmount.asMXN.escapingCsv
            let people = "\(event.numPeople)"
            let location = (event.location ?? "").escapingCsv
            csv += "\(name),\(date),\(client),\(status),\(total),\(people),\(location)\n"
        }
        return csv
    }
}

// MARK: - CSV String Escaping

private extension String {
    var escapingCsv: String {
        if contains(",") || contains("\"") || contains("\n") {
            return "\"\(replacingOccurrences(of: "\"", with: "\"\""))\""
        }
        return self
    }
}
