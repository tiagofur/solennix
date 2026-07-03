import Foundation
import Observation
import SolennixCore
import SolennixNetwork

// MARK: - Inventory Scope

/// Server-side type filter for the inventory list.
public enum InventoryScope: CaseIterable, Hashable {
    case all
    case ingredient
    case equipment
    case supply

    /// Query parameter value sent to `GET /api/inventory?type=`.
    /// `nil` means no `type` param is sent (returns all types).
    public var typeParam: String? {
        switch self {
        case .all:        return nil
        case .ingredient: return "ingredient"
        case .equipment:  return "equipment"
        case .supply:     return "supply"
        }
    }

    public var label: String {
        switch self {
        case .all:        return InventoryStrings.scopeAll
        case .ingredient: return InventoryStrings.scopeIngredient
        case .equipment:  return InventoryStrings.scopeEquipment
        case .supply:     return InventoryStrings.scopeSupply
        }
    }
}

// MARK: - Sort Key

public enum InventorySortKey: String, CaseIterable {
    case name
    case currentStock
    case minimumStock
    case unitCost

    public var label: String {
        switch self {
        case .name:         return InventoryStrings.sortName
        case .currentStock: return InventoryStrings.sortCurrentStock
        case .minimumStock: return InventoryStrings.sortMinimumStock
        case .unitCost:     return InventoryStrings.sortUnitCost
        }
    }
}

// MARK: - Inventory List View Model

@Observable
public final class InventoryListViewModel {

    // MARK: - Properties

    public var items: [InventoryItem] = []
    public var filteredItems: [InventoryItem] = []
    public var searchText: String = "" {
        didSet { applyFilters() }
    }
    public var showLowStockOnly: Bool = false {
        didSet { applyFilters() }
    }
    public var isLoading: Bool = false
    public var sortKey: InventorySortKey = .name {
        didSet {
            // R2: cancel any in-flight sort reload before spawning a new one to prevent races
            sortReloadTask?.cancel()
            currentPage = 1
            sortReloadTask = Task { await loadItems() }
        }
    }
    public var sortAscending: Bool = true {
        didSet {
            // R2: cancel any in-flight sort reload before spawning a new one to prevent races
            sortReloadTask?.cancel()
            currentPage = 1
            sortReloadTask = Task { await loadItems() }
        }
    }
    public var scope: InventoryScope = .all {
        didSet {
            guard scope != oldValue else { return }
            sortReloadTask?.cancel()
            currentPage = 1
            sortReloadTask = Task {
                guard !Task.isCancelled else { return }
                await loadItems()
            }
        }
    }
    public var deleteTarget: InventoryItem?
    public var showDeleteConfirm: Bool = false
    public var errorMessage: String?

    // Stock adjustment
    public var adjustmentTarget: InventoryItem?
    public var showStockAdjustment: Bool = false
    public var adjustmentQuantity: Double = 0

    // MARK: - Pagination

    public var currentPage: Int = 1
    public var totalPages: Int = 1
    public var totalItems: Int = 0
    public var isLoadingMore: Bool = false
    private let pageSize: Int = 20

    /// Whether there are more server pages to fetch.
    public var hasMorePages: Bool {
        currentPage < totalPages
    }

    // MARK: - Computed

    /// Scoped empty-state title: shown when filteredItems is empty and no search/low-stock filter is active.
    public var scopedEmptyTitle: String {
        switch scope {
        case .all:        return InventoryStrings.emptyTitle
        case .ingredient: return InventoryStrings.scopeEmptyIngredient
        case .equipment:  return InventoryStrings.scopeEmptyEquipment
        case .supply:     return InventoryStrings.scopeEmptySupply
        }
    }

    /// Scoped empty-state message: shown alongside scopedEmptyTitle.
    public var scopedEmptyMessage: String {
        switch scope {
        case .all:        return InventoryStrings.emptyMessage
        case .ingredient: return InventoryStrings.scopeEmptyIngredientMessage
        case .equipment:  return InventoryStrings.scopeEmptyEquipmentMessage
        case .supply:     return InventoryStrings.scopeEmptySupplyMessage
        }
    }

    /// Count of low stock items
    public var lowStockCount: Int {
        items.filter { $0.minimumStock > 0 && $0.currentStock < $0.minimumStock }.count
    }

    /// Whether the current data was loaded from cache (not fresh from API).
    public var isShowingCachedData: Bool = false

    // MARK: - Dependencies

    private let apiClient: APIClient
    private var cacheManager: CacheManager?
    private let cacheMaxAge: TimeInterval = 30 * 60
    /// Tracks the most recent sort-triggered reload task so rapid sort changes cancel the previous one.
    private var sortReloadTask: Task<Void, Never>?

    // MARK: - Init

    public init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    /// Set the cache manager for offline support.
    public func setCacheManager(_ manager: CacheManager?) {
        self.cacheManager = manager
    }

    /// Whether a client-side search/filter is active.
    /// When true, we fetch all items (no pagination) so client filters can run over the full set.
    /// Note: `scope` is server-side and does NOT disable pagination.
    private var isFiltering: Bool {
        !searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || showLowStockOnly
    }

    // MARK: - Data Loading

    @MainActor
    public func loadItems() async {
        isLoading = true
        errorMessage = nil
        // Fix 5a: full reload always restarts pagination — without this, pull-to-refresh
        // after paginating re-fetches the CURRENT page and appends duplicates.
        currentPage = 1

        // Show cached data immediately while fetching
        if items.isEmpty, let cached = try? cacheManager?.getCachedInventoryItems(maxAge: cacheMaxAge), !cached.isEmpty {
            items = cached
            isShowingCachedData = true
            applyFilters()
        }

        do {
            if isFiltering {
                var allParams: [String: String] = [:]
                if let typeValue = scope.typeParam {
                    allParams["type"] = typeValue
                }
                let result: [InventoryItem] = try await apiClient.getAll(Endpoint.inventory, params: allParams.isEmpty ? nil : allParams)
                guard !Task.isCancelled else { isLoading = false; return }
                items = result
                currentPage = 1
                totalPages = 1
                totalItems = result.count
            } else {
                let sortParam: String
                switch sortKey {
                case .name:         sortParam = "ingredient_name"
                case .currentStock: sortParam = "current_stock"
                case .minimumStock: sortParam = "minimum_stock"
                case .unitCost:     sortParam = "unit_cost"
                }
                var params: [String: String] = [
                    "page": "\(currentPage)",
                    "limit": "\(pageSize)",
                    "sort": sortParam,
                    "order": sortAscending ? "asc" : "desc"
                ]
                if let typeValue = scope.typeParam {
                    params["type"] = typeValue
                }
                let paginated: PaginatedResponse<InventoryItem> = try await apiClient.getPaginated(Endpoint.inventory, params: params)
                guard !Task.isCancelled else { isLoading = false; return }
                if currentPage == 1 {
                    items = paginated.data
                } else {
                    items.append(contentsOf: paginated.data)
                }
                totalPages = paginated.totalPages
                totalItems = paginated.total
            }
            isShowingCachedData = false
            applyFilters()

            // Update cache with fresh data
            try? cacheManager?.cacheInventoryItems(items)
        } catch {
            if items.isEmpty, let cached = try? cacheManager?.getCachedInventoryItems(maxAge: cacheMaxAge), !cached.isEmpty {
                items = cached
                isShowingCachedData = true
                applyFilters()
            } else {
                errorMessage = mapError(error)
            }
        }

        isLoading = false
    }

    /// Load the next page of inventory items (for infinite scroll).
    @MainActor
    public func loadNextPage() async {
        guard !isLoadingMore, hasMorePages, !isFiltering else { return }
        isLoadingMore = true
        currentPage += 1
        let requestScope = scope

        do {
            let sortParam: String
            switch sortKey {
            case .name:         sortParam = "ingredient_name"
            case .currentStock: sortParam = "current_stock"
            case .minimumStock: sortParam = "minimum_stock"
            case .unitCost:     sortParam = "unit_cost"
            }
            var params: [String: String] = [
                "page": "\(currentPage)",
                "limit": "\(pageSize)",
                "sort": sortParam,
                "order": sortAscending ? "asc" : "desc"
            ]
            if let typeValue = scope.typeParam {
                params["type"] = typeValue
            }
            let paginated: PaginatedResponse<InventoryItem> = try await apiClient.getPaginated(Endpoint.inventory, params: params)
            // Scope may have changed while this page was in flight — appending
            // would mix the previous scope's results into the new scope's list.
            // The scope didSet already reset currentPage, so don't decrement here.
            guard scope == requestScope else {
                isLoadingMore = false
                return
            }
            if Task.isCancelled {
                currentPage -= 1
                isLoadingMore = false
                return
            }
            items.append(contentsOf: paginated.data)
            totalPages = paginated.totalPages
            totalItems = paginated.total
            applyFilters()
        } catch {
            currentPage -= 1
            errorMessage = mapError(error)
        }
        isLoadingMore = false
    }

    /// Reset pagination and reload from page 1.
    @MainActor
    public func resetPagination() async {
        currentPage = 1
        totalPages = 1
        totalItems = 0
        items = []
        await loadItems()
    }

    // MARK: - Delete

    @MainActor
    public func deleteItem(_ item: InventoryItem) async {
        do {
            try await apiClient.delete(Endpoint.inventoryItem(item.id))
            items.removeAll { $0.id == item.id }
            applyFilters()
        } catch {
            errorMessage = mapError(error)
        }
    }

    /// Remove the item from the local list immediately (for undo pattern).
    @MainActor
    public func softDeleteItem(_ item: InventoryItem) -> (item: InventoryItem, index: Int)? {
        guard let index = items.firstIndex(where: { $0.id == item.id }) else { return nil }
        let removed = items.remove(at: index)
        applyFilters()
        return (removed, index)
    }

    /// Restore a previously soft-deleted item.
    @MainActor
    public func restoreItem(_ item: InventoryItem, at index: Int) {
        let safeIndex = min(index, items.count)
        items.insert(item, at: safeIndex)
        applyFilters()
    }

    /// Permanently delete an item via API (called after undo grace period).
    @MainActor
    public func confirmDeleteItem(_ item: InventoryItem) async {
        errorMessage = nil
        do {
            try await apiClient.delete(Endpoint.inventoryItem(item.id))
        } catch {
            items.append(item)
            applyFilters()
            errorMessage = mapError(error)
        }
    }

    // MARK: - Stock Adjustment

    public func prepareAdjustment(for item: InventoryItem) {
        adjustmentTarget = item
        adjustmentQuantity = item.currentStock
        showStockAdjustment = true
    }

    @MainActor
    public func saveStockAdjustment() async {
        guard let item = adjustmentTarget else { return }

        // Validate non-negative stock
        guard adjustmentQuantity >= 0 else {
            errorMessage = InventoryStrings.validationStockNegative
            return
        }

        do {
            let body = InventoryItem(
                id: item.id,
                userId: item.userId,
                ingredientName: item.ingredientName,
                currentStock: max(0, adjustmentQuantity),
                minimumStock: item.minimumStock,
                unit: item.unit,
                unitCost: item.unitCost,
                lastUpdated: item.lastUpdated,
                type: item.type
            )
            let result: InventoryItem = try await apiClient.put(Endpoint.inventoryItem(item.id), body: body)

            // Update local state
            if let index = items.firstIndex(where: { $0.id == item.id }) {
                items[index] = result
            }
            applyFilters()
            showStockAdjustment = false
            adjustmentTarget = nil
            adjustmentQuantity = 0
        } catch {
            errorMessage = mapError(error)
        }
    }

    // MARK: - Filtering & Sorting

    public func applyFilters() {
        var result = items

        // Filter by low stock
        if showLowStockOnly {
            result = result.filter { $0.minimumStock > 0 && $0.currentStock < $0.minimumStock }
        }

        // Filter by search text
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if !query.isEmpty {
            result = result.filter { item in
                item.ingredientName.lowercased().contains(query)
            }
        }

        // Sort
        result.sort { a, b in
            let ascending: Bool
            switch sortKey {
            case .name:
                ascending = a.ingredientName.localizedCaseInsensitiveCompare(b.ingredientName) == .orderedAscending
            case .currentStock:
                ascending = a.currentStock < b.currentStock
            case .minimumStock:
                ascending = a.minimumStock < b.minimumStock
            case .unitCost:
                ascending = (a.unitCost ?? 0) < (b.unitCost ?? 0)
            }
            return sortAscending ? ascending : !ascending
        }

        filteredItems = result
    }

    // MARK: - Error Mapping

    private func mapError(_ error: Error) -> String {
        if let apiError = error as? APIError {
            return apiError.errorDescription ?? InventoryStrings.unexpectedError
        }
        return InventoryStrings.unexpectedRetryError
    }
}
