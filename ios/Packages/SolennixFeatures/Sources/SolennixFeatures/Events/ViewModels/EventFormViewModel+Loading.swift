import Foundation
import SolennixCore
import SolennixNetwork

extension EventFormViewModel {
    // MARK: - Load Initial Data

    @MainActor
    public func loadInitialData() async {
        isLoading = true
        errorMessage = nil

        var fetchSucceeded = false
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
            fetchSucceeded = true
        } catch {
            errorMessage = mapError(error)
        }

        // Only apply prefill/quickquote when catalogs loaded successfully.
        // On error, pendingPrefill is intentionally preserved so the next
        // successful load can apply it.
        if fetchSucceeded {
            if let transferData = QuickQuoteDataHolder.shared.pendingData {
                applyQuickQuoteData(transferData)
                QuickQuoteDataHolder.shared.pendingData = nil
            }

            if let prefill = pendingPrefill {
                applyPrefillData(prefill)
                pendingPrefill = nil
            }
        }

        // Blocked-date parity (ADR): fetch unavailable dates so the picker and
        // save guard can surface/intercept them. Fault-isolated — a failure
        // leaves the form usable (loadUnavailableDates swallows errors).
        await loadUnavailableDates()
        // New-event default auto-skip (Android #696 parity): create mode only.
        // If today (the default eventDate) is blocked, advance to the first
        // non-blocked day. Edit mode is exempt — see the helper.
        advancePastBlockedDefaultIfNeeded()
        // Re-check the (possibly auto-skipped) eventDate so a still-blocked
        // default shows the inline warning immediately.
        checkDateAvailability(eventDate)

        isLoading = false
        // Snapshot the post-load state so isDirty can compare against it.
        takeSnapshot()
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
                quantity: item.quantity,
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

            clientId = event.clientId
            if let client = clients.first(where: { $0.id == event.clientId }) {
                clientName = client.name
            }

            // Parse in UTC via fromServerDay — keeps the calendar day stable
            // across device timezones when pre-populating the date picker.
            if let date = Date.fromServerDay(event.eventDate) {
                eventDate = date
                // Open the picker on the edited event's month so the blocked
                // status of that month is immediately visible. (currentMonth is
                // otherwise anchored to today; nav mutates ONLY currentMonth.)
                currentMonth = Calendar.current.date(
                    from: Calendar.current.dateComponents([.year, .month], from: date)
                ) ?? currentMonth
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

            // Fault-isolated sub-resource loads: a transient failure on one
            // sub-resource (e.g. staff) does not block the rest of the edit
            // form. Each defaults to empty on error.
            async let fetchProducts: [EventProduct] = apiClient.get(Endpoint.eventProducts(id))
            async let fetchExtras: [EventExtra] = apiClient.get(Endpoint.eventExtras(id))
            async let fetchEquipment: [EventEquipment] = apiClient.get(Endpoint.eventEquipment(id))
            async let fetchSupplies: [EventSupply] = apiClient.get(Endpoint.eventSupplies(id))
            async let fetchStaff: [EventStaff] = apiClient.get(Endpoint.eventStaff(id))

            let eventProducts = (try? await fetchProducts) ?? []
            let eventExtras = (try? await fetchExtras) ?? []
            let eventEquipment = (try? await fetchEquipment) ?? []
            let eventSupplies = (try? await fetchSupplies) ?? []
            let eventStaff = (try? await fetchStaff) ?? []

            selectedProducts = eventProducts.map { ep in
                SelectedProduct(
                    productId: ep.productId,
                    product: products.first(where: { $0.id == ep.productId }),
                    quantity: ep.quantity,
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

        // Blocked-date parity (ADR): fetch unavailable dates so the picker and
        // save guard can surface/intercept them. Fault-isolated. Also checks
        // the loaded eventDate so an already-blocked edited event shows the
        // inline warning immediately (reviewer warning: edit-mode MUST check).
        await loadUnavailableDates()
        checkDateAvailability(eventDate)

        isLoading = false
        // Snapshot the post-load state so isDirty can compare against it.
        takeSnapshot()
    }
}
