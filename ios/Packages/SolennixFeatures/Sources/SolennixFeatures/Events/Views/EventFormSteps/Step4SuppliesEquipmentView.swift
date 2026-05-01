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

                HStack {
                    Text(tr("events.form.inventory.supplies_cost", "Costo insumos"))
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(SolennixColors.textSecondary)

                    Spacer()

                    Text(formatCurrency(viewModel.suppliesCost))
                        .font(.headline)
                        .foregroundStyle(SolennixColors.primary)
                }
                .padding(Spacing.md)
                .background(SolennixColors.surfaceAlt)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
            }
        }
    }

    // MARK: - Equipment Section

    private var equipmentSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text(tr("events.form.inventory.equipment", "Equipamiento"))
                .font(.title3)
                .fontWeight(.semibold)
                .foregroundStyle(SolennixColors.text)

            if !viewModel.equipmentConflicts.isEmpty {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    HStack(spacing: Spacing.xs) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.caption)
                            .foregroundStyle(SolennixColors.error)

                        Text(tr("events.form.inventory.availability_conflicts", "Conflictos de disponibilidad"))
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundStyle(SolennixColors.error)
                    }

                    ForEach(viewModel.equipmentConflicts) { conflict in
                        Text(trf2("events.form.inventory.conflict_item", "%@ ya reservado para \"%@\"", conflict.equipmentName, conflict.eventName))
                            .font(.caption)
                            .foregroundStyle(SolennixColors.error)
                    }
                }
                .padding(Spacing.md)
                .background(SolennixColors.errorBg)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
            }

            if !viewModel.equipmentSuggestions.isEmpty {
                suggestionsBanner(
                    title: tr("events.form.inventory.suggestions", "Sugerencias por productos"),
                    chips: viewModel.equipmentSuggestions.map { suggestion in
                        let alreadyAdded = viewModel.selectedEquipment.contains { $0.inventoryId == suggestion.id }
                        return SuggestionChip(
                            id: suggestion.id,
                            label: "\(suggestion.ingredientName) (\(formatQty(suggestion.suggestedQuantity)))",
                            alreadyAdded: alreadyAdded,
                            action: { viewModel.addEquipmentFromSuggestion(suggestion) }
                        )
                    }
                )
            }

            addButton(label: tr("events.form.inventory.add_equipment", "Agregar equipamiento")) { showEquipmentPicker = true }

            if viewModel.selectedEquipment.isEmpty {
                emptyState(
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
            Text(tr("events.form.inventory.staff", "Personal"))
                .font(.title3)
                .fontWeight(.semibold)
                .foregroundStyle(SolennixColors.text)

            Step4PersonnelPanel(viewModel: viewModel)
        }
    }

    // MARK: - Shared Components

    /// Card prominente con estilo `primaryLight` — mismo patrón que StepProducts.
    private func addButton(label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: Spacing.sm) {
                Image(systemName: "plus.circle.fill")
                    .foregroundStyle(SolennixColors.primary)

                Text(label)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(SolennixColors.primary)

                Spacer()
            }
            .padding(Spacing.md)
            .background(SolennixColors.primaryLight)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.md)
                    .stroke(SolennixColors.primary.opacity(0.3), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }

    private func emptyState(icon: String, title: String, subtitle: String) -> some View {
        VStack(spacing: Spacing.sm) {
            Image(systemName: icon)
                .font(.largeTitle)
                .foregroundStyle(SolennixColors.textTertiary)

            Text(title)
                .font(.subheadline)
                .foregroundStyle(SolennixColors.textSecondary)

            Text(subtitle)
                .font(.caption)
                .foregroundStyle(SolennixColors.textTertiary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.xxl)
    }

    private struct SuggestionChip: Identifiable {
        let id: String
        let label: String
        let alreadyAdded: Bool
        let action: () -> Void
    }

    /// Banner tipo "Sugerencias por productos" con chips tipo FilterChip.
    /// Warning-tinted en ambos insumos y equipamiento — parity visual con
    /// Android y señaliza al usuario "esto viene del backend, no escribiste".
    private func suggestionsBanner(title: String, chips: [SuggestionChip]) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack(spacing: Spacing.xs) {
                Image(systemName: "lightbulb.fill")
                    .font(.caption)
                    .foregroundStyle(SolennixColors.warning)

                Text(title)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.warning)
            }

            FlowLayout(spacing: Spacing.xs) {
                ForEach(chips) { chip in
                    Button {
                        if !chip.alreadyAdded { chip.action() }
                    } label: {
                        HStack(spacing: Spacing.xs) {
                            if chip.alreadyAdded {
                                Image(systemName: "checkmark")
                                    .font(.caption2)
                            } else {
                                Image(systemName: "plus")
                                    .font(.caption2)
                            }
                            Text(chip.label)
                                .font(.caption)
                        }
                        .foregroundStyle(chip.alreadyAdded ? SolennixColors.textTertiary : SolennixColors.warning)
                        .padding(.horizontal, Spacing.sm)
                        .padding(.vertical, Spacing.xs)
                        .background(SolennixColors.warningBg.opacity(chip.alreadyAdded ? 0.5 : 1))
                        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.sm))
                    }
                    .buttonStyle(.plain)
                    .disabled(chip.alreadyAdded)
                }
            }
        }
        .padding(Spacing.md)
        .background(SolennixColors.warningBg)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
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
        NavigationStack {
            List {
                ForEach(filteredSupplies) { item in
                    Button {
                        viewModel.addSupply(item: item, suggestedQty: 1)
                        showSupplyPicker = false
                    } label: {
                        HStack(spacing: Spacing.sm) {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(item.ingredientName)
                                    .font(.body)
                                    .foregroundStyle(SolennixColors.text)

                                Text(trf2("events.form.inventory.stock_value_unit", "Stock: %@ %@", String(format: "%.1f", item.currentStock), item.unit))
                                    .font(.caption)
                                    .foregroundStyle(SolennixColors.textSecondary)
                            }

                            Spacer()

                            if let cost = item.unitCost {
                                Text(formatCurrency(cost))
                                    .font(.caption)
                                    .foregroundStyle(SolennixColors.textSecondary)
                            }

                            if viewModel.selectedSupplies.contains(where: { $0.inventoryId == item.id }) {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundStyle(SolennixColors.success)
                            }
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
            .searchable(text: $supplySearch, prompt: tr("events.form.inventory.search_supply", "Buscar insumo"))
            .navigationTitle(tr("events.form.inventory.add_supply", "Agregar insumo"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button(tr("events.detail.share.close", "Cerrar")) { showSupplyPicker = false }
                        .foregroundStyle(SolennixColors.textSecondary)
                }
            }
        }
    }

    private var equipmentPickerSheet: some View {
        NavigationStack {
            List {
                ForEach(filteredEquipment) { item in
                    Button {
                        viewModel.addEquipment(inventoryId: item.id, name: item.ingredientName, quantity: 1)
                        showEquipmentPicker = false
                    } label: {
                        HStack(spacing: Spacing.sm) {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(item.ingredientName)
                                    .font(.body)
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

// MARK: - Supply Row
//
// Subview con `item` por valor + callbacks. No indexa el array del VM en
// sus modifiers (.onChange, $bindings subscript), evita el crash de out-
// of-bounds que ocurría al tocar el trash — SwiftUI re-samplea esas
// expresiones antes de desmontar el view y el index quedaba stale.
private struct SupplyRowView: View {

    let item: SelectedSupplyItem
    let index: Int
    let unit: String
    let onRemove: () -> Void
    let onQuantityChange: (Double) -> Void
    let onSourceChange: (SupplySource) -> Void
    let onExcludeCostChange: (Bool) -> Void

    @State private var qtyText: String = ""

    private var isInteger: Bool {
        Step4SuppliesEquipmentView.isIntegerUnit(unit)
    }

    var body: some View {
        VStack(spacing: Spacing.sm) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(item.name)
                        .font(.body)
                        .fontWeight(.semibold)
                        .foregroundStyle(SolennixColors.text)

                    Text(trf("events.form.inventory.unit_cost", "%@/u", formatCurrency(item.unitCost)))
                        .font(.caption)
                        .foregroundStyle(SolennixColors.primary)
                }

                Spacer()

                Button {
                    onRemove()
                } label: {
                    Image(systemName: "trash")
                        .font(.body)
                        .foregroundStyle(SolennixColors.error)
                }
                .buttonStyle(.plain)
            }

            HStack(spacing: Spacing.md) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(tr("events.form.inventory.quantity", "Cantidad"))
                        .font(.caption2)
                        .foregroundStyle(SolennixColors.textTertiary)

                    if isInteger {
                        integerStepper
                    } else {
                        decimalField
                    }
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(tr("events.form.inventory.source", "Fuente"))
                        .font(.caption2)
                        .foregroundStyle(SolennixColors.textTertiary)

                    Picker(
                        "",
                        selection: Binding<SupplySource>(
                            get: { item.source },
                            set: { onSourceChange($0) }
                        )
                    ) {
                        Text(tr("events.form.inventory.source_stock", "Stock")).tag(SupplySource.stock)
                        Text(tr("events.form.inventory.source_purchase", "Compra")).tag(SupplySource.purchase)
                    }
                    .pickerStyle(.segmented)
                    .frame(width: 140)
                }

                Spacer()
            }

            if item.source == .stock {
                Toggle(isOn: Binding<Bool>(
                    get: { item.excludeCost },
                    set: { onExcludeCostChange($0) }
                )) {
                    Text(tr("events.form.inventory.exclude_cost", "Sin costo (reaprovechado)"))
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                }
                .tint(SolennixColors.primary)
            }
        }
        .padding(Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
        .overlay(
            RoundedRectangle(cornerRadius: CornerRadius.md)
                .stroke(SolennixColors.border, lineWidth: 1)
        )
        .onAppear { hydrate() }
        .onChange(of: item.id) { _, _ in hydrate() }
    }

    // MARK: - Subviews

    private var integerStepper: some View {
        let intValue = Int(item.quantity.rounded())
        let intBinding = Binding<Int>(
            get: { intValue },
            set: { onQuantityChange(Double($0)) }
        )
        return HStack(spacing: 0) {
            Button {
                if item.quantity > 1 {
                    onQuantityChange((item.quantity - 1).rounded())
                }
            } label: {
                Image(systemName: "minus.circle.fill")
                    .font(.title3)
                    .foregroundStyle(item.quantity > 1 ? SolennixColors.primary : SolennixColors.textTertiary)
                    .frame(width: 36, height: 36)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .disabled(item.quantity <= 1)

            EditableQuantityText(
                quantity: intBinding,
                minValue: 1,
                id: item.id,
                width: 32
            )

            Button {
                onQuantityChange((item.quantity + 1).rounded())
            } label: {
                Image(systemName: "plus.circle.fill")
                    .font(.title3)
                    .foregroundStyle(SolennixColors.primary)
                    .frame(width: 36, height: 36)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
        }
    }

    private var decimalField: some View {
        TextField(tr("events.form.inventory.quantity_placeholder", "0"), text: $qtyText)
            .keyboardType(.decimalPad)
            .font(.body)
            .foregroundStyle(SolennixColors.text)
            .padding(.horizontal, Spacing.sm)
            .padding(.vertical, 6)
            .background(SolennixColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.sm))
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.sm)
                    .stroke(SolennixColors.border, lineWidth: 1)
            )
            .frame(width: 80)
            .onChange(of: qtyText) { _, newValue in
                let normalized = newValue.replacingOccurrences(of: ",", with: ".")
                if let d = Double(normalized) {
                    onQuantityChange(d)
                }
            }
    }

    private func hydrate() {
        if isInteger {
            qtyText = String(Int(item.quantity.rounded()))
        } else {
            qtyText = item.quantity > 0 ? String(format: "%g", item.quantity) : ""
        }
    }

    private func formatCurrency(_ value: Double) -> String {
        "$\(String(format: "%.2f", value))"
    }
}

// MARK: - Equipment Row

private struct EquipmentRowView: View {

    let item: SelectedEquipmentItem
    let index: Int
    let stock: Double
    let unit: String
    let onRemove: () -> Void
    let onQuantityChange: (Int) -> Void

    private var overstock: Bool {
        Double(item.quantity) > stock && stock > 0
    }

    var body: some View {
        HStack(spacing: Spacing.md) {
            VStack(alignment: .leading, spacing: 2) {
                Text(item.name)
                    .font(.body)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.text)

                HStack(spacing: Spacing.xs) {
                    if overstock {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.caption2)
                            .foregroundStyle(SolennixColors.error)
                    }
                    Text(Step4SuppliesEquipmentView.stockLabel(stock: stock, unit: unit))
                        .font(.caption)
                        .foregroundStyle(overstock ? SolennixColors.error : SolennixColors.textSecondary)
                }
            }

            Spacer()

            HStack(spacing: 0) {
                Button {
                    if item.quantity > 1 { onQuantityChange(item.quantity - 1) }
                } label: {
                    Image(systemName: "minus.circle.fill")
                        .font(.title2)
                        .foregroundStyle(item.quantity > 1 ? SolennixColors.primary : SolennixColors.textTertiary)
                        .frame(width: 44, height: 44)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .disabled(item.quantity <= 1)

                EditableQuantityText(
                    quantity: Binding<Int>(
                        get: { item.quantity },
                        set: { onQuantityChange($0) }
                    ),
                    minValue: 1,
                    id: item.id,
                    width: 44,
                    colorOverride: overstock ? SolennixColors.error : nil
                )

                Button {
                    onQuantityChange(item.quantity + 1)
                } label: {
                    Image(systemName: "plus.circle.fill")
                        .font(.title2)
                        .foregroundStyle(SolennixColors.primary)
                        .frame(width: 44, height: 44)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }

            Button {
                onRemove()
            } label: {
                Image(systemName: "trash")
                    .font(.body)
                    .foregroundStyle(SolennixColors.error)
            }
            .buttonStyle(.plain)
            .padding(.leading, Spacing.xs)
        }
        .padding(Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
        .overlay(
            RoundedRectangle(cornerRadius: CornerRadius.md)
                .stroke(SolennixColors.border, lineWidth: 1)
        )
    }
}

// MARK: - Flow Layout

private struct FlowLayout: Layout {
    var spacing: CGFloat

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = arrangeSubviews(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = arrangeSubviews(proposal: proposal, subviews: subviews)
        for (index, position) in result.positions.enumerated() {
            subviews[index].place(at: CGPoint(x: bounds.minX + position.x, y: bounds.minY + position.y), proposal: .unspecified)
        }
    }

    private func arrangeSubviews(proposal: ProposedViewSize, subviews: Subviews) -> (size: CGSize, positions: [CGPoint]) {
        let maxWidth = proposal.width ?? .infinity
        var positions: [CGPoint] = []
        var currentX: CGFloat = 0
        var currentY: CGFloat = 0
        var rowHeight: CGFloat = 0
        var maxRowWidth: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)

            if currentX + size.width > maxWidth && currentX > 0 {
                currentX = 0
                currentY += rowHeight + spacing
                rowHeight = 0
            }

            positions.append(CGPoint(x: currentX, y: currentY))
            rowHeight = max(rowHeight, size.height)
            currentX += size.width + spacing
            maxRowWidth = max(maxRowWidth, currentX)
        }

        return (CGSize(width: maxRowWidth, height: currentY + rowHeight), positions)
    }
}

// MARK: - Preview

#Preview("Step 4 - Supplies & Equipment") {
    Step4SuppliesEquipmentView(viewModel: EventFormViewModel(apiClient: APIClient()))
}
