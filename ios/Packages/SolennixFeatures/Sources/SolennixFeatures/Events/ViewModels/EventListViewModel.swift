import Foundation
import Observation
import SolennixCore
import SolennixNetwork

// MARK: - Sort

/// Ordering axis for the events list. Each case pairs with `sortAscending`
/// to derive the final comparator.
public enum EventSortField: String, CaseIterable, Sendable {
    case eventDate
    case serviceType
    case clientName
    case totalAmount
}

// MARK: - Event List View Model

@Observable
public final class EventListViewModel {

    // MARK: - State

    public var events: [Event] = []
    public var clients: [Client] = []
    public var searchQuery: String = ""
    public var selectedStatus: EventStatus? = nil
    public var dateRangeStart: Date? = nil
    public var dateRangeEnd: Date? = nil
    public var sortField: EventSortField = .eventDate
    /// For `eventDate` and `totalAmount` we default to DESC (latest / highest
    /// first — that's how organizers scan a list). For string fields we
    /// default to ASC (A → Z). Changed via the toolbar Menu.
    public var sortAscending: Bool = false
    public var isLoading: Bool = false
    public var errorMessage: String? = nil
    public var showAdvancedFilters: Bool = false
    public var deleteTarget: Event?
    public var showDeleteConfirm: Bool = false
    /// ID of the event whose status is being mutated — used to show a
    /// spinner on that row so the rest of the list stays interactive.
    public var updatingStatusEventId: String? = nil

    /// Whether the current data was loaded from cache (not fresh from API).
    public var isShowingCachedData: Bool = false

    // MARK: - Dependencies

    private let apiClient: APIClient
    private var cacheManager: CacheManager?
    private let cacheMaxAge: TimeInterval = 30 * 60

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
        clientMap[clientId]?.name ?? tr("events.list.client_fallback", "Cliente")
    }

    // MARK: - Status Filters

    public var statusFilters: [(status: EventStatus?, label: String, count: Int)] {
        let counts = Dictionary(grouping: events, by: { $0.status }).mapValues { $0.count }
        return [
            (nil, tr("events.list.status.all", "Todos"), events.count),
            (.quoted, tr("events.list.status.quoted", "Cotizado"), counts[.quoted] ?? 0),
            (.confirmed, tr("events.list.status.confirmed", "Confirmado"), counts[.confirmed] ?? 0),
            (.completed, tr("events.list.status.completed", "Completado"), counts[.completed] ?? 0),
            (.cancelled, tr("events.list.status.cancelled", "Cancelado"), counts[.cancelled] ?? 0)
        ]
    }

    // MARK: - Filtered Events

    /// Number of active advanced filters (date range is the only one now —
    /// the client picker was dropped for cross-platform parity; Android and
    /// Web never had it).
    public var activeFilterCount: Int {
        (dateRangeStart != nil || dateRangeEnd != nil) ? 1 : 0
    }

    /// Clears all advanced filters (currently just date range).
    public func clearAdvancedFilters() {
        dateRangeStart = nil
        dateRangeEnd = nil
    }

    public var filteredEvents: [Event] {
        var result = events

        if let status = selectedStatus {
            result = result.filter { $0.status == status }
        }

        // Date range filter
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        if let start = dateRangeStart {
            let startStr = dateFormatter.string(from: Calendar.current.startOfDay(for: start))
            result = result.filter { $0.eventDate >= startStr }
        }
        if let end = dateRangeEnd {
            let nextDay = Calendar.current.date(byAdding: .day, value: 1, to: end) ?? end
            let endStr = dateFormatter.string(from: Calendar.current.startOfDay(for: nextDay))
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

        return result.sorted(by: comparator)
    }

    /// Comparator driven by `sortField` + `sortAscending`. String fields use
    /// `localizedCaseInsensitiveCompare` for correct Spanish/English sorting
    /// (ñ after n, accent-insensitive).
    private var comparator: (Event, Event) -> Bool {
        let ascending = sortAscending
        switch sortField {
        case .eventDate:
            return { lhs, rhs in
                ascending ? lhs.eventDate < rhs.eventDate : lhs.eventDate > rhs.eventDate
            }
        case .serviceType:
            return { lhs, rhs in
                let result = lhs.serviceType.localizedCaseInsensitiveCompare(rhs.serviceType)
                return ascending ? result == .orderedAscending : result == .orderedDescending
            }
        case .clientName:
            let map = clientMap
            return { lhs, rhs in
                let lhsName = map[lhs.clientId]?.name ?? ""
                let rhsName = map[rhs.clientId]?.name ?? ""
                let result = lhsName.localizedCaseInsensitiveCompare(rhsName)
                return ascending ? result == .orderedAscending : result == .orderedDescending
            }
        case .totalAmount:
            return { lhs, rhs in
                ascending ? lhs.totalAmount < rhs.totalAmount : lhs.totalAmount > rhs.totalAmount
            }
        }
    }

    /// Apply sort. If the same field is re-selected, flip the direction —
    /// matches Web's sortable-column behavior. A fresh field resets to the
    /// field's natural default (DESC for numeric/date, ASC for strings).
    public func applySort(_ field: EventSortField) {
        if sortField == field {
            sortAscending.toggle()
        } else {
            sortField = field
            sortAscending = (field == .serviceType || field == .clientName)
        }
    }

    // MARK: - Data Loading

    @MainActor
    public func loadEvents() async {
        isLoading = true
        errorMessage = nil

        // Show cached data immediately while fetching
        if events.isEmpty, let cached = try? cacheManager?.getCachedEvents(maxAge: cacheMaxAge), !cached.isEmpty {
            events = cached
            isShowingCachedData = true
        }

        do {
            async let eventsResult: [Event] = apiClient.getAll(Endpoint.events)
            async let clientsResult: [Client] = apiClient.getAll(Endpoint.clients)
            events = try await eventsResult
            clients = try await clientsResult
            isShowingCachedData = false

            // Update cache with fresh data
            try? cacheManager?.cacheEvents(events)
        } catch {
            if events.isEmpty, let cached = try? cacheManager?.getCachedEvents(maxAge: cacheMaxAge), !cached.isEmpty {
                events = cached
                isShowingCachedData = true
            } else {
                errorMessage = tr("events.list.error.load_failed", "Error cargando eventos")
            }
        }
        isLoading = false
    }

    @MainActor
    public func refresh() async {
        await loadEvents()
    }

    // MARK: - Delete

    @MainActor
    public func softDeleteEvent(_ event: Event) -> (event: Event, index: Int)? {
        guard let index = events.firstIndex(where: { $0.id == event.id }) else { return nil }
        let removed = events.remove(at: index)
        return (removed, index)
    }

    @MainActor
    public func restoreEvent(_ event: Event, at index: Int) {
        let safeIndex = min(index, events.count)
        events.insert(event, at: safeIndex)
    }

    @MainActor
    public func confirmDeleteEvent(_ event: Event) async {
        do {
            try await apiClient.delete(Endpoint.event(event.id))
        } catch {
            events.append(event)
            errorMessage = tr("events.list.error.delete_failed", "Error al eliminar el evento")
        }
    }

    // MARK: - Status Change

    /// Change an event's status via `PUT /events/{id}`. The row shows an
    /// inline spinner via `updatingStatusEventId` while the request is in
    /// flight. On success we patch the local events array so the badge
    /// updates without a full refetch. Parity with Web's inline status
    /// dropdown and Android's long-press bottom sheet action.
    @MainActor
    public func updateEventStatus(_ event: Event, to newStatus: EventStatus) async {
        guard event.status != newStatus else { return }
        updatingStatusEventId = event.id
        defer { updatingStatusEventId = nil }
        do {
            let updated: Event = try await apiClient.put(
                Endpoint.event(event.id),
                body: ["status": newStatus.rawValue]
            )
            if let index = events.firstIndex(where: { $0.id == event.id }) {
                events[index] = updated
            }
        } catch {
            errorMessage = tr("events.list.error.status_change_failed", "No se pudo cambiar el estado")
        }
    }

    // MARK: - CSV Export

    public func generateCsvContent() -> String {
        var csv = [
            tr("events.list.csv.header_name", "Nombre"),
            tr("events.list.csv.header_date", "Fecha"),
            tr("events.list.csv.header_client", "Cliente"),
            tr("events.list.csv.header_status", "Estado"),
            tr("events.list.csv.header_total", "Total"),
            tr("events.list.csv.header_people", "Personas"),
            tr("events.list.csv.header_location", "Lugar")
        ].joined(separator: ",") + "\n"
        let statusLabels: [EventStatus: String] = [
            .quoted: tr("events.list.status.quoted", "Cotizado"),
            .confirmed: tr("events.list.status.confirmed", "Confirmado"),
            .completed: tr("events.list.status.completed", "Completado"),
            .cancelled: tr("events.list.status.cancelled", "Cancelado")
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

    private func tr(_ key: String, _ value: String) -> String {
        FeatureL10n.text(key, value)
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
