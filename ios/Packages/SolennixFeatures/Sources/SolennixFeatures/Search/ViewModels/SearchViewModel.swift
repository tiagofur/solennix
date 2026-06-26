import Foundation
import Observation
import SolennixCore
import SolennixNetwork

// MARK: - Search Result Item

public struct SearchResultItem: Identifiable, Hashable {
    public let id: String
    public let type: String
    public let title: String
    public var subtitle: String?
    public var meta: String?
    public var status: String?

    public init(id: String, type: String, title: String, subtitle: String? = nil, meta: String? = nil, status: String? = nil) {
        self.id = id
        self.type = type
        self.title = title
        self.subtitle = subtitle
        self.meta = meta
        self.status = status
    }
}

// MARK: - Search Results

public struct SearchResults {
    public var clients: [SearchResultItem] = []
    public var events: [SearchResultItem] = []
    public var products: [SearchResultItem] = []
    public var inventory: [SearchResultItem] = []

    public var totalCount: Int {
        clients.count + events.count + products.count + inventory.count
    }

    public var isEmpty: Bool {
        totalCount == 0
    }
}

// MARK: - Search Scope

/// Entity-type scope for the bottom-nav search tab (spec R5: "A `.searchScope`
/// control (all, clients, events, products, inventory) MUST narrow results to
/// the selected scope"). The filter is CLIENT-SIDE — it narrows the already-
/// grouped `SearchResults` returned by `GET /api/search?q=` and MUST NOT
/// re-query the backend (design Decision 5).
public enum SearchScope: String, CaseIterable, Hashable {
    case all
    case clients
    case events
    case products
    case inventory

    /// Localized title for the scope-bar entry (spec R5). Reuses the existing
    /// per-entity result strings; only `.all` has a dedicated key.
    public var title: String {
        switch self {
        case .all:       return SearchStrings.scopeAll
        case .clients:   return SearchStrings.resultsClients
        case .events:    return SearchStrings.resultsEvents
        case .products:  return SearchStrings.resultsProducts
        case .inventory: return SearchStrings.resultsInventory
        }
    }
}

// MARK: - Search Response Models

/// Raw search response from the API.
private struct SearchResponse: Decodable {
    let clients: [Client]?
    let events: [Event]?
    let products: [ProductResult]?
    let inventory: [InventoryItem]?
}

private struct ProductResult: Decodable {
    let id: String
    let name: String
    let category: String?
    let basePrice: Double?
}

// MARK: - Search View Model

@Observable
public final class SearchViewModel {

    // MARK: - Properties

    public var query: String = ""
    public var results: SearchResults?
    public var isLoading: Bool = false
    public var hasSearched: Bool = false
    public var recentQueries: [String] = []

    // MARK: - Dependencies

    private let apiClient: APIClient
    private var searchTask: Task<Void, Never>?
    private let recentQueriesKey = "solennix.search.recentQueries"
    private let maxRecentQueries = 6

    // MARK: - Init

    public init(apiClient: APIClient) {
        self.apiClient = apiClient
        self.recentQueries = UserDefaults.standard.stringArray(forKey: recentQueriesKey) ?? []
    }

    // MARK: - Computed

    public var totalResults: Int {
        results?.totalCount ?? 0
    }

    public var isEmpty: Bool {
        results?.isEmpty ?? true
    }

    public var querySuggestions: [String] {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty {
            return recentQueries
        }
        return recentQueries.filter { $0.localizedCaseInsensitiveContains(trimmed) }
    }

    /// Returns the current results narrowed to `scope`. Client-side filter on
    /// the already-grouped `SearchResults` arrays — NO backend re-query (design
    /// Decision 5). `.all` returns the full grouped results as-is; a single-
    /// entity scope returns a `SearchResults` with only that group populated.
    /// Returns `nil` when there are no results yet (preserves the "no search
    /// performed" state so the empty-query blank surface stays blank).
    public func filteredResults(for scope: SearchScope) -> SearchResults? {
        guard let results else { return nil }
        switch scope {
        case .all:
            return results
        case .clients:
            var narrowed = SearchResults()
            narrowed.clients = results.clients
            return narrowed
        case .events:
            var narrowed = SearchResults()
            narrowed.events = results.events
            return narrowed
        case .products:
            var narrowed = SearchResults()
            narrowed.products = results.products
            return narrowed
        case .inventory:
            var narrowed = SearchResults()
            narrowed.inventory = results.inventory
            return narrowed
        }
    }

    // MARK: - Search

    @MainActor
    public func search() async {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.count >= 2 else {
            results = nil
            hasSearched = false
            return
        }

        // Cancel previous search
        searchTask?.cancel()

        searchTask = Task {
            // Debounce 350ms
            try? await Task.sleep(nanoseconds: 350_000_000)
            guard !Task.isCancelled else { return }

            isLoading = true

            do {
                let response: SearchResponse = try await apiClient.get(
                    Endpoint.search,
                    params: ["q": trimmed]
                )

                guard !Task.isCancelled else { return }

                var searchResults = SearchResults()

                // Map clients
                if let clients = response.clients {
                    searchResults.clients = clients.map { client in
                        SearchResultItem(
                            id: client.id,
                            type: "client",
                            title: client.name,
                            subtitle: client.phone,
                            meta: client.city
                        )
                    }
                }

                // Map events
                if let events = response.events {
                    searchResults.events = events.map { event in
                        SearchResultItem(
                            id: event.id,
                            type: "event",
                            title: event.serviceType,
                            subtitle: formatEventDate(event.eventDate),
                            meta: "\(event.numPeople) personas",
                            status: event.status.rawValue
                        )
                    }
                }

                // Map products
                if let products = response.products {
                    searchResults.products = products.map { product in
                        SearchResultItem(
                            id: product.id,
                            type: "product",
                            title: product.name,
                            subtitle: product.category,
                            meta: product.basePrice.map { formatCurrency($0) }
                        )
                    }
                }

                // Map inventory
                if let inventory = response.inventory {
                    searchResults.inventory = inventory.map { item in
                        SearchResultItem(
                            id: item.id,
                            type: "inventory",
                            title: item.ingredientName,
                            subtitle: "\(Int(item.currentStock)) \(item.unit)",
                            meta: item.type.rawValue.capitalized
                        )
                    }
                }

                results = searchResults
                hasSearched = true
                saveRecentQuery(trimmed)
            } catch {
                guard !Task.isCancelled else { return }
                results = SearchResults()
                hasSearched = true
            }

            isLoading = false
        }

        await searchTask?.value
    }

    // MARK: - Clear

    public func clearSearch() {
        searchTask?.cancel()
        query = ""
        results = nil
        hasSearched = false
        isLoading = false
    }

    public func clearRecentQueries() {
        recentQueries = []
        UserDefaults.standard.removeObject(forKey: recentQueriesKey)
    }

    public func applySuggestion(_ suggestion: String) {
        query = suggestion
    }

    // MARK: - Helpers

    private func formatEventDate(_ dateString: String) -> String {
        // Parse in UTC (fromServerDay), display in UTC — avoids day shift west of UTC.
        guard let date = Date.fromServerDay(dateString) else { return dateString }
        return date.formattedServerDay(style: "d MMM yyyy", locale: Locale(identifier: "es_MX"))
    }

    private func formatCurrency(_ value: Double) -> String {
        value.asMXN
    }

    private func saveRecentQuery(_ query: String) {
        let normalized = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard normalized.count >= 2 else { return }

        recentQueries.removeAll { $0.caseInsensitiveCompare(normalized) == .orderedSame }
        recentQueries.insert(normalized, at: 0)
        if recentQueries.count > maxRecentQueries {
            recentQueries = Array(recentQueries.prefix(maxRecentQueries))
        }
        UserDefaults.standard.set(recentQueries, forKey: recentQueriesKey)
    }
}
