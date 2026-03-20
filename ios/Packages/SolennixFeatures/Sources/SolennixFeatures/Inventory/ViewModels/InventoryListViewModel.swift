import Foundation
import Observation
import SolennixCore
import SolennixNetwork

// MARK: - Sort Key

public enum InventorySortKey: String, CaseIterable {
    case name
    case currentStock
    case minimumStock
    case unitCost

    public var label: String {
        switch self {
        case .name:         return "Nombre"
        case .currentStock: return "Stock actual"
        case .minimumStock: return "Stock minimo"
        case .unitCost:     return "Costo unitario"
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
        didSet { applyFilters() }
    }
    public var sortAscending: Bool = true {
        didSet { applyFilters() }
    }
    public var deleteTarget: InventoryItem?
    public var showDeleteConfirm: Bool = false
    public var errorMessage: String?

    // Stock adjustment
    public var adjustmentTarget: InventoryItem?
    public var showStockAdjustment: Bool = false
    public var adjustmentQuantity: Double = 0

    // MARK: - Computed

    /// Items grouped by type
    public var ingredientItems: [InventoryItem] {
        filteredItems.filter { $0.type == .ingredient }
    }

    public var equipmentItems: [InventoryItem] {
        filteredItems.filter { $0.type == .equipment }
    }

    public var supplyItems: [InventoryItem] {
        filteredItems.filter { $0.type == .supply }
    }

    /// Count of low stock items
    public var lowStockCount: Int {
        items.filter { $0.currentStock < $0.minimumStock }.count
    }

    // MARK: - Dependencies

    private let apiClient: APIClient

    // MARK: - Init

    public init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    // MARK: - Data Loading

    @MainActor
    public func loadItems() async {
        isLoading = true
        errorMessage = nil

        do {
            let result: [InventoryItem] = try await apiClient.get(Endpoint.inventory)
            items = result
            applyFilters()
        } catch {
            errorMessage = mapError(error)
        }

        isLoading = false
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
            errorMessage = "El stock no puede ser negativo"
            return
        }

        do {
            let body = ["current_stock": adjustmentQuantity]
            let _: InventoryItem = try await apiClient.put(Endpoint.inventoryItem(item.id), body: body)

            // Update local state
            if let index = items.firstIndex(where: { $0.id == item.id }) {
                items[index] = InventoryItem(
                    id: item.id,
                    userId: item.userId,
                    ingredientName: item.ingredientName,
                    currentStock: adjustmentQuantity,
                    minimumStock: item.minimumStock,
                    unit: item.unit,
                    unitCost: item.unitCost,
                    lastUpdated: ISO8601DateFormatter().string(from: Date()),
                    type: item.type
                )
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
            result = result.filter { $0.currentStock < $0.minimumStock }
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
            return apiError.errorDescription ?? "Ocurrio un error inesperado."
        }
        return "Ocurrio un error inesperado. Intenta de nuevo."
    }
}
