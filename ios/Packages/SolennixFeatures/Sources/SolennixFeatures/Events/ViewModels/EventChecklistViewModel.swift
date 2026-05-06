import Foundation
import Observation
import SolennixCore
import SolennixNetwork

// MARK: - Checklist Section

public enum ChecklistSection: String, Sendable, Hashable {
    case equipment
    case stock
    case purchase
}

// MARK: - Checklist Item

public struct ChecklistItem: Identifiable, Sendable, Hashable {
    public let id: String
    public let name: String
    public let quantity: Double
    public let unit: String?
    public let section: ChecklistSection
}

// MARK: - Event Checklist View Model

@MainActor
@Observable
public final class EventChecklistViewModel {

    // MARK: - Properties

    public var items: [ChecklistItem] = []
    public var checkedIds: Set<String> = []
    public var isLoading: Bool = false
    public var errorMessage: String?

    private var eventId: String = ""

    // MARK: - Dependencies

    private let apiClient: APIClient

    // MARK: - Init

    public init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    // MARK: - Computed

    public var progress: Double {
        guard !items.isEmpty else { return 0 }
        return Double(checkedIds.count) / Double(items.count)
    }

    public var equipmentItems: [ChecklistItem] {
        items.filter { $0.section == .equipment }
    }

    public var stockItems: [ChecklistItem] {
        items.filter { $0.section == .stock }
    }

    public var purchaseItems: [ChecklistItem] {
        items.filter { $0.section == .purchase }
    }

    // MARK: - Load Checklist

    @MainActor
    public func loadChecklist(eventId: String) async {
        self.eventId = eventId
        isLoading = true
        errorMessage = nil

        do {
            // Fetch event products, equipment, and supplies concurrently
            async let productsResult: [EventProduct] = apiClient.get(Endpoint.eventProducts(eventId))
            async let equipmentResult: [EventEquipment] = apiClient.get(Endpoint.eventEquipment(eventId))
            async let suppliesResult: [EventSupply] = apiClient.get(Endpoint.eventSupplies(eventId))

            let products = try await productsResult
            let equipment = try await equipmentResult
            let supplies = try await suppliesResult

            var checklistItems: [ChecklistItem] = []

            // Equipment items
            for item in equipment {
                checklistItems.append(ChecklistItem(
                    id: "eq_\(item.id)",
                    name: item.equipmentName ?? "Equipo",
                    quantity: Double(item.quantity),
                    unit: item.unit,
                    section: .equipment
                ))
            }

            // Fetch product ingredients for aggregation
            var ingredientMap: [String: (name: String, quantity: Double, unit: String?)] = [:]

            for product in products {
                do {
                    let ingredients: [ProductIngredient] = try await apiClient.get(
                        Endpoint.productIngredients(product.productId)
                    )

                    for ingredient in ingredients {
                        guard ingredient.bringToEvent == true else { continue }
                        let key = ingredient.inventoryId
                        let totalQty = ingredient.quantityRequired * Double(product.quantity)

                        if var existing = ingredientMap[key] {
                            existing.quantity += totalQty
                            ingredientMap[key] = existing
                        } else {
                            ingredientMap[key] = (
                                name: ingredient.ingredientName ?? "Ingrediente",
                                quantity: totalQty,
                                unit: ingredient.unit
                            )
                        }
                    }
                } catch {
                    // Skip products whose ingredients can't be fetched
                }
            }

            // Add aggregated ingredients as stock items
            for (inventoryId, info) in ingredientMap {
                checklistItems.append(ChecklistItem(
                    id: "ing_\(inventoryId)",
                    name: info.name,
                    quantity: info.quantity,
                    unit: info.unit,
                    section: .stock
                ))
            }

            // Supply items
            for supply in supplies {
                let section: ChecklistSection = supply.source == .stock ? .stock : .purchase
                checklistItems.append(ChecklistItem(
                    id: "sup_\(supply.id)",
                    name: supply.supplyName ?? "Insumo",
                    quantity: supply.quantity,
                    unit: supply.unit,
                    section: section
                ))
            }

            items = checklistItems

            // Load checked state from UserDefaults
            loadCheckedState()
        } catch {
            if let apiError = error as? APIError {
                errorMessage = apiError.errorDescription ?? "Error cargando el checklist"
            } else {
                errorMessage = "Error cargando el checklist"
            }
        }

        isLoading = false
    }

    // MARK: - Toggle Item

    public func toggleItem(id: String) {
        if checkedIds.contains(id) {
            checkedIds.remove(id)
        } else {
            checkedIds.insert(id)
        }
        saveCheckedState()
    }

    // MARK: - Persistence

    private func loadCheckedState() {
        let key = "event_checklist_\(eventId)"
        if let saved = UserDefaults.standard.array(forKey: key) as? [String] {
            checkedIds = Set(saved)
        } else {
            checkedIds = []
        }
    }

    private func saveCheckedState() {
        let key = "event_checklist_\(eventId)"
        UserDefaults.standard.set(Array(checkedIds), forKey: key)
    }
}
