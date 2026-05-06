import Foundation
import Observation
import SolennixCore
import SolennixNetwork

// MARK: - Sort Key

public enum ClientSortKey: String, CaseIterable {
    case updatedAt
    case name
    case totalEvents
    case totalSpent
    case createdAt

    public var label: String {
        switch self {
        case .updatedAt:
            return String(localized: "clients.sort.updated_at", defaultValue: "Última actualización", bundle: .module)
        case .name:
            return String(localized: "clients.sort.name", defaultValue: "Nombre", bundle: .module)
        case .totalEvents:
            return String(localized: "clients.sort.total_events", defaultValue: "Total eventos", bundle: .module)
        case .totalSpent:
            return String(localized: "clients.sort.total_spent", defaultValue: "Total gastado", bundle: .module)
        case .createdAt:
            return String(localized: "clients.sort.created_at", defaultValue: "Fecha de creación", bundle: .module)
        }
    }
}

// MARK: - Client List View Model

@MainActor
@Observable
public final class ClientListViewModel {

    // MARK: - Properties

    public var clients: [Client] = []
    public var filteredClients: [Client] = []
    public var searchText: String = "" {
        didSet { applyFilters() }
    }
    public var isLoading: Bool = false
    public var sortKey: ClientSortKey = .updatedAt {
        didSet { applyFilters() }
    }
    public var sortAscending: Bool = false {
        didSet { applyFilters() }
    }
    public var deleteTarget: Client?
    public var showDeleteConfirm: Bool = false
    public var errorMessage: String?
    
    // MARK: - Pagination

    public var currentPage: Int = 1
    public let pageSize: Int = 20
    public var totalPages: Int = 1
    public var totalItems: Int = 0
    public var isLoadingMore: Bool = false

    /// Whether there are more server pages to fetch.
    public var hasMorePages: Bool {
        currentPage < totalPages
    }

    /// Backward-compatible computed property. When using server-side pagination
    /// this returns the full `filteredClients` array (already paginated on server).
    public var paginatedClients: [Client] {
        filteredClients
    }

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

    // MARK: - Computed

    /// Checks whether the user has reached the plan client limit (basic = 15).
    public var isAtLimit: Bool {
        clients.count >= 15
    }

    /// Whether a search filter is active (skip server pagination).
    private var isFiltering: Bool {
        !searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    // MARK: - Data Loading

    @MainActor
    public func loadClients() async {
        isLoading = true
        errorMessage = nil

        // Show cached data immediately while fetching from network
        if clients.isEmpty, let cached = try? cacheManager?.getCachedClients(maxAge: cacheMaxAge), !cached.isEmpty {
            clients = cached
            isShowingCachedData = true
            applyFilters()
        }

        do {
            if isFiltering {
                // Fetch all clients for client-side search filtering.
                let result: [Client] = try await apiClient.getAll(Endpoint.clients)
                clients = result
                currentPage = 1
                totalPages = 1
                totalItems = result.count
            } else {
                let sortParam: String
                switch sortKey {
                case .updatedAt:   sortParam = "updated_at"
                case .name:        sortParam = "name"
                case .totalEvents: sortParam = "total_events"
                case .totalSpent:  sortParam = "total_spent"
                case .createdAt:   sortParam = "created_at"
                }
                let params: [String: String] = [
                    "page": "\(currentPage)",
                    "limit": "\(pageSize)",
                    "sort": sortParam,
                    "order": sortAscending ? "asc" : "desc"
                ]
                let paginated: PaginatedResponse<Client> = try await apiClient.getPaginated(Endpoint.clients, params: params)
                if currentPage == 1 {
                    clients = paginated.data
                } else {
                    clients.append(contentsOf: paginated.data)
                }
                totalPages = paginated.totalPages
                totalItems = paginated.total
            }
            isShowingCachedData = false
            applyFilters()

            // Update cache with fresh data
            try? cacheManager?.cacheClients(clients)
        } catch {
            // If we have no data at all, try cache as fallback
            if clients.isEmpty, let cached = try? cacheManager?.getCachedClients(maxAge: cacheMaxAge), !cached.isEmpty {
                clients = cached
                isShowingCachedData = true
                applyFilters()
            } else {
                errorMessage = mapError(error)
            }
        }

        isLoading = false
    }

    /// Load the next page of clients (for infinite scroll).
    @MainActor
    public func loadMore() async {
        guard !isLoadingMore, hasMorePages, !isFiltering else { return }
        isLoadingMore = true
        currentPage += 1

        do {
            let sortParam: String
            switch sortKey {
            case .updatedAt:   sortParam = "updated_at"
            case .name:        sortParam = "name"
            case .totalEvents: sortParam = "total_events"
            case .totalSpent:  sortParam = "total_spent"
            case .createdAt:   sortParam = "created_at"
            }
            let params: [String: String] = [
                "page": "\(currentPage)",
                "limit": "\(pageSize)",
                "sort": sortParam,
                "order": sortAscending ? "asc" : "desc"
            ]
            let paginated: PaginatedResponse<Client> = try await apiClient.getPaginated(Endpoint.clients, params: params)
            clients.append(contentsOf: paginated.data)
            totalPages = paginated.totalPages
            totalItems = paginated.total
            applyFilters()
        } catch {
            currentPage -= 1
            errorMessage = mapError(error)
        }
        isLoadingMore = false
    }

    /// Reset pagination and reload from page 1. Call when sort/filters change.
    @MainActor
    public func resetPagination() async {
        currentPage = 1
        totalPages = 1
        totalItems = 0
        clients = []
        await loadClients()
    }

    // MARK: - Delete

    @MainActor
    public func deleteClient(_ client: Client) async {
        do {
            try await apiClient.delete(Endpoint.client(client.id))
            clients.removeAll { $0.id == client.id }
            applyFilters()
        } catch {
            errorMessage = mapError(error)
        }
    }

    /// Remove the client from the local list immediately (for undo pattern).
    /// Returns the removed client and its index for restoration.
    @MainActor
    public func softDeleteClient(_ client: Client) -> (client: Client, index: Int)? {
        guard let index = clients.firstIndex(where: { $0.id == client.id }) else { return nil }
        let removed = clients.remove(at: index)
        applyFilters()
        return (removed, index)
    }

    /// Restore a previously soft-deleted client.
    @MainActor
    public func restoreClient(_ client: Client, at index: Int) {
        let safeIndex = min(index, clients.count)
        clients.insert(client, at: safeIndex)
        applyFilters()
    }

    /// Permanently delete a client via API (called after undo grace period).
    @MainActor
    public func confirmDeleteClient(_ client: Client) async {
        do {
            try await apiClient.delete(Endpoint.client(client.id))
        } catch {
            // Restore on failure
            clients.append(client)
            applyFilters()
            errorMessage = mapError(error)
        }
    }

    // MARK: - Filtering & Sorting

    public func applyFilters() {
        var result = clients

        // Filter by search text
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if !query.isEmpty {
            result = result.filter { client in
                client.name.lowercased().contains(query)
                || client.phone.lowercased().contains(query)
                || (client.email?.lowercased().contains(query) ?? false)
                || (client.city?.lowercased().contains(query) ?? false)
            }
        }

        // Sort
        result.sort { a, b in
            let ascending: Bool
            switch sortKey {
            case .updatedAt:
                ascending = a.updatedAt < b.updatedAt
            case .name:
                ascending = a.name.localizedCaseInsensitiveCompare(b.name) == .orderedAscending
            case .totalEvents:
                ascending = (a.totalEvents ?? 0) < (b.totalEvents ?? 0)
            case .totalSpent:
                ascending = (a.totalSpent ?? 0) < (b.totalSpent ?? 0)
            case .createdAt:
                ascending = a.createdAt < b.createdAt
            }
            return sortAscending ? ascending : !ascending
        }

        filteredClients = result
    }

    // MARK: - Error Mapping

    private func mapError(_ error: Error) -> String {
        if let apiError = error as? APIError {
            return apiError.errorDescription
                ?? String(localized: "clients.error.unexpected", defaultValue: "Ocurrió un error inesperado.", bundle: .module)
        }
        return String(localized: "clients.error.unexpected_retry", defaultValue: "Ocurrió un error inesperado. Intenta de nuevo.", bundle: .module)
    }
}
