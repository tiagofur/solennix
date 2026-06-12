import Foundation
import SolennixCore
import SolennixNetwork

extension EventFormViewModel {
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

        if let teamId = product.staffTeamId, !teamId.isEmpty {
            let task = Task { await expandStaffTeam(teamId: teamId) }
            pendingTasks.append(task)
        }
    }

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

    public func updateProductDiscount(at index: Int, discount: Double) {
        guard selectedProducts.indices.contains(index) else { return }
        selectedProducts[index].discount = max(0, discount)
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

    public func addEquipmentFromSuggestion(_ suggestion: FormEquipmentSuggestion) {
        guard !selectedEquipment.contains(where: { $0.inventoryId == suggestion.id }) else { return }
        selectedEquipment.append(
            SelectedEquipmentItem(
                inventoryId: suggestion.id,
                name: suggestion.ingredientName,
                quantity: max(1, Int(suggestion.suggestedQuantity.rounded())),
                notes: ""
            )
        )
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

    public func addSupplyFromSuggestion(_ suggestion: FormSupplySuggestion) {
        guard !selectedSupplies.contains(where: { $0.inventoryId == suggestion.id }) else { return }
        let source: SupplySource = suggestion.currentStock >= suggestion.suggestedQuantity ? .stock : .purchase
        selectedSupplies.append(
            SelectedSupplyItem(
                inventoryId: suggestion.id,
                name: suggestion.ingredientName,
                quantity: suggestion.suggestedQuantity,
                unitCost: suggestion.unitCost,
                source: source,
                excludeCost: false
            )
        )
    }

    public func removeSupply(at index: Int) {
        guard selectedSupplies.indices.contains(index) else { return }
        selectedSupplies.remove(at: index)
    }

    // MARK: - Staff Management

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

        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"

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
}
