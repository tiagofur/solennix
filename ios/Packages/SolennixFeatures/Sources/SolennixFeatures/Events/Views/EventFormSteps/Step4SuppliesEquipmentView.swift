import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Step 4: Supplies + Equipment

struct Step4SuppliesEquipmentView: View {

    @Bindable var viewModel: EventFormViewModel

    @State private var showSupplyPicker = false
    @State private var showEquipmentPicker = false
    @State private var supplySearch = ""
    @State private var equipmentSearch = ""

    var body: some View {
        ScrollView {
            VStack(spacing: Spacing.lg) {
                // Supplies section
                suppliesSection

                Divider()
                    .foregroundStyle(SolennixColors.border)
                    .padding(.vertical, Spacing.xs)

                // Equipment section
                equipmentSection
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
    }

    // MARK: - Supplies Section

    private var suppliesSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Insumos")
                .font(.headline)
                .foregroundStyle(SolennixColors.text)

            // Supply suggestions banner
            if !viewModel.supplySuggestions.isEmpty {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    HStack(spacing: Spacing.xs) {
                        Image(systemName: "lightbulb.fill")
                            .font(.caption)
                            .foregroundStyle(SolennixColors.warning)

                        Text("Insumos sugeridos")
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundStyle(SolennixColors.warning)
                    }

                    FlowLayout(spacing: Spacing.xs) {
                        ForEach(viewModel.supplySuggestions) { suggestion in
                            Button {
                                if let item = viewModel.supplyInventory.first(where: { $0.id == suggestion.inventoryId }) {
                                    viewModel.addSupply(item: item, suggestedQty: suggestion.suggestedQty)
                                }
                            } label: {
                                HStack(spacing: Spacing.xs) {
                                    Text(suggestion.name)
                                        .font(.caption)

                                    Text("(\(String(format: "%.0f", suggestion.suggestedQty)))")
                                        .font(.caption2)

                                    Image(systemName: "plus")
                                        .font(.caption2)
                                }
                                .foregroundStyle(SolennixColors.warning)
                                .padding(.horizontal, Spacing.sm)
                                .padding(.vertical, Spacing.xs)
                                .background(SolennixColors.warningBg)
                                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.sm))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                .padding(Spacing.md)
                .background(SolennixColors.warningBg)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
            }

            // Selected supplies
            ForEach(Array(viewModel.selectedSupplies.enumerated()), id: \.element.id) { index, item in
                supplyRow(item: item, index: index)
            }

            // Add supply button
            Button {
                showSupplyPicker = true
            } label: {
                HStack(spacing: Spacing.sm) {
                    Image(systemName: "plus.circle.fill")
                        .foregroundStyle(SolennixColors.primary)

                    Text("Agregar Insumo")
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

            // Supplies cost total
            if !viewModel.selectedSupplies.isEmpty {
                HStack {
                    Text("Costo Insumos")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(SolennixColors.textSecondary)

                    Spacer()

                    Text(formatCurrency(viewModel.suppliesCost))
                        .font(.headline)
                        .foregroundStyle(SolennixColors.text)
                }
                .padding(Spacing.md)
                .background(SolennixColors.surface)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
            }
        }
    }

    // MARK: - Supply Row

    private func supplyRow(item: SelectedSupplyItem, index: Int) -> some View {
        VStack(spacing: Spacing.sm) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(item.name)
                        .font(.body)
                        .fontWeight(.medium)
                        .foregroundStyle(SolennixColors.text)

                    Text("$\(String(format: "%.2f", item.unitCost))/u")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                }

                Spacer()

                Button {
                    viewModel.removeSupply(at: index)
                } label: {
                    Image(systemName: "trash")
                        .font(.body)
                        .foregroundStyle(SolennixColors.error)
                }
                .buttonStyle(.plain)
            }

            HStack(spacing: Spacing.md) {
                // Quantity
                VStack(alignment: .leading, spacing: 2) {
                    Text("Cantidad")
                        .font(.caption2)
                        .foregroundStyle(SolennixColors.textTertiary)

                    TextField("0", value: $viewModel.selectedSupplies[index].quantity, format: .number.precision(.fractionLength(1)))
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
                }

                // Source toggle
                VStack(alignment: .leading, spacing: 2) {
                    Text("Fuente")
                        .font(.caption2)
                        .foregroundStyle(SolennixColors.textTertiary)

                    Picker("", selection: $viewModel.selectedSupplies[index].source) {
                        Text("Stock").tag(SupplySource.stock)
                        Text("Compra").tag(SupplySource.purchase)
                    }
                    .pickerStyle(.segmented)
                    .frame(width: 140)
                    .onChange(of: viewModel.selectedSupplies[index].source) { _, newSource in
                        if newSource == .purchase {
                            viewModel.selectedSupplies[index].excludeCost = false
                        }
                    }
                }

                Spacer()
            }

            // Exclude cost toggle — only for stock supplies (reused/leftover)
            if viewModel.selectedSupplies[index].source == .stock {
                Toggle(isOn: $viewModel.selectedSupplies[index].excludeCost) {
                    Text("Sin costo (reaprovechado)")
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
    }

    // MARK: - Equipment Section

    private var equipmentSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("Equipo")
                .font(.headline)
                .foregroundStyle(SolennixColors.text)

            // Conflict warnings
            if !viewModel.equipmentConflicts.isEmpty {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    HStack(spacing: Spacing.xs) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.caption)
                            .foregroundStyle(SolennixColors.error)

                        Text("Conflictos de disponibilidad")
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundStyle(SolennixColors.error)
                    }

                    ForEach(viewModel.equipmentConflicts) { conflict in
                        Text("\(conflict.equipmentName) ya reservado para \"\(conflict.eventName)\"")
                            .font(.caption)
                            .foregroundStyle(SolennixColors.error)
                    }
                }
                .padding(Spacing.md)
                .background(SolennixColors.errorBg)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
            }

            // Equipment suggestions
            if !viewModel.equipmentSuggestions.isEmpty {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    HStack(spacing: Spacing.xs) {
                        Image(systemName: "wand.and.stars")
                            .font(.caption)
                            .foregroundStyle(SolennixColors.info)

                        Text("Equipo sugerido")
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundStyle(SolennixColors.info)
                    }

                    FlowLayout(spacing: Spacing.xs) {
                        ForEach(viewModel.equipmentSuggestions) { suggestion in
                            Button {
                                viewModel.addEquipment(
                                    inventoryId: suggestion.inventoryId,
                                    name: suggestion.name,
                                    quantity: suggestion.suggestedQty
                                )
                            } label: {
                                HStack(spacing: Spacing.xs) {
                                    Text(suggestion.name)
                                        .font(.caption)

                                    Text("(\(suggestion.suggestedQty))")
                                        .font(.caption2)

                                    Image(systemName: "plus")
                                        .font(.caption2)
                                }
                                .foregroundStyle(SolennixColors.info)
                                .padding(.horizontal, Spacing.sm)
                                .padding(.vertical, Spacing.xs)
                                .background(SolennixColors.infoBg)
                                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.sm))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
                .padding(Spacing.md)
                .background(SolennixColors.infoBg)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
            }

            // Selected equipment
            ForEach(Array(viewModel.selectedEquipment.enumerated()), id: \.element.id) { index, item in
                equipmentRow(item: item, index: index)
            }

            // Add equipment button
            Button {
                showEquipmentPicker = true
            } label: {
                HStack(spacing: Spacing.sm) {
                    Image(systemName: "plus.circle.fill")
                        .foregroundStyle(SolennixColors.primary)

                    Text("Agregar Equipo")
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
    }

    // MARK: - Equipment Row

    private func equipmentRow(item: SelectedEquipmentItem, index: Int) -> some View {
        HStack(spacing: Spacing.md) {
            VStack(alignment: .leading, spacing: 2) {
                Text(item.name)
                    .font(.body)
                    .fontWeight(.medium)
                    .foregroundStyle(SolennixColors.text)
            }

            Spacer()

            // Quantity
            HStack(spacing: Spacing.sm) {
                Button {
                    if viewModel.selectedEquipment[index].quantity > 1 {
                        viewModel.selectedEquipment[index].quantity -= 1
                    }
                } label: {
                    Image(systemName: "minus.circle")
                        .font(.body)
                        .foregroundStyle(item.quantity > 1 ? SolennixColors.primary : SolennixColors.textTertiary)
                }
                .buttonStyle(.plain)
                .disabled(item.quantity <= 1)

                Text("\(item.quantity)")
                    .font(.body)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.text)
                    .frame(minWidth: 24)

                Button {
                    viewModel.selectedEquipment[index].quantity += 1
                } label: {
                    Image(systemName: "plus.circle")
                        .font(.body)
                        .foregroundStyle(SolennixColors.primary)
                }
                .buttonStyle(.plain)
            }

            Button {
                viewModel.removeEquipment(at: index)
            } label: {
                Image(systemName: "trash")
                    .font(.body)
                    .foregroundStyle(SolennixColors.error)
            }
            .buttonStyle(.plain)
        }
        .padding(Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
        .overlay(
            RoundedRectangle(cornerRadius: CornerRadius.md)
                .stroke(SolennixColors.border, lineWidth: 1)
        )
    }

    // MARK: - Supply Picker Sheet

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

                                Text("Stock: \(String(format: "%.1f", item.currentStock)) \(item.unit)")
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
            .searchable(text: $supplySearch, prompt: "Buscar insumo")
            .navigationTitle("Agregar Insumo")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cerrar") {
                        showSupplyPicker = false
                    }
                    .foregroundStyle(SolennixColors.textSecondary)
                }
            }
        }
    }

    // MARK: - Equipment Picker Sheet

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

                                Text("Disponible: \(String(format: "%.0f", item.currentStock)) \(item.unit)")
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
            .searchable(text: $equipmentSearch, prompt: "Buscar equipo")
            .navigationTitle("Agregar Equipo")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cerrar") {
                        showEquipmentPicker = false
                    }
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
