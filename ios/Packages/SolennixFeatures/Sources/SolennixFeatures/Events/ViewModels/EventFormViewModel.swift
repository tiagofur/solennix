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
    public var includeInChecklist: Bool

    public init(description: String = "", cost: Double = 0, price: Double = 0, excludeUtility: Bool = false, includeInChecklist: Bool = true) {
        self.description = description
        self.cost = cost
        self.price = price
        self.excludeUtility = excludeUtility
        self.includeInChecklist = includeInChecklist
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

public struct FormEquipmentConflict: Identifiable, Hashable, Codable {
    public let id: String
    public let equipmentName: String
    public let conflictDate: String
    public let eventName: String
}

public struct FormEquipmentSuggestion: Identifiable, Hashable, Codable {
    public let id: String
    public let inventoryId: String
    public let name: String
    public let suggestedQty: Int
}

public struct FormSupplySuggestion: Identifiable, Hashable, Codable {
    public let id: String
    public let inventoryId: String
    public let name: String
    public let suggestedQty: Double
    public let unitCost: Double
}

// MARK: - Selected Staff Assignment

/// Asignacion de staff tal como se usa dentro del form (costo por evento).
/// Se envia en el body de `PUT /api/events/{id}/items` bajo la key `staff`.
public struct SelectedStaffAssignment: Identifiable, Hashable {
    public let id = UUID()
    public var staffId: String
    public var staffName: String
    public var staffRoleLabel: String?
    public var feeAmount: Double
    public var roleOverride: String
    public var notes: String

    // MARK: - Ola 1 (turnos + estado)

    /// Inicio del turno como `Date` local. Se serializa a ISO8601 UTC en el body.
    /// Nil = no se capturo turno.
    public var shiftStart: Date?
    /// Fin del turno como `Date` local. Si `shiftEnd <= shiftStart` el turno
    /// cruza medianoche — la serializacion empuja el end +1 dia antes de
    /// enviarlo al backend, que tiene un CHECK `shift_end > shift_start`.
    public var shiftEnd: Date?
    /// Status tipado. Default `.confirmed` — coherente con el fallback del backend.
    public var status: AssignmentStatus

    public init(
        staffId: String,
        staffName: String = "",
        staffRoleLabel: String? = nil,
        feeAmount: Double = 0,
        roleOverride: String = "",
        notes: String = "",
        shiftStart: Date? = nil,
        shiftEnd: Date? = nil,
        status: AssignmentStatus = .confirmed
    ) {
        self.staffId = staffId
        self.staffName = staffName
        self.staffRoleLabel = staffRoleLabel
        self.feeAmount = feeAmount
        self.roleOverride = roleOverride
        self.notes = notes
        self.shiftStart = shiftStart
        self.shiftEnd = shiftEnd
        self.status = status
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
    public var equipmentConflicts: [FormEquipmentConflict] = []
    public var equipmentSuggestions: [FormEquipmentSuggestion] = []
    public var supplySuggestions: [FormSupplySuggestion] = []

    // Staff (Personal / Colaboradores)
    public var staff: [Staff] = []
    public var selectedStaff: [SelectedStaffAssignment] = []

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

    // MARK: - Prefill Support (Duplicate Event)

    private struct PrefillData {
        let event: Event
        let products: [EventProduct]
        let extras: [EventExtra]
        let equipment: [EventEquipment]
        let supplies: [EventSupply]
    }

    private var pendingPrefill: PrefillData?

    /// Queues event data to be applied after initial data loads.
    /// Date is NOT copied — user picks a new one. Payments are NOT copied.
    public func prefill(
        from event: Event,
        products: [EventProduct] = [],
        extras: [EventExtra] = [],
        equipment: [EventEquipment] = [],
        supplies: [EventSupply] = []
    ) {
        pendingPrefill = PrefillData(event: event, products: products, extras: extras, equipment: equipment, supplies: supplies)
    }

    private func applyPrefillData(_ data: PrefillData) {
        let event = data.event
        clientId = event.clientId
        clientName = clients.first(where: { $0.id == event.clientId })?.name ?? ""
        serviceType = event.serviceType
        numPeople = event.numPeople
        discount = event.discount
        discountType = event.discountType
        taxRate = event.taxRate
        requiresInvoice = event.requiresInvoice
        location = event.location ?? ""
        city = event.city ?? ""
        notes = event.notes ?? ""
        depositPercent = event.depositPercent ?? 50
        cancellationDays = event.cancellationDays ?? 3
        refundPercent = event.refundPercent ?? 50
        status = .quoted

        selectedProducts = data.products.map { ep in
            SelectedProduct(
                productId: ep.productId,
                product: products.first(where: { $0.id == ep.productId }),
                quantity: Double(ep.quantity),
                unitPrice: ep.unitPrice,
                discount: ep.discount
            )
        }
        extras = data.extras.map { ee in
            SelectedExtra(description: ee.description, cost: ee.cost, price: ee.price, excludeUtility: ee.excludeUtility, includeInChecklist: ee.includeInChecklist)
        }
        selectedEquipment = data.equipment.map { eq in
            SelectedEquipmentItem(inventoryId: eq.inventoryId, name: eq.equipmentName ?? "", quantity: eq.quantity, notes: eq.notes ?? "")
        }
        selectedSupplies = data.supplies.map { s in
            SelectedSupplyItem(inventoryId: s.inventoryId, name: s.supplyName ?? "", quantity: s.quantity, unitCost: s.unitCost, source: s.source, excludeCost: s.excludeCost)
        }
    }

    // MARK: - Init

    public init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    // MARK: - Computed Properties

    public var productsSubtotal: Double {
        selectedProducts.reduce(0) { sum, item in
            sum + (item.quantity * (item.unitPrice - item.discount))
        }
    }

    public var extrasSubtotal: Double {
        extras.reduce(0) { $0 + $1.price }
    }

    public var normalExtrasSubtotal: Double {
        extras.filter { !$0.excludeUtility }.reduce(0) { $0 + $1.price }
    }

    public var passThroughExtrasSubtotal: Double {
        extras.filter { $0.excludeUtility }.reduce(0) { $0 + $1.price }
    }

    public var subtotal: Double {
        productsSubtotal + extrasSubtotal
    }

    public var discountableBase: Double {
        productsSubtotal + normalExtrasSubtotal
    }

    public var discountAmount: Double {
        switch discountType {
        case .percent:
            return discountableBase * discount / 100
        case .fixed:
            return min(discount, discountableBase)
        }
    }

    public var afterDiscount: Double {
        max(discountableBase - discountAmount, 0)
    }

    public var taxAmount: Double {
        let baseTotal = afterDiscount + passThroughExtrasSubtotal
        return requiresInvoice ? baseTotal * taxRate / 100 : 0
    }

    public var total: Double {
        afterDiscount + passThroughExtrasSubtotal + taxAmount
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
            async let fetchClients: [Client] = apiClient.getAll(Endpoint.clients)
            async let fetchProducts: [Product] = apiClient.getAll(Endpoint.products)
            async let fetchInventory: [InventoryItem] = apiClient.getAll(Endpoint.inventory)
            async let fetchStaff: [Staff] = apiClient.getAll(Endpoint.staff)

            let (loadedClients, loadedProducts, loadedInventory, loadedStaff) = try await (
                fetchClients, fetchProducts, fetchInventory, fetchStaff
            )

            clients = loadedClients
            products = loadedProducts.filter { $0.isActive }
            equipmentInventory = loadedInventory.filter { $0.type == .equipment }
            supplyInventory = loadedInventory.filter { $0.type == .supply }
            staff = loadedStaff
        } catch {
            errorMessage = mapError(error)
        }

        // Check for Quick Quote transfer data
        if let transferData = QuickQuoteDataHolder.shared.pendingData {
            applyQuickQuoteData(transferData)
            QuickQuoteDataHolder.shared.pendingData = nil
        }

        // Check for duplicate/prefill data (set via prefill(from:))
        if let prefill = pendingPrefill {
            applyPrefillData(prefill)
            pendingPrefill = nil
        }

        isLoading = false
    }

    // MARK: - Apply Quick Quote Data

    private func applyQuickQuoteData(_ data: QuickQuoteTransferData) {
        numPeople = data.numPeople
        discountType = data.discountType
        discount = data.discountValue
        requiresInvoice = data.requiresInvoice

        selectedProducts = data.products.map { item in
            SelectedProduct(
                productId: item.productId,
                product: products.first(where: { $0.id == item.productId }),
                quantity: Double(item.quantity),
                unitPrice: item.unitPrice,
                discount: 0
            )
        }

        extras = data.extras.map { item in
            SelectedExtra(
                description: item.description,
                cost: item.cost,
                price: item.price,
                excludeUtility: item.excludeUtility
            )
        }
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
            async let fetchStaff: [EventStaff] = apiClient.get(Endpoint.eventStaff(id))

            let (eventProducts, eventExtras, eventEquipment, eventSupplies, eventStaff) = try await (
                fetchProducts, fetchExtras, fetchEquipment, fetchSupplies, fetchStaff
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
                    excludeUtility: ee.excludeUtility,
                    includeInChecklist: ee.includeInChecklist
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

            let iso = ISO8601DateFormatter()
            iso.formatOptions = [.withInternetDateTime]
            let isoFractional = ISO8601DateFormatter()
            isoFractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            func parseISO(_ s: String?) -> Date? {
                guard let s, !s.isEmpty else { return nil }
                return iso.date(from: s) ?? isoFractional.date(from: s)
            }

            selectedStaff = eventStaff.map { es in
                SelectedStaffAssignment(
                    staffId: es.staffId,
                    staffName: es.staffName ?? staff.first(where: { $0.id == es.staffId })?.name ?? "",
                    staffRoleLabel: es.staffRoleLabel ?? staff.first(where: { $0.id == es.staffId })?.roleLabel,
                    feeAmount: es.feeAmount ?? 0,
                    roleOverride: es.roleOverride ?? "",
                    notes: es.notes ?? "",
                    shiftStart: parseISO(es.shiftStart),
                    shiftEnd: parseISO(es.shiftEnd),
                    status: es.assignmentStatus
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

        // Ola 3: si el producto carga un team asociado, expandir sus miembros
        // como staff del evento. Snapshot: el team se hidrata acá y el dedup
        // lo maneja `addStaffTeam`.
        if let teamId = product.staffTeamId, !teamId.isEmpty {
            Task { await expandStaffTeam(teamId: teamId) }
        }
    }

    /// Fetcha el team por ID y expande sus miembros en `selectedStaff`. Los
    /// errores se reportan via `errorMessage` sin bloquear el add del producto.
    @MainActor
    private func expandStaffTeam(teamId: String) async {
        do {
            let team = try await apiClient.getStaffTeam(id: teamId)
            _ = addStaffTeam(team)
        } catch {
            errorMessage = mapError(error)
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

    public func moveProduct(from source: Int, to destination: Int) {
        guard selectedProducts.indices.contains(source),
              destination >= 0, destination <= selectedProducts.count,
              source != destination else { return }
        let item = selectedProducts.remove(at: source)
        let adjustedDestination = destination > source ? destination - 1 : destination
        selectedProducts.insert(item, at: min(adjustedDestination, selectedProducts.count))
    }

    // MARK: - Extra Management

    public func moveExtra(from source: Int, to destination: Int) {
        guard extras.indices.contains(source),
              destination >= 0, destination <= extras.count,
              source != destination else { return }
        let item = extras.remove(at: source)
        let adjustedDestination = destination > source ? destination - 1 : destination
        extras.insert(item, at: min(adjustedDestination, extras.count))
    }

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

    // MARK: - Staff Management

    /// Agrega un colaborador a la lista. Si ya estaba asignado, no lo duplica.
    public func addStaff(_ item: Staff) {
        if selectedStaff.contains(where: { $0.staffId == item.id }) { return }
        selectedStaff.append(
            SelectedStaffAssignment(
                staffId: item.id,
                staffName: item.name,
                staffRoleLabel: item.roleLabel
            )
        )
    }

    public func removeStaff(at index: Int) {
        guard selectedStaff.indices.contains(index) else { return }
        selectedStaff.remove(at: index)
    }

    /// Agrega todos los miembros de un team al evento, saltando los que ya
    /// estaban asignados. Si el staff no tiene role propio y el team si tiene
    /// `roleLabel`, se usa ese como `roleOverride` del evento.
    /// Devuelve cuantos miembros se agregaron efectivamente.
    @discardableResult
    public func addStaffTeam(_ team: StaffTeam) -> Int {
        let teamRole = team.roleLabel?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let members = (team.members ?? []).sorted { $0.position < $1.position }
        var added = 0

        for member in members {
            if selectedStaff.contains(where: { $0.staffId == member.staffId }) { continue }

            let staffRole = member.staffRoleLabel?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            let roleOverride = staffRole.isEmpty ? teamRole : ""

            selectedStaff.append(
                SelectedStaffAssignment(
                    staffId: member.staffId,
                    staffName: member.staffName ?? "",
                    staffRoleLabel: member.staffRoleLabel,
                    roleOverride: roleOverride
                )
            )
            added += 1
        }

        return added
    }

    /// Suma de costos de staff asignado (se muestra en el panel pero NO afecta
    /// el total del evento en Phase 1 — es informativo).
    public var staffCost: Double {
        selectedStaff.reduce(0) { $0 + $1.feeAmount }
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
            let conflicts: [FormEquipmentConflict] = try await apiClient.post(
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
            async let fetchEquipSugg: [FormEquipmentSuggestion] = apiClient.post(
                Endpoint.equipmentSuggestions,
                body: AnyCodable(body)
            )
            async let fetchSupplySugg: [FormSupplySuggestion] = apiClient.post(
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
            "tax_amount": taxAmount,
            "total_amount": total,
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
        do {
            if isEdit, let editId {
                event = try await apiClient.put(Endpoint.event(editId), body: AnyCodable(body))
            } else {
                event = try await apiClient.post(Endpoint.events, body: AnyCodable(body))
            }
        } catch {
            HapticsHelper.play(.error)
            throw error
        }

        // Update items (products, extras, equipment, supplies, staff)
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
                "exclude_utility": $0.excludeUtility,
                "include_in_checklist": $0.includeInChecklist
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
            ] },
            "staff": selectedStaff.map { assignment -> [String: Any] in
                var dict: [String: Any] = [
                    "staff_id": assignment.staffId,
                    "fee_amount": assignment.feeAmount,
                    "status": assignment.status.rawValue,
                ]
                let trimmedRole = assignment.roleOverride.trimmingCharacters(in: .whitespacesAndNewlines)
                if !trimmedRole.isEmpty {
                    dict["role_override"] = trimmedRole
                }
                let trimmedNotes = assignment.notes.trimmingCharacters(in: .whitespacesAndNewlines)
                if !trimmedNotes.isEmpty {
                    dict["notes"] = trimmedNotes
                }
                let iso = ISO8601DateFormatter()
                iso.formatOptions = [.withInternetDateTime]
                if let start = assignment.shiftStart {
                    dict["shift_start"] = iso.string(from: start)
                    if let rawEnd = assignment.shiftEnd {
                        // Overnight turnos: si el usuario eligio una hora de salida
                        // anterior a la de entrada, interpretamos que cruza
                        // medianoche y empujamos el end al dia siguiente para que
                        // pase el CHECK `shift_end > shift_start` del backend.
                        let end = rawEnd <= start
                            ? Calendar.current.date(byAdding: .day, value: 1, to: rawEnd) ?? rawEnd
                            : rawEnd
                        dict["shift_end"] = iso.string(from: end)
                    }
                } else if let end = assignment.shiftEnd {
                    dict["shift_end"] = iso.string(from: end)
                }
                return dict
            }
        ]

        let _: EmptyResponse = try await apiClient.put(
            Endpoint.eventItems(event.id),
            body: AnyCodable(itemsBody)
        )

        HapticsHelper.play(.success)
        NotificationCenter.default.post(name: .solennixEventUpdated, object: nil)
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
