import Foundation
import Observation
import SolennixCore
import SolennixNetwork

// MARK: - Inventory Form Request Body

private struct InventoryFormBody: Encodable {
    let ingredientName: String
    let type: String
    let currentStock: Double
    let minimumStock: Double
    let unit: String
    let unitCost: Double?

    enum CodingKeys: String, CodingKey {
        case ingredientName = "ingredient_name"
        case type
        case currentStock = "current_stock"
        case minimumStock = "minimum_stock"
        case unit
        case unitCost = "unit_cost"
    }
}

// MARK: - Inventory Form View Model

@Observable
public final class InventoryFormViewModel {

    // MARK: - Form State

    public var ingredientName: String = ""
    public var type: InventoryType = .ingredient
    public var currentStock: Double = 0
    public var minimumStock: Double = 0
    public var unit: String = "piezas"
    public var unitCost: Double?

    // MARK: - UI State

    public var isLoading: Bool = false
    public var isSaving: Bool = false
    public var errorMessage: String?

    // MARK: - Validation

    public var nameError: String?
    public var stockError: String?

    public var isValid: Bool {
        validateForm()
        return nameError == nil && stockError == nil
    }

    // MARK: - Unit Options

    public static let unitGroups: [(String, [String])] = [
        ("Peso", ["kg", "g", "oz", "lb"]),
        ("Volumen", ["L", "ml", "galon"]),
        ("Conteo", ["piezas", "unidades", "docenas", "porciones"])
    ]

    // MARK: - Mode

    public let itemId: String?
    public var isEditing: Bool { itemId != nil }

    // MARK: - Dependencies

    private let apiClient: APIClient

    // MARK: - Init

    public init(apiClient: APIClient, itemId: String? = nil) {
        self.apiClient = apiClient
        self.itemId = itemId
    }

    // MARK: - Load Data

    @MainActor
    public func loadData() async {
        guard let id = itemId else { return }

        isLoading = true
        errorMessage = nil

        do {
            let item: InventoryItem = try await apiClient.get(Endpoint.inventoryItem(id))
            populateForm(from: item)
        } catch {
            errorMessage = mapError(error)
        }

        isLoading = false
    }

    private func populateForm(from item: InventoryItem) {
        ingredientName = item.ingredientName
        type = item.type
        currentStock = item.currentStock
        minimumStock = item.minimumStock
        unit = item.unit
        unitCost = item.unitCost
    }

    // MARK: - Validation

    @discardableResult
    public func validateForm() -> Bool {
        nameError = nil
        stockError = nil

        if ingredientName.trimmingCharacters(in: .whitespacesAndNewlines).count < 2 {
            nameError = "El nombre debe tener al menos 2 caracteres"
        }

        if currentStock < 0 {
            stockError = "El stock no puede ser negativo"
        }

        if minimumStock < 0 {
            stockError = "El stock mínimo no puede ser negativo"
        }

        if let cost = unitCost, cost < 0 {
            stockError = "El costo unitario no puede ser negativo"
        }

        return nameError == nil && stockError == nil
    }

    // MARK: - Save

    @MainActor
    public func save() async -> Bool {
        guard validateForm() else { return false }

        isSaving = true
        errorMessage = nil

        do {
            let body = InventoryFormBody(
                ingredientName: ingredientName.trimmingCharacters(in: .whitespacesAndNewlines),
                type: type.rawValue,
                currentStock: currentStock,
                minimumStock: minimumStock,
                unit: unit,
                unitCost: unitCost
            )

            if isEditing, let id = itemId {
                let _: InventoryItem = try await apiClient.put(Endpoint.inventoryItem(id), body: body)
            } else {
                let _: InventoryItem = try await apiClient.post(Endpoint.inventory, body: body)
            }

            isSaving = false
            return true
        } catch {
            errorMessage = mapError(error)
            isSaving = false
            return false
        }
    }

    // MARK: - Error Mapping

    private func mapError(_ error: Error) -> String {
        if let apiError = error as? APIError {
            return apiError.errorDescription ?? "Ocurrio un error inesperado."
        }
        return "Ocurrio un error inesperado. Intenta de nuevo."
    }
}
