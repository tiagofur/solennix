import Foundation
import Observation
import SolennixCore
import SolennixNetwork

// MARK: - Sort Key

public enum ProductSortKey: String, CaseIterable {
    case name
    case basePrice
    case category

    public var label: String {
        switch self {
        case .name:      return ProductStrings.sortName
        case .basePrice: return ProductStrings.sortPrice
        case .category:  return ProductStrings.sortCategory
        }
    }
}

// MARK: - Product List View Model

@MainActor
@Observable
public final class ProductListViewModel {

    // MARK: - Properties

    public var products: [Product] = []
    public var filteredProducts: [Product] = []
    public var searchText: String = "" {
        didSet { applyFilters() }
    }
    public var selectedCategory: String? = nil {
        didSet { applyFilters() }
    }
    public var isLoading: Bool = false
    public var sortKey: ProductSortKey = .name {
        didSet { applyFilters() }
    }
    public var sortAscending: Bool = true {
        didSet { applyFilters() }
    }
    public var deleteTarget: Product?
    public var showDeleteConfirm: Bool = false
    public var errorMessage: String?

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

    /// Unique categories from all products
    public var categories: [String] {
        let cats = Set(products.map { $0.category }.filter { !$0.isEmpty })
        return Array(cats).sorted()
    }

    /// Check if basic plan limit reached (20 products)
    public var isAtLimit: Bool {
        products.count >= 20
    }

    /// Check if approaching limit (15+ products)
    public var isApproachingLimit: Bool {
        products.count >= 15 && products.count < 20
    }

    public var remainingProducts: Int {
        max(0, 20 - products.count)
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

    /// Whether a search/category filter is active (skip server pagination).
    private var isFiltering: Bool {
        !searchText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || selectedCategory != nil
    }

    // MARK: - Data Loading

    @MainActor
    public func loadProducts() async {
        isLoading = true
        errorMessage = nil

        // Show cached data immediately while fetching
        if products.isEmpty, let cached = try? cacheManager?.getCachedProducts(maxAge: cacheMaxAge), !cached.isEmpty {
            products = cached
            isShowingCachedData = true
            applyFilters()
        }

        do {
            if isFiltering {
                let result: [Product] = try await apiClient.getAll(Endpoint.products)
                products = result
                currentPage = 1
                totalPages = 1
                totalItems = result.count
            } else {
                let sortParam: String
                switch sortKey {
                case .name:      sortParam = "name"
                case .basePrice: sortParam = "base_price"
                case .category:  sortParam = "category"
                }
                let params: [String: String] = [
                    "page": "\(currentPage)",
                    "limit": "\(pageSize)",
                    "sort": sortParam,
                    "order": sortAscending ? "asc" : "desc"
                ]
                let paginated: PaginatedResponse<Product> = try await apiClient.getPaginated(Endpoint.products, params: params)
                if currentPage == 1 {
                    products = paginated.data
                } else {
                    products.append(contentsOf: paginated.data)
                }
                totalPages = paginated.totalPages
                totalItems = paginated.total
            }
            isShowingCachedData = false
            applyFilters()

            // Update cache with fresh data
            try? cacheManager?.cacheProducts(products)
        } catch {
            if products.isEmpty, let cached = try? cacheManager?.getCachedProducts(maxAge: cacheMaxAge), !cached.isEmpty {
                products = cached
                isShowingCachedData = true
                applyFilters()
            } else {
                errorMessage = mapError(error)
            }
        }

        isLoading = false
    }

    /// Load the next page of products (for infinite scroll).
    @MainActor
    public func loadNextPage() async {
        guard !isLoadingMore, hasMorePages, !isFiltering else { return }
        isLoadingMore = true
        currentPage += 1

        do {
            let sortParam: String
            switch sortKey {
            case .name:      sortParam = "name"
            case .basePrice: sortParam = "base_price"
            case .category:  sortParam = "category"
            }
            let params: [String: String] = [
                "page": "\(currentPage)",
                "limit": "\(pageSize)",
                "sort": sortParam,
                "order": sortAscending ? "asc" : "desc"
            ]
            let paginated: PaginatedResponse<Product> = try await apiClient.getPaginated(Endpoint.products, params: params)
            products.append(contentsOf: paginated.data)
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
        products = []
        await loadProducts()
    }

    // MARK: - Delete

    @MainActor
    public func deleteProduct(_ product: Product) async {
        do {
            try await apiClient.delete(Endpoint.product(product.id))
            products.removeAll { $0.id == product.id }
            applyFilters()
        } catch {
            errorMessage = mapError(error)
        }
    }

    /// Remove the product from the local list immediately (for undo pattern).
    @MainActor
    public func softDeleteProduct(_ product: Product) -> (product: Product, index: Int)? {
        guard let index = products.firstIndex(where: { $0.id == product.id }) else { return nil }
        let removed = products.remove(at: index)
        applyFilters()
        return (removed, index)
    }

    /// Restore a previously soft-deleted product.
    @MainActor
    public func restoreProduct(_ product: Product, at index: Int) {
        let safeIndex = min(index, products.count)
        products.insert(product, at: safeIndex)
        applyFilters()
    }

    /// Permanently delete a product via API (called after undo grace period).
    @MainActor
    public func confirmDeleteProduct(_ product: Product) async {
        do {
            try await apiClient.delete(Endpoint.product(product.id))
        } catch {
            products.append(product)
            applyFilters()
            errorMessage = mapError(error)
        }
    }

    // MARK: - Filtering & Sorting

    public func applyFilters() {
        var result = products

        // Filter by category
        if let category = selectedCategory {
            result = result.filter { $0.category == category }
        }

        // Filter by search text
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if !query.isEmpty {
            result = result.filter { product in
                product.name.lowercased().contains(query)
                || product.category.lowercased().contains(query)
            }
        }

        // Sort
        result.sort { a, b in
            let ascending: Bool
            switch sortKey {
            case .name:
                ascending = a.name.localizedCaseInsensitiveCompare(b.name) == .orderedAscending
            case .basePrice:
                ascending = a.basePrice < b.basePrice
            case .category:
                ascending = a.category.localizedCaseInsensitiveCompare(b.category) == .orderedAscending
            }
            return sortAscending ? ascending : !ascending
        }

        filteredProducts = result
    }

    // MARK: - Category Toggle

    public func toggleCategory(_ category: String) {
        if selectedCategory == category {
            selectedCategory = nil
        } else {
            selectedCategory = category
        }
    }

    // MARK: - Error Mapping

    private func mapError(_ error: Error) -> String {
        if let apiError = error as? APIError {
            return apiError.errorDescription ?? ProductStrings.unexpectedError
        }
        return ProductStrings.unexpectedRetryError
    }
}
