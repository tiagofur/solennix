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

/// Sugerencia de equipo desde el backend. Campos alineados con el JSON
/// (`ingredient_name`, `current_stock`, etc.) + snake_case strategy del
/// APIClient. Antes tenía `inventoryId`/`name`/`suggestedQty` que no
/// matcheaban el payload — el decode fallaba silencioso y la lista siempre
/// venía vacía, por eso el usuario no veía las sugerencias.
public struct FormEquipmentSuggestion: Identifiable, Hashable, Codable {
    public let id: String
    public let ingredientName: String
    public let currentStock: Double
    public let unit: String
    public let type: String
    public let suggestedQuantity: Double
}

public struct FormSupplySuggestion: Identifiable, Hashable, Codable {
    public let id: String
    public let ingredientName: String
    public let currentStock: Double
    public let unit: String
    public let unitCost: Double
    public let suggestedQuantity: Double
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
    public var equipmentAvailability: [EquipmentAvailability] = []
    public var supplyInventory: [InventoryItem] = []
    public var selectedSupplies: [SelectedSupplyItem] = []
    public var equipmentConflicts: [FormEquipmentConflict] = []
    public var equipmentSuggestions: [FormEquipmentSuggestion] = []
    public var supplySuggestions: [FormSupplySuggestion] = []

    /// Cache local de costos unitarios por producto (calculado sumando
    /// ingredients × unitCost). Se popula cuando el usuario llega al Paso 5
    /// o cambia `selectedProducts` — parity con Android (`_productUnitCosts`).
    public var productUnitCosts: [String: Double] = [:]

    // Staff (Personal / Colaboradores)
    public var staff: [Staff] = []
    public var selectedStaff: [SelectedStaffAssignment] = []

    // MARK: - UI State

    public var currentStep: Int = 1
    public var isLoading: Bool = false
    public var isSaving: Bool = false
    public var errorMessage: String?
    public var planLimitMessage: String?

    // MARK: - Dirty-State Snapshot
    //
    // Replaces the fragile onChange/markDirty/resetDirty machinery.
    // A snapshot is taken once after loadInitialData (create mode) and once
    // after loadEventForEditing (edit mode). isDirty is a pure computed
    // comparison — no race between resetDirty() and onChange watchers.

    /// Stable signature for a collection item: id + quantity + price.
    struct ItemSignature: Equatable {
        let id: String
        let quantity: Double
        let price: Double
        /// Extra per-type fields folded into the dirty signature so that editing
        /// (e.g.) an extra's description or a staff member's shift — without
        /// touching price — still marks the form dirty.
        var detail: String = ""
    }

    struct FormSnapshot: Equatable {
        var clientId: String
        var serviceType: String
        var eventDate: Date
        var startTime: Date?
        var endTime: Date?
        var numPeople: Int
        var notes: String
        var location: String
        var city: String
        var status: EventStatus
        var requiresInvoice: Bool
        var taxRate: Double
        var depositPercent: Double
        var cancellationDays: Double
        var refundPercent: Double
        var discount: Double
        var discountType: DiscountType
        var products: [ItemSignature]
        var extras: [ItemSignature]
        var staff: [ItemSignature]
        var equipment: [ItemSignature]
        var supplies: [ItemSignature]
    }

    /// Snapshot taken once after load. Nil until the first load completes.
    var formSnapshot: FormSnapshot?

    /// True iff the current form state differs from the post-load snapshot.
    /// Pure computed — no side effects, no race conditions.
    public var isDirty: Bool {
        guard let snap = formSnapshot else { return false }
        return currentSnapshot != snap
    }

    var currentSnapshot: FormSnapshot {
        FormSnapshot(
            clientId: clientId,
            serviceType: serviceType,
            eventDate: eventDate,
            startTime: startTime,
            endTime: endTime,
            numPeople: numPeople,
            notes: notes,
            location: location,
            city: city,
            status: status,
            requiresInvoice: requiresInvoice,
            taxRate: taxRate,
            depositPercent: depositPercent,
            cancellationDays: cancellationDays,
            refundPercent: refundPercent,
            discount: discount,
            discountType: discountType,
            products: selectedProducts.map { ItemSignature(id: $0.productId, quantity: $0.quantity, price: $0.unitPrice) },
            extras: extras.map {
                ItemSignature(
                    id: $0.id.uuidString,
                    quantity: 1,
                    price: $0.price,
                    detail: "\($0.description)|\($0.cost)|\($0.excludeUtility)|\($0.includeInChecklist)"
                )
            },
            staff: selectedStaff.map {
                ItemSignature(
                    id: $0.staffId,
                    quantity: $0.feeAmount,
                    price: $0.feeAmount,
                    detail: "\($0.staffRoleLabel ?? "")|\($0.roleOverride)|\($0.notes)|\($0.shiftStart?.timeIntervalSince1970 ?? -1)|\($0.shiftEnd?.timeIntervalSince1970 ?? -1)|\($0.status)"
                )
            },
            equipment: selectedEquipment.map {
                ItemSignature(id: $0.inventoryId, quantity: Double($0.quantity), price: 0, detail: $0.notes)
            },
            supplies: selectedSupplies.map { ItemSignature(id: $0.inventoryId, quantity: $0.quantity, price: $0.unitCost) }
        )
    }

    /// Takes a snapshot of the current form state. Called at the end of both
    /// loadInitialData and loadEventForEditing, after all fields are populated.
    func takeSnapshot() {
        formSnapshot = currentSnapshot
    }

    // MARK: - Edit Mode

    public var isEdit: Bool = false
    public var editId: String?

    // MARK: - Dependencies

    public let apiClient: APIClient

    /// Pending background tasks stored so they can be cancelled on deinit,
    /// preventing dangling async work from outliving the view model.
    var pendingTasks: [Task<Void, Never>] = []

    func tr(_ key: String, _ defaultValue: String) -> String {
        FeatureL10n.text(key, defaultValue)
    }

    // MARK: - Prefill Support (Duplicate Event)

    struct PrefillData {
        let event: Event
        let products: [EventProduct]
        let extras: [EventExtra]
        let equipment: [EventEquipment]
        let supplies: [EventSupply]
    }

    var pendingPrefill: PrefillData?

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

    func applyPrefillData(_ data: PrefillData) {
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
                quantity: ep.quantity,
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

    deinit {
        pendingTasks.forEach { $0.cancel() }
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
        // Clamp to prevent negative totals. Percent ∈ [0, 100]; fixed ∈ [0, base].
        // Mirrors EventFinancials.compute() and backend financial.go:84-89.
        switch discountType {
        case .percent:
            let clampedPercent = max(0, min(100, discount))
            return discountableBase * clampedPercent / 100
        case .fixed:
            return min(max(0, discount), discountableBase)
        }
    }

    public var afterDiscount: Double {
        max(discountableBase - discountAmount, 0)
    }

    public var taxAmount: Double {
        let baseTotal = afterDiscount + passThroughExtrasSubtotal
        return requiresInvoice ? EventFinancials.round2(baseTotal * taxRate / 100) : 0
    }

    public var total: Double {
        EventFinancials.round2(afterDiscount + passThroughExtrasSubtotal + taxAmount)
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
}
