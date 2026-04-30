import SwiftUI
import SolennixCore
import SolennixDesign

// MARK: - Recipe Section

/// A collapsible section for managing recipe items (ingredients, equipment, or supplies)
public struct RecipeSection: View {

    let title: String
    let description: String
    let items: [RecipeItem]
    let inventoryItems: [InventoryItem]
    let onAdd: () -> Void
    let onRemove: (Int) -> Void
    let onSelectInventory: (Int, String) -> Void
    let onUpdateQuantity: (Int, Double) -> Void
    let showCost: Bool

    public init(
        title: String,
        description: String,
        items: [RecipeItem],
        inventoryItems: [InventoryItem],
        onAdd: @escaping () -> Void,
        onRemove: @escaping (Int) -> Void,
        onSelectInventory: @escaping (Int, String) -> Void,
        onUpdateQuantity: @escaping (Int, Double) -> Void,
        showCost: Bool = false
    ) {
        self.title = title
        self.description = description
        self.items = items
        self.inventoryItems = inventoryItems
        self.onAdd = onAdd
        self.onRemove = onRemove
        self.onSelectInventory = onSelectInventory
        self.onUpdateQuantity = onUpdateQuantity
        self.showCost = showCost
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            // Header
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.headline)
                        .foregroundStyle(SolennixColors.text)

                    Text(description)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textTertiary)
                }

                Spacer()

                Button(action: onAdd) {
                    HStack(spacing: 4) {
                        Image(systemName: "plus")
                        Text(ProductStrings.add)
                    }
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.primary)
                    .padding(.horizontal, Spacing.sm)
                    .padding(.vertical, Spacing.xs)
                    .background(SolennixColors.primaryLight)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                }
                .buttonStyle(.plain)
            }

            // Items
            if items.isEmpty {
                Text(ProductStrings.noItemsAdded)
                    .font(.body)
                    .foregroundStyle(SolennixColors.textTertiary)
                    .italic()
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.md)
            } else {
                ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
                    RecipeItemRow(
                        item: item,
                        inventoryItems: inventoryItems,
                        showCost: showCost,
                        onSelectInventory: { inventoryId in
                            onSelectInventory(index, inventoryId)
                        },
                        onUpdateQuantity: { quantity in
                            onUpdateQuantity(index, quantity)
                        },
                        onRemove: {
                            onRemove(index)
                        }
                    )

                    if index < items.count - 1 {
                        Divider()
                    }
                }
            }
        }
        .padding(Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
        .shadow(color: .black.opacity(0.05), radius: 2, x: 0, y: 1)
    }
}

// MARK: - Recipe Item Row

struct RecipeItemRow: View {

    let item: RecipeItem
    let inventoryItems: [InventoryItem]
    let showCost: Bool
    let onSelectInventory: (String) -> Void
    let onUpdateQuantity: (Double) -> Void
    let onRemove: () -> Void

    @State private var quantityText: String = ""
    @State private var showPicker = false

    private var selectedItem: InventoryItem? {
        inventoryItems.first { $0.id == item.inventoryId }
    }

    private var estimatedCost: Double? {
        guard let inv = selectedItem, let cost = inv.unitCost, cost > 0 else { return nil }
        return item.quantityRequired * cost
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            // Inventory selector button
            Button {
                showPicker = true
            } label: {
                HStack(spacing: Spacing.sm) {
                    Image(systemName: "archivebox")
                        .font(.body)
                        .foregroundStyle(selectedItem != nil ? SolennixColors.primary : SolennixColors.textTertiary)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(selectedItem?.ingredientName ?? ProductStrings.selectItem)
                            .font(.subheadline)
                            .foregroundStyle(selectedItem != nil ? SolennixColors.text : SolennixColors.textTertiary)

                        if let inv = selectedItem {
                            HStack(spacing: Spacing.sm) {
                                Text(ProductStrings.stockWithUnit(Int(inv.currentStock), unit: inv.unit))
                                    .font(.caption)
                                    .foregroundStyle(SolennixColors.textSecondary)

                                if showCost, let cost = inv.unitCost, cost > 0 {
                                    Text(ProductStrings.costPerUnit(cost.formatted(.currency(code: "MXN")), unit: inv.unit))
                                        .font(.caption)
                                        .foregroundStyle(SolennixColors.textSecondary)
                                }
                            }
                        }
                    }

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textTertiary)
                }
                .padding(Spacing.sm)
                .background(SolennixColors.surface)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                .overlay(
                    RoundedRectangle(cornerRadius: CornerRadius.md)
                        .stroke(SolennixColors.border, lineWidth: 1)
                )
            }
            .buttonStyle(.plain)
            .sheet(isPresented: $showPicker) {
                InventoryPickerSheet(
                    inventoryItems: inventoryItems,
                    selectedId: item.inventoryId,
                    showCost: showCost,
                    onSelect: { inventoryId in
                        onSelectInventory(inventoryId)
                        showPicker = false
                    }
                )
                .presentationDetents([.medium, .large])
            }

            // Quantity, cost, and remove
            HStack(spacing: Spacing.sm) {
                VStack(alignment: .leading, spacing: 2) {
                        Text(ProductStrings.quantity)
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textTertiary)

                    HStack(spacing: Spacing.xs) {
                        TextField("1", text: $quantityText)
                            .keyboardType(.decimalPad)
                            .textFieldStyle(.roundedBorder)
                            .frame(width: 60)
                            .onChange(of: quantityText) { _, newValue in
                                if let value = Double(newValue) {
                                    onUpdateQuantity(value)
                                }
                            }

                        if let unit = item.unit {
                            Text(unit)
                                .font(.caption)
                                .foregroundStyle(SolennixColors.textTertiary)
                        }
                    }
                }

                if showCost, let cost = estimatedCost {
                    Spacer()
                    VStack(alignment: .trailing, spacing: 2) {
                        Text(ProductStrings.estimatedCostShort)
                            .font(.caption)
                            .foregroundStyle(SolennixColors.textTertiary)
                        Text(cost.formatted(.currency(code: "MXN")))
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundStyle(SolennixColors.text)
                    }
                }

                Spacer()

                Button(action: onRemove) {
                    Image(systemName: "trash")
                        .foregroundStyle(SolennixColors.error)
                        .padding(Spacing.xs)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.vertical, Spacing.xs)
        .onAppear {
            quantityText = String(format: "%.0f", item.quantityRequired)
        }
    }
}

// MARK: - Inventory Picker Sheet

private struct InventoryPickerSheet: View {

    let inventoryItems: [InventoryItem]
    let selectedId: String
    let showCost: Bool
    let onSelect: (String) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var searchText = ""

    private var filteredItems: [InventoryItem] {
        if searchText.isEmpty { return inventoryItems }
        return inventoryItems.filter {
            $0.ingredientName.localizedCaseInsensitiveContains(searchText)
        }
    }

    var body: some View {
        NavigationStack {
            List(filteredItems) { item in
                Button {
                    onSelect(item.id)
                } label: {
                    HStack(spacing: Spacing.sm) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(item.ingredientName)
                                .font(.body)
                                .foregroundStyle(SolennixColors.text)

                            Text(ProductStrings.stockWithUnit(Int(item.currentStock), unit: item.unit))
                                .font(.caption)
                                .foregroundStyle(SolennixColors.textSecondary)
                        }

                        Spacer()

                        if showCost, let cost = item.unitCost, cost > 0 {
                            Text(cost.formatted(.currency(code: "MXN")))
                                .font(.caption)
                                .foregroundStyle(SolennixColors.textSecondary)
                        }

                        if item.id == selectedId {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(SolennixColors.success)
                        }
                    }
                }
                .buttonStyle(.plain)
            }
            .listStyle(.insetGrouped)
            .scrollContentBackground(.hidden)
            .background(SolennixColors.surfaceGrouped)
            .searchable(text: $searchText, prompt: ProductStrings.searchItemPrompt)
            .navigationTitle(ProductStrings.selectItemTitle)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button(ProductStrings.cancel) { dismiss() }
                }
            }
        }
    }
}

// MARK: - Preview

#Preview("Recipe Section") {
    RecipeSection(
        title: "Composicion / Insumos",
        description: "Solo insumos generan costo al producto.",
        items: [
            RecipeItem(inventoryId: "1", quantityRequired: 2, inventoryName: "Harina", unit: "kg", type: .ingredient),
            RecipeItem(inventoryId: "2", quantityRequired: 1, inventoryName: "Azucar", unit: "kg", type: .ingredient)
        ],
        inventoryItems: [
            InventoryItem(id: "1", userId: "", ingredientName: "Harina", currentStock: 10, minimumStock: 5, unit: "kg", unitCost: 25.0, lastUpdated: "", type: .ingredient),
            InventoryItem(id: "2", userId: "", ingredientName: "Azucar", currentStock: 8, minimumStock: 3, unit: "kg", unitCost: 30.0, lastUpdated: "", type: .ingredient),
            InventoryItem(id: "3", userId: "", ingredientName: "Sal", currentStock: 5, minimumStock: 2, unit: "kg", unitCost: 15.0, lastUpdated: "", type: .ingredient)
        ],
        onAdd: {},
        onRemove: { _ in },
        onSelectInventory: { _, _ in },
        onUpdateQuantity: { _, _ in },
        showCost: true
    )
    .padding()
}
