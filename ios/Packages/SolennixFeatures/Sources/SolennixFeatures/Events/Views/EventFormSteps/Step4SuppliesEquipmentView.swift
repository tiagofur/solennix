import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

private func tr(_ key: String, _ value: String) -> String {
    FeatureL10n.text(key, value)
}

private func trf(_ key: String, _ value: String, _ arg: String) -> String {
    String(format: tr(key, value), locale: FeatureL10n.locale, arg)
}

private func trf2(_ key: String, _ value: String, _ arg1: String, _ arg2: String) -> String {
    String(format: tr(key, value), locale: FeatureL10n.locale, arg1, arg2)
}

// MARK: - Step 4: Inventario & Personal
//
// Layout single-column stacked con 3 secciones (Insumos · Equipamiento ·
// Personal). Parity visual con Paso 2 (Productos): card prominente
// "Agregar X" + banner de sugerencias one-tap + lista + subtotal.

struct Step4SuppliesEquipmentView: View {

    @Bindable var viewModel: EventFormViewModel

    @State private var showSupplyPicker = false
    @State private var showEquipmentPicker = false
    @State private var supplySearch = ""
    @State private var equipmentSearch = ""

    var body: some View {
        ScrollView {
            VStack(spacing: Spacing.xl) {
                suppliesSection

                Divider()
                    .foregroundStyle(SolennixColors.border)

                equipmentSection

                Divider()
                    .foregroundStyle(SolennixColors.border)

                personnelSection
            }
            .padding(Spacing.md)
        }
        .sheet(isPresented: $showSupplyPicker) {
            supplyPickerSheet
        }
        .sheet(isPresented: $showEquipmentPicker) {
            equipmentPickerSheet
        }
        .task {
            await viewModel.fetchSuggestions()
        }
        .task {
            await viewModel.checkEquipmentConflicts()
        }
        // Refetch sugerencias cuando cambia la lista de productos — antes se
        // quedaba con el fetch inicial y los productos agregados después no
        // recalculaban las sugerencias.
        .onChange(of: viewModel.selectedProducts.count) { _, _ in
            Task { await viewModel.fetchSuggestions() }
        }
    }

    // MARK: - Supplies Section

    private var suppliesSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Step4SectionHeader(title: tr("events.form.inventory.supplies", "Insumos"))

            if !viewModel.supplySuggestions.isEmpty {
                Step4SuggestionsBanner(
                    title: tr("events.form.inventory.suggestions", "Sugerencias por productos"),
                    chips: viewModel.supplySuggestions.map { suggestion in
                        let alreadyAdded = viewModel.selectedSupplies.contains { $0.inventoryId == suggestion.id }
                        return Step4SuggestionChip(
                            id: suggestion.id,
                            label: "\(suggestion.ingredientName) (\(formatQty(suggestion.suggestedQuantity)))",
                            alreadyAdded: alreadyAdded,
                            action: { viewModel.addSupplyFromSuggestion(suggestion) }
                        )
                    }
                )
            }

            Step4AddButton(label: tr("events.form.inventory.add_supply", "Agregar insumo")) { showSupplyPicker = true }

            if viewModel.selectedSupplies.isEmpty {
                Step4EmptyState(
                    icon: "shippingbox",
                    title: tr("events.form.inventory.empty_supplies_title", "Sin insumos (opcional)"),
                    subtitle: tr("events.form.inventory.empty_supplies_desc", "Agrega consumibles del inventario")
                )
            } else {
                ForEach(Array(viewModel.selectedSupplies.enumerated()), id: \.element.id) { index, item in
                    let inventory = viewModel.supplyInventory.first { $0.id == item.inventoryId }
                    SupplyRowView(
                        item: item,
                        index: index,
                        unit: inventory?.unit ?? "",
                        onRemove: { viewModel.removeSupply(at: index) },
                        onQuantityChange: { newQty in
                            guard viewModel.selectedSupplies.indices.contains(index) else { return }
                            viewModel.selectedSupplies[index].quantity = newQty
                        },
                        onSourceChange: { newSource in
                            guard viewModel.selectedSupplies.indices.contains(index) else { return }
                            viewModel.selectedSupplies[index].source = newSource
                            if newSource == .purchase {
                                viewModel.selectedSupplies[index].excludeCost = false
                            }
                        },
                        onExcludeCostChange: { newValue in
                            guard viewModel.selectedSupplies.indices.contains(index) else { return }
                            viewModel.selectedSupplies[index].excludeCost = newValue
                        }
                    )
                }

                Step4SuppliesCostSummary(total: viewModel.suppliesCost)
            }
        }
    }

    // MARK: - Equipment Section

    private var equipmentSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Step4SectionHeader(title: tr("events.form.inventory.equipment", "Equipamiento"))

            if !viewModel.equipmentConflicts.isEmpty {
                Step4EquipmentConflictsBanner(conflicts: viewModel.equipmentConflicts)
            }

            if !viewModel.equipmentSuggestions.isEmpty {
                Step4SuggestionsBanner(
                    title: tr("events.form.inventory.suggestions", "Sugerencias por productos"),
                    chips: viewModel.equipmentSuggestions.map { suggestion in
                        let alreadyAdded = viewModel.selectedEquipment.contains { $0.inventoryId == suggestion.id }
                        return Step4SuggestionChip(
                            id: suggestion.id,
                            label: "\(suggestion.ingredientName) (\(formatQty(suggestion.suggestedQuantity)))",
                            alreadyAdded: alreadyAdded,
                            action: { viewModel.addEquipmentFromSuggestion(suggestion) }
                        )
                    }
                )
            }

            Step4AddButton(label: tr("events.form.inventory.add_equipment", "Agregar equipamiento")) { showEquipmentPicker = true }

            if viewModel.selectedEquipment.isEmpty {
                Step4EmptyState(
                    icon: "wrench.and.screwdriver",
                    title: tr("events.form.inventory.empty_equipment_title", "Sin equipamiento (opcional)"),
                    subtitle: tr("events.form.inventory.empty_equipment_desc", "Agrega equipo reutilizable para el evento")
                )
            } else {
                ForEach(Array(viewModel.selectedEquipment.enumerated()), id: \.element.id) { index, item in
                    let inventory = viewModel.equipmentInventory.first { $0.id == item.inventoryId }
                    EquipmentRowView(
                        item: item,
                        index: index,
                        stock: inventory?.currentStock ?? 0,
                        unit: inventory?.unit ?? "",
                        onRemove: { viewModel.removeEquipment(at: index) },
                        onQuantityChange: { newQty in
                            guard viewModel.selectedEquipment.indices.contains(index) else { return }
                            viewModel.selectedEquipment[index].quantity = newQty
                        }
                    )
                }
            }
        }
    }

    // MARK: - Personnel Section

    private var personnelSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Step4SectionHeader(title: tr("events.form.inventory.staff", "Personal"))

            Step4PersonnelPanel(viewModel: viewModel)
        }
    }

    /// Unidades contables que se ordenan siempre enteras (no hace sentido
    /// pedir 1.5 bolsas o media caja). El resto — kg, g, L, ml, lb, oz —
    /// cae a text field decimal.
    static func isIntegerUnit(_ unit: String) -> Bool {
        let normalized = unit.trimmingCharacters(in: .whitespaces).lowercased()
        let integerUnits: Set<String> = [
            "unidad", "unidades", "u", "ud", "uds",
            "pz", "pza", "pzas", "pieza", "piezas",
            "bolsa", "bolsas",
            "caja", "cajas",
            "botella", "botellas",
            "pack", "packs",
        ]
        return normalized.isEmpty || integerUnits.contains(normalized)
    }

    static func stockLabel(stock: Double, unit: String) -> String {
        let stockStr = stock.truncatingRemainder(dividingBy: 1) == 0
            ? String(format: "%.0f", stock)
            : String(format: "%.1f", stock)
        return unit.isEmpty
            ? trf("events.form.inventory.stock_value", "Stock: %@", stockStr)
            : trf2("events.form.inventory.stock_value_unit", "Stock: %@ %@", stockStr, unit)
    }

    // MARK: - Picker Sheets

    private var supplyPickerSheet: some View {
        Step4PickerSheet(
            searchText: $supplySearch,
            searchPrompt: tr("events.form.inventory.search_supply", "Buscar insumo"),
            title: tr("events.form.inventory.add_supply", "Agregar insumo"),
            onClose: { showSupplyPicker = false }
        ) {
                ForEach(filteredSupplies) { item in
                    Button {
                        viewModel.addSupply(item: item, suggestedQty: 1)
                        showSupplyPicker = false
                    } label: {
                        Step4SupplyPickerRow(
                            item: item,
                            isSelected: viewModel.selectedSupplies.contains(where: { $0.inventoryId == item.id })
                        )
                    }
                    .buttonStyle(.plain)
                }
        }
    }

    private var equipmentPickerSheet: some View {
        Step4PickerSheet(
            searchText: $equipmentSearch,
            searchPrompt: tr("events.form.inventory.search_equipment", "Buscar equipo"),
            title: tr("events.form.inventory.add_equipment", "Agregar equipamiento"),
            onClose: { showEquipmentPicker = false }
        ) {
                ForEach(filteredEquipment) { item in
                    Button {
                        viewModel.addEquipment(inventoryId: item.id, name: item.ingredientName, quantity: 1)
                        showEquipmentPicker = false
                    } label: {
                        Step4EquipmentPickerRow(
                            item: item,
                            isSelected: viewModel.selectedEquipment.contains(where: { $0.inventoryId == item.id })
                        )
                    }
                    .buttonStyle(.plain)
                }
        }
    }

    // MARK: - Filtered Lists

    private var filteredSupplies: [InventoryItem] {
        if supplySearch.isEmpty { return viewModel.supplyInventory }
        return viewModel.supplyInventory.filter {
            $0.ingredientName.localizedCaseInsensitiveContains(supplySearch)
        }
    }

    private var filteredEquipment: [InventoryItem] {
        if equipmentSearch.isEmpty { return viewModel.equipmentInventory }
        return viewModel.equipmentInventory.filter {
            $0.ingredientName.localizedCaseInsensitiveContains(equipmentSearch)
        }
    }

    // MARK: - Helpers

    private func formatQty(_ value: Double) -> String {
        if value.truncatingRemainder(dividingBy: 1) == 0 {
            return String(format: "%.0f", value)
        }
        return String(format: "%.1f", value)
    }
}

// MARK: - Preview

#Preview("Step 4 - Supplies & Equipment") {
    Step4SuppliesEquipmentView(viewModel: EventFormViewModel(apiClient: APIClient()))
}
