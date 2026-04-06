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
    public var selectedClientId: String? = nil
    public var dateRangeStart: Date? = nil
    public var dateRangeEnd: Date? = nil
    public var isLoading: Bool = false
    public var errorMessage: String? = nil
    public var showAdvancedFilters: Bool = false

    // MARK: - Pagination

    public var currentPage: Int = 1
    public var totalPages: Int = 1
    public var totalItems: Int = 0
    public var isLoadingMore: Bool = false
    private let pageSize: Int = 20

    /// Whether the current data was loaded from cache (not fresh from API).
    public var isShowingCachedData: Bool = false

    // MARK: - Dependencies

    private let apiClient: APIClient
    private var cacheManager: CacheManager?

    // MARK: - Init

    public init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    /// Set the cache manager for offline support.
    public func setCacheManager(_ manager: CacheManager?) {
        self.cacheManager = manager
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

    /// Number of active advanced filters (client + date range).
    public var activeFilterCount: Int {
        var count = 0
        if selectedClientId != nil { count += 1 }
        if dateRangeStart != nil || dateRangeEnd != nil { count += 1 }
        return count
    }

    /// Clears all advanced filters (client, date range).
    public func clearAdvancedFilters() {
        selectedClientId = nil
        dateRangeStart = nil
        dateRangeEnd = nil
    }

    public var filteredEvents: [Event] {
        var result = events

        if let status = selectedStatus {
            result = result.filter { $0.status == status }
        }

        if let clientId = selectedClientId {
            result = result.filter { $0.clientId == clientId }
        }

        // Date range filter
        let isoFormatter = ISO8601DateFormatter()
        isoFormatter.formatOptions = [.withFullDate]
        if let start = dateRangeStart {
            let startStr = isoFormatter.string(from: Calendar.current.startOfDay(for: start))
            result = result.filter { $0.eventDate >= startStr }
        }
        if let end = dateRangeEnd {
            let nextDay = Calendar.current.date(byAdding: .day, value: 1, to: end) ?? end
            let endStr = isoFormatter.string(from: Calendar.current.startOfDay(for: nextDay))
            result = result.filter { $0.eventDate < endStr }
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

    // MARK: - Pagination Helpers

    /// Whether there are more pages available to load.
    public var hasMorePages: Bool {
        currentPage < totalPages
    }

    /// Whether a search/filter is active (skip server pagination in that case).
    private var isFiltering: Bool {
        !searchQuery.isEmpty || selectedStatus != nil || selectedClientId != nil || dateRangeStart != nil || dateRangeEnd != nil
    }

    // MARK: - Data Loading

    @MainActor
    public func loadEvents() async {
        isLoading = true
        errorMessage = nil

        // Show cached data immediately while fetching
        if events.isEmpty, let cached = try? cacheManager?.getCachedEvents(), !cached.isEmpty {
            events = cached
            isShowingCachedData = true
        }

        do {
            if isFiltering {
                async let eventsResult: [Event] = apiClient.getAll(Endpoint.events)
                async let clientsResult: [Client] = apiClient.getAll(Endpoint.clients)
                events = try await eventsResult
                clients = try await clientsResult
                totalPages = 1
                totalItems = events.count
                currentPage = 1
            } else {
                let params: [String: String] = [
                    "page": "\(currentPage)",
                    "limit": "\(pageSize)",
                    "sort": "event_date",
                    "order": "desc"
                ]
                async let paginatedResult: PaginatedResponse<Event> = apiClient.get(Endpoint.events, params: params)
                async let clientsResult: [Client] = apiClient.getAll(Endpoint.clients)

                let paginated = try await paginatedResult
                clients = try await clientsResult

                if currentPage == 1 {
                    events = paginated.data
                } else {
                    events.append(contentsOf: paginated.data)
                }
                totalPages = paginated.totalPages
                totalItems = paginated.total
            }
            isShowingCachedData = false

            // Update cache with fresh data
            try? cacheManager?.cacheEvents(events)
        } catch {
            if events.isEmpty, let cached = try? cacheManager?.getCachedEvents(), !cached.isEmpty {
                events = cached
                isShowingCachedData = true
            } else {
                errorMessage = "Error cargando eventos"
            }
        }
        isLoading = false
    }

    /// Load the next page of events (for infinite scroll).
    @MainActor
    public func loadNextPage() async {
        guard !isLoadingMore, hasMorePages, !isFiltering else { return }
        isLoadingMore = true
        currentPage += 1

        do {
            let params: [String: String] = [
                "page": "\(currentPage)",
                "limit": "\(pageSize)",
                "sort": "event_date",
                "order": "desc"
            ]
            let paginated: PaginatedResponse<Event> = try await apiClient.get(Endpoint.events, params: params)
            events.append(contentsOf: paginated.data)
            totalPages = paginated.totalPages
            totalItems = paginated.total
        } catch {
            // Revert page increment on failure.
            currentPage -= 1
            errorMessage = "Error cargando mas eventos"
        }
        isLoadingMore = false
    }

    /// Reset pagination and reload from page 1. Call when filters change.
    @MainActor
    public func resetPagination() async {
        currentPage = 1
        totalPages = 1
        totalItems = 0
        events = []
        await loadEvents()
    }

    @MainActor
    public func refresh() async {
        currentPage = 1
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
