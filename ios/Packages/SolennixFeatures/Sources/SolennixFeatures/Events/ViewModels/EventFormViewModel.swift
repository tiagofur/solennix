import Foundation
import Observation
import SolennixCore
import SolennixNetwork

// MARK: - Local Model Structs

public struct SelectedProduct: Identifiable, Hashable {
    public let id = UUID()
    public var productId: String
    public var product: Product?
    public var quantity: Double
    public var unitPrice: Double
    public var discount: Double

    public init(productId: String, product: Product? = nil, quantity: Double = 1, unitPrice: Double = 0, discount: Double = 0) {
        self.productId = productId
        self.product = product
        self.quantity = quantity
        self.unitPrice = unitPrice
        self.discount = discount
    }
}

public struct SelectedExtra: Identifiable, Hashable {
    public let id = UUID()
    public var description: String
    public var cost: Double
    public var price: Double
    public var excludeUtility: Bool

    public init(description: String = "", cost: Double = 0, price: Double = 0, excludeUtility: Bool = false) {
        self.description = description
        self.cost = cost
        self.price = price
        self.excludeUtility = excludeUtility
    }
}

public struct SelectedEquipmentItem: Identifiable, Hashable {
    public let id = UUID()
    public var inventoryId: String
    public var name: String
    public var quantity: Int
    public var notes: String

    public init(inventoryId: String, name: String = "", quantity: Int = 1, notes: String = "") {
        self.inventoryId = inventoryId
        self.name = name
        self.quantity = quantity
        self.notes = notes
    }
}

public struct SelectedSupplyItem: Identifiable, Hashable {
    public let id = UUID()
    public var inventoryId: String
    public var name: String
    public var quantity: Double
    public var unitCost: Double
    public var source: SupplySource
    public var excludeCost: Bool

    public init(inventoryId: String, name: String = "", quantity: Double = 1, unitCost: Double = 0, source: SupplySource = .stock, excludeCost: Bool = false) {
        self.inventoryId = inventoryId
        self.name = name
        self.quantity = quantity
        self.unitCost = unitCost
        self.source = source
        self.excludeCost = excludeCost
    }
}

public struct EquipmentConflict: Identifiable, Hashable, Codable {
    public let id: String
    public let equipmentName: String
    public let conflictDate: String
    public let eventName: String

    enum CodingKeys: String, CodingKey {
        case id
        case equipmentName = "equipment_name"
        case conflictDate = "conflict_date"
        case eventName = "event_name"
    }
}

public struct EquipmentSuggestion: Identifiable, Hashable, Codable {
    public let id: String
    public let inventoryId: String
    public let name: String
    public let suggestedQty: Int

    enum CodingKeys: String, CodingKey {
        case id
        case inventoryId = "inventory_id"
        case name
        case suggestedQty = "suggested_qty"
    }
}

public struct SupplySuggestion: Identifiable, Hashable, Codable {
    public let id: String
    public let inventoryId: String
    public let name: String
    public let suggestedQty: Double
    public let unitCost: Double

    enum CodingKeys: String, CodingKey {
        case id
        case inventoryId = "inventory_id"
        case name
        case suggestedQty = "suggested_qty"
        case unitCost = "unit_cost"
    }
}

// MARK: - Event Form View Model

@Observable
public final class EventFormViewModel {

    // MARK: - Form State

    public var clientId: String = ""
    public var clientName: String = ""
    public var eventDate: Date = Date()
    public var startTime: Date?
    public var endTime: Date?
    public var serviceType: String = ""
    public var numPeople: Int = 1
    public var status: EventStatus = .quoted
    public var discount: Double = 0
    public var discountType: DiscountType = .percent
    public var taxRate: Double = 16
    public var requiresInvoice: Bool = false
    public var depositPercent: Double = 50
    public var cancellationDays: Double = 3
    public var refundPercent: Double = 50
    public var location: String = ""
    public var city: String = ""
    public var notes: String = ""

    // MARK: - Data State

    public var clients: [Client] = []
    public var products: [Product] = []
    public var selectedProducts: [SelectedProduct] = []
    public var extras: [SelectedExtra] = []
    public var equipmentInventory: [InventoryItem] = []
    public var selectedEquipment: [SelectedEquipmentItem] = []
    public var supplyInventory: [InventoryItem] = []
    public var selectedSupplies: [SelectedSupplyItem] = []
    public var equipmentConflicts: [EquipmentConflict] = []
    public var equipmentSuggestions: [EquipmentSuggestion] = []
    public var supplySuggestions: [SupplySuggestion] = []

    // MARK: - UI State

    public var currentStep: Int = 1
    public var isLoading: Bool = false
    public var isSaving: Bool = false
    public var errorMessage: String?

    // MARK: - Edit Mode

    public var isEdit: Bool = false
    public var editId: String?

    // MARK: - Dependencies

    public let apiClient: APIClient

    // MARK: - Init

    public init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    // MARK: - Computed Properties

    public var productsSubtotal: Double {
        selectedProducts.reduce(0) { sum, item in
            sum + (item.quantity * item.unitPrice * (1 - item.discount / 100))
        }
    }

    public var extrasSubtotal: Double {
        extras.reduce(0) { $0 + $1.price }
    }

    public var subtotal: Double {
        productsSubtotal + extrasSubtotal
    }

    public var discountAmount: Double {
        switch discountType {
        case .percent:
            return subtotal * discount / 100
        case .fixed:
            return discount
        }
    }

    public var afterDiscount: Double {
        max(subtotal - discountAmount, 0)
    }

    public var taxAmount: Double {
        requiresInvoice ? afterDiscount * taxRate / 100 : 0
    }

    public var total: Double {
        afterDiscount + taxAmount
    }

    public var depositAmount: Double {
        total * depositPercent / 100
    }

    public var isStep1Valid: Bool {
        !clientId.isEmpty
        && serviceType.trimmingCharacters(in: .whitespacesAndNewlines).count >= 2
        && numPeople >= 1
    }

    public var suppliesCost: Double {
        selectedSupplies.filter { !$0.excludeCost }.reduce(0) { $0 + ($1.quantity * $1.unitCost) }
    }

    // MARK: - Load Initial Data

    @MainActor
    public func loadInitialData() async {
        isLoading = true
        errorMessage = nil

        do {
            async let fetchClients: [Client] = apiClient.get(Endpoint.clients)
            async let fetchProducts: [Product] = apiClient.get(Endpoint.products)
            async let fetchInventory: [InventoryItem] = apiClient.get(Endpoint.inventory)

            let (loadedClients, loadedProducts, loadedInventory) = try await (fetchClients, fetchProducts, fetchInventory)

            clients = loadedClients
            products = loadedProducts.filter { $0.isActive }
            equipmentInventory = loadedInventory.filter { $0.type == .equipment }
            supplyInventory = loadedInventory.filter { $0.type == .supply }
        } catch {
            errorMessage = mapError(error)
        }

        isLoading = false
    }

    // MARK: - Load Event for Editing

    @MainActor
    public func loadEventForEditing(id: String) async {
        isLoading = true
        errorMessage = nil

        do {
            let event: Event = try await apiClient.get(Endpoint.event(id))

            // Populate form fields
            clientId = event.clientId
            if let client = clients.first(where: { $0.id == event.clientId }) {
                clientName = client.name
            }

            let dateFormatter = ISO8601DateFormatter()
            dateFormatter.formatOptions = [.withFullDate]
            if let date = dateFormatter.date(from: event.eventDate) {
                eventDate = date
            }

            serviceType = event.serviceType
            numPeople = event.numPeople
            status = event.status
            discount = event.discount
            discountType = event.discountType
            requiresInvoice = event.requiresInvoice
            taxRate = event.taxRate
            location = event.location ?? ""
            city = event.city ?? ""
            depositPercent = event.depositPercent ?? 50
            cancellationDays = event.cancellationDays ?? 3
            refundPercent = event.refundPercent ?? 50
            notes = event.notes ?? ""

            // Load related items
            async let fetchProducts: [EventProduct] = apiClient.get(Endpoint.eventProducts(id))
            async let fetchExtras: [EventExtra] = apiClient.get(Endpoint.eventExtras(id))
            async let fetchEquipment: [EventEquipment] = apiClient.get(Endpoint.eventEquipment(id))
            async let fetchSupplies: [EventSupply] = apiClient.get(Endpoint.eventSupplies(id))

            let (eventProducts, eventExtras, eventEquipment, eventSupplies) = try await (
                fetchProducts, fetchExtras, fetchEquipment, fetchSupplies
            )

            selectedProducts = eventProducts.map { ep in
                SelectedProduct(
                    productId: ep.productId,
                    product: products.first(where: { $0.id == ep.productId }),
                    quantity: Double(ep.quantity),
                    unitPrice: ep.unitPrice,
                    discount: ep.discount
                )
            }

            extras = eventExtras.map { ee in
                SelectedExtra(
                    description: ee.description,
                    cost: ee.cost,
                    price: ee.price,
                    excludeUtility: ee.excludeUtility
                )
            }

            selectedEquipment = eventEquipment.map { eq in
                SelectedEquipmentItem(
                    inventoryId: eq.inventoryId,
                    name: eq.equipmentName ?? "",
                    quantity: eq.quantity,
                    notes: eq.notes ?? ""
                )
            }

            selectedSupplies = eventSupplies.map { es in
                SelectedSupplyItem(
                    inventoryId: es.inventoryId,
                    name: es.supplyName ?? "",
                    quantity: es.quantity,
                    unitCost: es.unitCost,
                    source: es.source,
                    excludeCost: es.excludeCost
                )
            }

            isEdit = true
            editId = id
        } catch {
            errorMessage = mapError(error)
        }

        isLoading = false
    }

    // MARK: - Product Management

    public func addProduct(_ product: Product) {
        if let index = selectedProducts.firstIndex(where: { $0.productId == product.id }) {
            selectedProducts[index].quantity += 1
        } else {
            selectedProducts.append(
                SelectedProduct(
                    productId: product.id,
                    product: product,
                    quantity: 1,
                    unitPrice: product.basePrice,
                    discount: 0
                )
            )
        }
    }

    public func removeProduct(at index: Int) {
        guard selectedProducts.indices.contains(index) else { return }
        selectedProducts.remove(at: index)
    }

    public func updateProductQuantity(at index: Int, quantity: Double) {
        guard selectedProducts.indices.contains(index) else { return }
        selectedProducts[index].quantity = max(1, quantity)
    }

    // MARK: - Extra Management

    public func addExtra() {
        extras.append(SelectedExtra())
    }

    public func removeExtra(at index: Int) {
        guard extras.indices.contains(index) else { return }
        extras.remove(at: index)
    }

    // MARK: - Equipment Management

    public func addEquipment(inventoryId: String, name: String, quantity: Int) {
        if let index = selectedEquipment.firstIndex(where: { $0.inventoryId == inventoryId }) {
            selectedEquipment[index].quantity += quantity
        } else {
            selectedEquipment.append(
                SelectedEquipmentItem(inventoryId: inventoryId, name: name, quantity: quantity)
            )
        }
    }

    public func removeEquipment(at index: Int) {
        guard selectedEquipment.indices.contains(index) else { return }
        selectedEquipment.remove(at: index)
    }

    // MARK: - Supply Management

    public func addSupply(item: InventoryItem, suggestedQty: Double) {
        if let index = selectedSupplies.firstIndex(where: { $0.inventoryId == item.id }) {
            selectedSupplies[index].quantity += suggestedQty
        } else {
            selectedSupplies.append(
                SelectedSupplyItem(
                    inventoryId: item.id,
                    name: item.ingredientName,
                    quantity: suggestedQty,
                    unitCost: item.unitCost ?? 0,
                    source: .stock,
                    excludeCost: false
                )
            )
        }
    }

    public func removeSupply(at index: Int) {
        guard selectedSupplies.indices.contains(index) else { return }
        selectedSupplies.remove(at: index)
    }

    // MARK: - Equipment Conflicts

    @MainActor
    public func checkEquipmentConflicts() async {
        guard !selectedEquipment.isEmpty else {
            equipmentConflicts = []
            return
        }

        let dateFormatter = ISO8601DateFormatter()
        dateFormatter.formatOptions = [.withFullDate]

        let body: [String: Any] = [
            "event_date": dateFormatter.string(from: eventDate),
            "equipment": selectedEquipment.map { [
                "inventory_id": $0.inventoryId,
                "quantity": $0.quantity
            ] },
            "exclude_event_id": editId ?? ""
        ]

        do {
            let conflicts: [EquipmentConflict] = try await apiClient.post(
                Endpoint.equipmentConflicts,
                body: AnyCodable(body)
            )
            equipmentConflicts = conflicts
        } catch {
            // Silently handle — conflicts are advisory
        }
    }

    // MARK: - Suggestions

    @MainActor
    public func fetchSuggestions() async {
        guard !selectedProducts.isEmpty else { return }

        let body: [String: Any] = [
            "products": selectedProducts.map { [
                "product_id": $0.productId,
                "quantity": $0.quantity
            ] },
            "num_people": numPeople
        ]

        do {
            async let fetchEquipSugg: [EquipmentSuggestion] = apiClient.post(
                Endpoint.equipmentSuggestions,
                body: AnyCodable(body)
            )
            async let fetchSupplySugg: [SupplySuggestion] = apiClient.post(
                Endpoint.supplySuggestions,
                body: AnyCodable(body)
            )

            let (equipSugg, supplySugg) = try await (fetchEquipSugg, fetchSupplySugg)
            equipmentSuggestions = equipSugg
            supplySuggestions = supplySugg
        } catch {
            // Silently handle — suggestions are advisory
        }
    }

    // MARK: - Save

    @MainActor
    public func save() async throws {
        isSaving = true
        errorMessage = nil

        defer { isSaving = false }

        let dateFormatter = ISO8601DateFormatter()
        dateFormatter.formatOptions = [.withFullDate]

        let timeFormatter = DateFormatter()
        timeFormatter.dateFormat = "HH:mm"

        var body: [String: Any] = [
            "client_id": clientId,
            "event_date": dateFormatter.string(from: eventDate),
            "service_type": serviceType.trimmingCharacters(in: .whitespacesAndNewlines),
            "num_people": numPeople,
            "status": status.rawValue,
            "discount": discount,
            "discount_type": discountType.rawValue,
            "requires_invoice": requiresInvoice,
            "tax_rate": taxRate,
            "deposit_percent": depositPercent,
            "cancellation_days": cancellationDays,
            "refund_percent": refundPercent,
        ]

        if let startTime {
            body["start_time"] = timeFormatter.string(from: startTime)
        }
        if let endTime {
            body["end_time"] = timeFormatter.string(from: endTime)
        }

        let trimmedLocation = location.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmedLocation.isEmpty {
            body["location"] = trimmedLocation
        }

        let trimmedCity = city.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmedCity.isEmpty {
            body["city"] = trimmedCity
        }

        let trimmedNotes = notes.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmedNotes.isEmpty {
            body["notes"] = trimmedNotes
        }

        let event: Event
        if isEdit, let editId {
            event = try await apiClient.put(Endpoint.event(editId), body: AnyCodable(body))
        } else {
            event = try await apiClient.post(Endpoint.events, body: AnyCodable(body))
        }

        // Update items (products, extras, equipment, supplies)
        let itemsBody: [String: Any] = [
            "products": selectedProducts.map { [
                "product_id": $0.productId,
                "quantity": Int($0.quantity),
                "unit_price": $0.unitPrice,
                "discount": $0.discount
            ] },
            "extras": extras.map { [
                "description": $0.description,
                "cost": $0.cost,
                "price": $0.price,
                "exclude_utility": $0.excludeUtility
            ] },
            "equipment": selectedEquipment.map { [
                "inventory_id": $0.inventoryId,
                "quantity": $0.quantity,
                "notes": $0.notes
            ] },
            "supplies": selectedSupplies.map { [
                "inventory_id": $0.inventoryId,
                "quantity": $0.quantity,
                "unit_cost": $0.unitCost,
                "source": $0.source.rawValue,
                "exclude_cost": $0.excludeCost
            ] }
        ]

        let _: EmptyResponse = try await apiClient.put(
            Endpoint.eventItems(event.id),
            body: AnyCodable(itemsBody)
        )
    }

    // MARK: - Step Navigation

    public func nextStep() {
        guard currentStep < 5 else { return }
        if currentStep == 1 && !isStep1Valid { return }
        currentStep += 1
    }

    public func previousStep() {
        guard currentStep > 1 else { return }
        currentStep -= 1
    }

    // MARK: - Error Mapping

    private func mapError(_ error: Error) -> String {
        if let apiError = error as? APIError {
            return apiError.errorDescription ?? "Ocurrio un error inesperado."
        }
        return "Ocurrio un error inesperado. Intenta de nuevo."
    }
}
