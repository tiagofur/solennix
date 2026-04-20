import Foundation
import Observation
import PhotosUI
import SwiftUI
import SolennixCore
import SolennixNetwork

// MARK: - Product Form Request Bodies

private struct ProductBody: Encodable {
    let name: String
    let category: String
    let basePrice: Double
    let isActive: Bool
    let imageUrl: String?
    let staffTeamId: String?
}

private struct RecipeIngredientBody: Encodable {
    let inventoryId: String
    let quantityRequired: Double
}

private struct RecipeIngredientsWrapper: Encodable {
    let ingredients: [RecipeIngredientBody]
}

private struct StatusResponse: Decodable {
    let status: String
}

// MARK: - Recipe Item

public struct RecipeItem: Identifiable, Hashable {
    public let id: String
    public var inventoryId: String
    public var quantityRequired: Double
    public var inventoryName: String?
    public var unit: String?
    public var type: InventoryType

    public init(
        id: String = UUID().uuidString,
        inventoryId: String = "",
        quantityRequired: Double = 1,
        inventoryName: String? = nil,
        unit: String? = nil,
        type: InventoryType = .ingredient
    ) {
        self.id = id
        self.inventoryId = inventoryId
        self.quantityRequired = quantityRequired
        self.inventoryName = inventoryName
        self.unit = unit
        self.type = type
    }
}

// MARK: - Product Form View Model

@Observable
public final class ProductFormViewModel {

    // MARK: - Form State

    public var name: String = ""
    public var category: String = ""
    public var basePrice: Double = 0
    public var isActive: Bool = true
    public var imageUrl: String?
    public var selectedPhoto: PhotosPickerItem?
    public var localImageData: Data?

    // MARK: - Staff Team (Ola 3)

    /// Team opcional que se expande en staff al agregar el producto a un evento.
    public var staffTeamId: String?
    public var availableStaffTeams: [StaffTeam] = []

    // MARK: - Recipe

    public var ingredients: [RecipeItem] = []
    public var equipment: [RecipeItem] = []
    public var supplies: [RecipeItem] = []

    // MARK: - Inventory Items (for pickers)

    public var inventoryItems: [InventoryItem] = []

    public var ingredientInventoryItems: [InventoryItem] {
        inventoryItems.filter { $0.type == .ingredient }
    }

    public var equipmentInventoryItems: [InventoryItem] {
        inventoryItems.filter { $0.type == .equipment }
    }

    public var supplyInventoryItems: [InventoryItem] {
        inventoryItems.filter { $0.type == .supply }
    }

    // MARK: - Categories

    public var existingCategories: [String] = []
    public var showCategoryPicker: Bool = false
    public var customCategory: String = ""

    // MARK: - UI State

    public var isLoading: Bool = false
    public var isSaving: Bool = false
    public var errorMessage: String?

    // MARK: - Validation

    public var nameError: String?
    public var categoryError: String?

    public var isValid: Bool {
        validateForm()
        return nameError == nil && categoryError == nil
    }

    // MARK: - Mode

    public let productId: String?
    public var isEditing: Bool { productId != nil }

    // MARK: - Dependencies

    private let apiClient: APIClient

    // MARK: - Init

    public init(apiClient: APIClient, productId: String? = nil) {
        self.apiClient = apiClient
        self.productId = productId
    }

    // MARK: - Load Data

    @MainActor
    public func loadData() async {
        isLoading = true
        errorMessage = nil

        do {
            // Load inventory (non-blocking: if it fails, continue with empty list)
            do {
                let inventory: [InventoryItem] = try await apiClient.getAll(Endpoint.inventory)
                inventoryItems = inventory
            } catch {
                // Inventory sync failed (e.g. expired token), continue with empty list
                inventoryItems = []
            }

            // Load existing products for categories
            let products: [Product] = try await apiClient.getAll(Endpoint.products)

            // Extract unique categories
            let cats = Set(products.map { $0.category }.filter { !$0.isEmpty })
            existingCategories = Array(cats).sorted()

            // Load staff teams (non-blocking: fallback to empty list)
            do {
                availableStaffTeams = try await apiClient.listStaffTeams()
            } catch {
                availableStaffTeams = []
            }

            // If editing, load product data
            if let id = productId {
                let product: Product = try await apiClient.get(Endpoint.product(id))
                populateForm(from: product)

                // Load product ingredients
                let productIngredients: [ProductIngredient] = try await apiClient.get(Endpoint.productIngredients(id))
                populateRecipe(from: productIngredients)
            }
        } catch {
            errorMessage = mapError(error)
        }

        isLoading = false
    }

    private func populateForm(from product: Product) {
        name = product.name
        category = product.category
        basePrice = product.basePrice
        isActive = product.isActive
        imageUrl = product.imageUrl
        staffTeamId = product.staffTeamId
    }

    private func populateRecipe(from productIngredients: [ProductIngredient]) {
        ingredients = []
        equipment = []
        supplies = []

        for pi in productIngredients {
            let item = RecipeItem(
                id: pi.id,
                inventoryId: pi.inventoryId,
                quantityRequired: pi.quantityRequired,
                inventoryName: pi.ingredientName,
                unit: pi.unit,
                type: pi.type ?? .ingredient
            )

            switch item.type {
            case .ingredient:
                ingredients.append(item)
            case .equipment:
                equipment.append(item)
            case .supply:
                supplies.append(item)
            }
        }
    }

    // MARK: - Validation

    @discardableResult
    public func validateForm() -> Bool {
        nameError = nil
        categoryError = nil

        if name.trimmingCharacters(in: .whitespacesAndNewlines).count < 2 {
            nameError = "El nombre debe tener al menos 2 caracteres"
        }

        if category.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            categoryError = "La categoria es requerida"
        }

        return nameError == nil && categoryError == nil
    }

    // MARK: - Recipe Management

    public func addIngredient() {
        ingredients.append(RecipeItem(type: .ingredient))
    }

    public func addEquipment() {
        equipment.append(RecipeItem(type: .equipment))
    }

    public func addSupply() {
        supplies.append(RecipeItem(type: .supply))
    }

    public func removeIngredient(at index: Int) {
        guard index < ingredients.count else { return }
        ingredients.remove(at: index)
    }

    public func removeEquipment(at index: Int) {
        guard index < equipment.count else { return }
        equipment.remove(at: index)
    }

    public func removeSupply(at index: Int) {
        guard index < supplies.count else { return }
        supplies.remove(at: index)
    }

    public func updateIngredient(at index: Int, inventoryId: String) {
        guard index < ingredients.count else { return }
        ingredients[index].inventoryId = inventoryId
        if let inv = inventoryItems.first(where: { $0.id == inventoryId }) {
            ingredients[index].inventoryName = inv.ingredientName
            ingredients[index].unit = inv.unit
        }
    }

    public func updateEquipment(at index: Int, inventoryId: String) {
        guard index < equipment.count else { return }
        equipment[index].inventoryId = inventoryId
        if let inv = inventoryItems.first(where: { $0.id == inventoryId }) {
            equipment[index].inventoryName = inv.ingredientName
            equipment[index].unit = inv.unit
        }
    }

    public func updateSupply(at index: Int, inventoryId: String) {
        guard index < supplies.count else { return }
        supplies[index].inventoryId = inventoryId
        if let inv = inventoryItems.first(where: { $0.id == inventoryId }) {
            supplies[index].inventoryName = inv.ingredientName
            supplies[index].unit = inv.unit
        }
    }

    // MARK: - Category Selection

    public func selectCategory(_ cat: String) {
        category = cat
        showCategoryPicker = false
    }

    public func selectCustomCategory() {
        let trimmed = customCategory.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmed.isEmpty {
            category = trimmed
            customCategory = ""
            showCategoryPicker = false
        }
    }

    // MARK: - Photo Handling

    @MainActor
    public func handlePhotoSelection() async {
        guard let item = selectedPhoto else { return }

        do {
            if let data = try await item.loadTransferable(type: Data.self) {
                localImageData = data
            }
        } catch {
            errorMessage = "Error al cargar la imagen"
        }

        // Clear selection to allow re-selecting the same photo
        selectedPhoto = nil
    }

    // MARK: - Save

    @MainActor
    public func save() async -> Bool {
        guard validateForm() else { return false }

        isSaving = true
        errorMessage = nil

        do {
            // Upload image if new local image selected
            var finalImageUrl = imageUrl
            if let imageData = localImageData {
                let uploadResult = try await apiClient.upload(
                    Endpoint.uploadImage,
                    data: imageData,
                    filename: "product.jpg"
                )
                finalImageUrl = uploadResult.url
            }

            // Prepare product data
            let productData = ProductBody(
                name: name.trimmingCharacters(in: .whitespacesAndNewlines),
                category: category.trimmingCharacters(in: .whitespacesAndNewlines),
                basePrice: basePrice,
                isActive: isActive,
                imageUrl: finalImageUrl,
                staffTeamId: staffTeamId
            )

            // Prepare recipe data
            let allRecipeItems = ingredients + equipment + supplies
            let validRecipeItems = allRecipeItems.filter { !$0.inventoryId.isEmpty }
            let recipeData = validRecipeItems.map { item in
                RecipeIngredientBody(
                    inventoryId: item.inventoryId,
                    quantityRequired: item.quantityRequired
                )
            }

            if isEditing, let id = productId {
                // Update existing product
                let _: Product = try await apiClient.put(Endpoint.product(id), body: productData)

                // Update recipe
                let recipeBody = RecipeIngredientsWrapper(ingredients: recipeData)
                let _: StatusResponse = try await apiClient.put(
                    Endpoint.productIngredients(id),
                    body: recipeBody
                )
            } else {
                // Create new product
                let newProduct: Product = try await apiClient.post(Endpoint.products, body: productData)

                // Add recipe if any
                if !validRecipeItems.isEmpty {
                    let recipeBody = RecipeIngredientsWrapper(ingredients: recipeData)
                    let _: StatusResponse = try await apiClient.put(
                        Endpoint.productIngredients(newProduct.id),
                        body: recipeBody
                    )
                }
            }

            HapticsHelper.play(.success)
            isSaving = false
            return true
        } catch {
            HapticsHelper.play(.error)
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
