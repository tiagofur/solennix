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
            Text(tr("events.form.inventory.supplies", "Insumos"))
                .font(.title3)
                .fontWeight(.semibold)
                .foregroundStyle(SolennixColors.text)

            if !viewModel.supplySuggestions.isEmpty {
                suggestionsBanner(
                    title: tr("events.form.inventory.suggestions", "Sugerencias por productos"),
                    chips: viewModel.supplySuggestions.map { suggestion in
                        let alreadyAdded = viewModel.selectedSupplies.contains { $0.inventoryId == suggestion.id }
                        return SuggestionChip(
                            id: suggestion.id,
                            label: "\(suggestion.ingredientName) (\(formatQty(suggestion.suggestedQuantity)))",
                            alreadyAdded: alreadyAdded,
                            action: { viewModel.addSupplyFromSuggestion(suggestion) }
                        )
                    }
                )
            }

            addButton(label: tr("events.form.inventory.add_supply", "Agregar insumo")) { showSupplyPicker = true }

            if viewModel.selectedSupplies.isEmpty {
                emptyState(
                    icon: "shippingbox",
                    title: tr("events.form.inventory.empty_supplies_title", "Sin insumos (opcional)"),
                    subtitle: tr("events.form.inventory.empty_supplies_desc", "Agrega consumibles del inventario")
                )
                                    .foregroundStyle(SolennixColors.text)

                                Text(trf2("events.form.inventory.available_value_unit", "Disponible: %@ %@", String(format: "%.0f", item.currentStock), item.unit))
                                    .font(.caption)
                                    .foregroundStyle(SolennixColors.textSecondary)
                            }

                            Spacer()

                            if viewModel.selectedEquipment.contains(where: { $0.inventoryId == item.id }) {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundStyle(SolennixColors.success)
                            }
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
            .searchable(text: $equipmentSearch, prompt: tr("events.form.inventory.search_equipment", "Buscar equipo"))
            .navigationTitle(tr("events.form.inventory.add_equipment", "Agregar equipamiento"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button(tr("events.detail.share.close", "Cerrar")) { showEquipmentPicker = false }
                        .foregroundStyle(SolennixColors.textSecondary)
                }
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

    private func formatCurrency(_ value: Double) -> String {
        "$\(String(format: "%.2f", value))"
    }

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
