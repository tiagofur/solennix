import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Inventory List View

public struct InventoryListView: View {

    @Environment(\.horizontalSizeClass) private var sizeClass
    @Environment(PlanLimitsManager.self) private var planLimitsManager
    @State private var viewModel: InventoryListViewModel

    public init(apiClient: APIClient) {
        _viewModel = State(initialValue: InventoryListViewModel(apiClient: apiClient))
    }

    public var body: some View {
        VStack(spacing: 0) {
            filterBar
            content
        }
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle("Inventario")
        .navigationBarTitleDisplayMode(.large)
        .refreshable { await viewModel.loadItems() }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                HStack(spacing: Spacing.sm) {
                    NavigationLink(value: Route.inventoryForm()) {
                        Image(systemName: "plus.circle")
                            .font(.body)
                            .foregroundStyle(planLimitsManager.canCreateCatalogItem ? SolennixColors.primary : SolennixColors.textTertiary)
                            .accessibilityLabel("Agregar item de inventario")
                    }
                    .disabled(!planLimitsManager.canCreateCatalogItem)

                    lowStockToggle
                    sortMenu
                }
            }
        }
        .confirmationDialog(
            "Eliminar item",
            isPresented: $viewModel.showDeleteConfirm,
            presenting: viewModel.deleteTarget
        ) { item in
            Button("Eliminar", role: .destructive) {
                Task { await viewModel.deleteItem(item) }
            }
            Button("Cancelar", role: .cancel) {}
        } message: { item in
            Text("Estas seguro de que quieres eliminar \"\(item.ingredientName)\"? Esta accion no se puede deshacer.")
        }
        .sheet(isPresented: $viewModel.showStockAdjustment) {
            stockAdjustmentSheet
        }
        .task { 
            await viewModel.loadItems()
            await planLimitsManager.checkLimits()
        }
    }

    // MARK: - Filter Bar

    private var filterBar: some View {
        InlineFilterBar(
            placeholder: "Filtrar inventario por nombre...",
            text: $viewModel.searchText
        )
    }

    // MARK: - Content

    @ViewBuilder
    private var content: some View {
        VStack(spacing: 0) {
            if !planLimitsManager.canCreateCatalogItem {
                UpgradeBannerView(
                    type: .limitReached,
                    resource: "Catalogo",
                    currentUsage: planLimitsManager.catalogCount,
                    limit: PlanLimitsManager.catalogLimit
                ) {
                    // Action to go to Pricing
                }
                .padding(.horizontal, Spacing.md)
                .padding(.top, Spacing.sm)
            }

            if viewModel.isLoading && viewModel.items.isEmpty {
                skeletonList
            } else if viewModel.filteredItems.isEmpty && !viewModel.isLoading {
                if viewModel.searchText.isEmpty && !viewModel.showLowStockOnly {
                    EmptyStateView(
                        icon: "archivebox",
                        title: "Sin inventario",
                        message: "Agrega tu primer item al inventario",
                        actionTitle: "Nuevo Item"
                    ) {
                        // FAB handles navigation
                    }
                } else {
                    EmptyStateView(
                        icon: "magnifyingglass",
                        title: "Sin resultados",
                        message: viewModel.showLowStockOnly
                            ? "No hay items con stock bajo"
                            : "No se encontraron items que coincidan con la busqueda"
                    )
                }
            } else {
                inventoryList
            }
        } // End VStack
    }

    // MARK: - Inventory List

    @ViewBuilder
    private var inventoryList: some View {
        if sizeClass == .regular {
            inventoryGrid
        } else {
            inventoryListCompact
        }
    }

    private var inventoryGrid: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: Spacing.lg) {
                if !viewModel.ingredientItems.isEmpty {
                    inventoryGridSection(title: "Ingredientes", items: viewModel.ingredientItems)
                }
                if !viewModel.equipmentItems.isEmpty {
                    inventoryGridSection(title: "Equipo", items: viewModel.equipmentItems)
                }
                if !viewModel.supplyItems.isEmpty {
                    inventoryGridSection(title: "Insumos", items: viewModel.supplyItems)
                }
            }
            .padding(.horizontal, Spacing.md)
            .padding(.bottom, Spacing.xxl)
        }
        .background(SolennixColors.surfaceGrouped)
    }

    private func inventoryGridSection(title: String, items: [InventoryItem]) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text(title)
                .font(.headline)
                .foregroundStyle(SolennixColors.textSecondary)
                .textCase(.uppercase)
                .padding(.horizontal, Spacing.xs)

            LazyVGrid(columns: [GridItem(.adaptive(minimum: 250))], spacing: Spacing.sm) {
                ForEach(items) { item in
                    NavigationLink(value: Route.inventoryDetail(id: item.id)) {
                        inventoryCardRow(item)
                    }
                    .buttonStyle(.plain)
                    .contextMenu {
                        NavigationLink(value: Route.inventoryForm(id: item.id)) {
                            Label("Editar", systemImage: "pencil")
                        }
                        Button {
                            viewModel.prepareAdjustment(for: item)
                        } label: {
                            Label("Ajustar Stock", systemImage: "plusminus")
                        }
                        NavigationLink(value: Route.inventoryDetail(id: item.id)) {
                            Label("Ver Detalle", systemImage: "eye")
                        }
                        Divider()
                        Button(role: .destructive) {
                            HapticsHelper.play(.warning)
                            viewModel.deleteTarget = item
                            viewModel.showDeleteConfirm = true
                        } label: {
                            Label("Eliminar", systemImage: "trash")
                        }
                    }
                }
            }
        }
    }

    private func inventoryCardRow(_ item: InventoryItem) -> some View {
        HStack(spacing: Spacing.md) {
            stockIndicator(item)

            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text(item.ingredientName)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(SolennixColors.text)
                    .lineLimit(1)

                HStack(spacing: Spacing.sm) {
                    Text("\(Int(item.currentStock)) \(item.unit)")
                        .font(.caption)
                        .foregroundStyle(
                            item.currentStock < item.minimumStock
                                ? SolennixColors.error
                                : SolennixColors.textSecondary
                        )

                    if item.currentStock < item.minimumStock {
                        Text("(min: \(Int(item.minimumStock)))")
                            .font(.caption2)
                            .foregroundStyle(SolennixColors.textTertiary)
                    }
                }
            }

            Spacer()

            if let cost = item.unitCost, cost > 0 {
                Text(cost.formatted(.currency(code: "MXN")))
                    .font(.caption)
                    .foregroundStyle(SolennixColors.textSecondary)
            }
        }
        .padding(Spacing.md)
        .background(SolennixColors.card)
        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
        .shadowSm()
    }

    private var inventoryListCompact: some View {
        List {
            // Ingredients section
            if !viewModel.ingredientItems.isEmpty {
                Section("Ingredientes") {
                    ForEach(viewModel.ingredientItems) { item in
                        inventoryRow(item)
                    }
                }
            }

            // Equipment section
            if !viewModel.equipmentItems.isEmpty {
                Section("Equipo") {
                    ForEach(viewModel.equipmentItems) { item in
                        inventoryRow(item)
                    }
                }
            }

            // Supplies section
            if !viewModel.supplyItems.isEmpty {
                Section("Insumos") {
                    ForEach(viewModel.supplyItems) { item in
                        inventoryRow(item)
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .background(SolennixColors.surfaceGrouped)
    }

    // MARK: - Inventory Row

    private func inventoryRow(_ item: InventoryItem) -> some View {
        NavigationLink(value: Route.inventoryDetail(id: item.id)) {
            HStack(spacing: Spacing.md) {
                // Stock indicator
                stockIndicator(item)

                // Item info
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(item.ingredientName)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(SolennixColors.text)
                        .lineLimit(1)

                    HStack(spacing: Spacing.sm) {
                        Text("\(Int(item.currentStock)) \(item.unit)")
                            .font(.caption)
                            .foregroundStyle(
                                item.currentStock < item.minimumStock
                                    ? SolennixColors.error
                                    : SolennixColors.textSecondary
                            )

                        if item.currentStock < item.minimumStock {
                            Text("(min: \(Int(item.minimumStock)))")
                                .font(.caption2)
                                .foregroundStyle(SolennixColors.textTertiary)
                        }
                    }
                }

                Spacer()

                // Unit cost if available
                if let cost = item.unitCost, cost > 0 {
                    Text(cost.formatted(.currency(code: "MXN")))
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                }
            }
            .padding(.vertical, Spacing.xs)
        }
        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
            Button(role: .destructive) {
                HapticsHelper.play(.warning)
                viewModel.deleteTarget = item
                viewModel.showDeleteConfirm = true
            } label: {
                Label("Eliminar", systemImage: "trash")
            }

            NavigationLink(value: Route.inventoryForm(id: item.id)) {
                Label("Editar", systemImage: "pencil")
            }
            .tint(.blue)
        }
        .swipeActions(edge: .leading, allowsFullSwipe: true) {
            Button {
                viewModel.prepareAdjustment(for: item)
            } label: {
                Label("Ajustar", systemImage: "plusminus")
            }
            .tint(.orange)
        }
        .contextMenu {
            NavigationLink(value: Route.inventoryForm(id: item.id)) {
                Label("Editar", systemImage: "pencil")
            }
            Button {
                viewModel.prepareAdjustment(for: item)
            } label: {
                Label("Ajustar Stock", systemImage: "plusminus")
            }
            NavigationLink(value: Route.inventoryDetail(id: item.id)) {
                Label("Ver Detalle", systemImage: "eye")
            }
            Divider()
            Button(role: .destructive) {
                HapticsHelper.play(.warning)
                viewModel.deleteTarget = item
                viewModel.showDeleteConfirm = true
            } label: {
                Label("Eliminar", systemImage: "trash")
            }
        }
    }

    // MARK: - Stock Indicator

    private func stockIndicator(_ item: InventoryItem) -> some View {
        let isLow = item.currentStock < item.minimumStock

        return ZStack {
            Circle()
                .fill(isLow ? SolennixColors.errorBg : SolennixColors.successBg)
                .frame(width: 36, height: 36)

            Image(systemName: isLow ? "exclamationmark.triangle.fill" : "checkmark.circle.fill")
                .font(.caption)
                .foregroundStyle(isLow ? SolennixColors.error : SolennixColors.success)
        }
    }

    // MARK: - Skeleton Loading

    private var skeletonList: some View {
        List {
            Section("Ingredientes") {
                ForEach(0..<3, id: \.self) { _ in
                    skeletonRow
                }
            }
            Section("Equipo") {
                ForEach(0..<2, id: \.self) { _ in
                    skeletonRow
                }
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .background(SolennixColors.surfaceGrouped)
        .redacted(reason: .placeholder)
    }

    private var skeletonRow: some View {
        HStack(spacing: Spacing.md) {
            Circle()
                .fill(SolennixColors.surfaceAlt)
                .frame(width: 36, height: 36)

            VStack(alignment: .leading, spacing: Spacing.xs) {
                RoundedRectangle(cornerRadius: CornerRadius.sm)
                    .fill(SolennixColors.surfaceAlt)
                    .frame(width: 100, height: 14)

                RoundedRectangle(cornerRadius: CornerRadius.sm)
                    .fill(SolennixColors.surfaceAlt)
                    .frame(width: 60, height: 10)
            }

            Spacer()
        }
        .padding(.vertical, Spacing.xs)
    }

    // MARK: - Low Stock Toggle

    private var lowStockToggle: some View {
        Button {
            viewModel.showLowStockOnly.toggle()
        } label: {
            HStack(spacing: 4) {
                Image(systemName: viewModel.showLowStockOnly ? "exclamationmark.triangle.fill" : "exclamationmark.triangle")
                    .foregroundStyle(viewModel.showLowStockOnly ? SolennixColors.warning : SolennixColors.textTertiary)
                    .accessibilityLabel(viewModel.showLowStockOnly ? "Ocultar stock bajo" : "Mostrar stock bajo")

                if viewModel.lowStockCount > 0 {
                    Text("\(viewModel.lowStockCount)")
                        .font(.caption2)
                        .fontWeight(.bold)
                        .foregroundStyle(.white)
                        .padding(.horizontal, 4)
                        .padding(.vertical, 1)
                        .background(SolennixColors.error)
                        .clipShape(Capsule())
                }
            }
        }
    }

    // MARK: - Sort Menu

    private var sortMenu: some View {
        Menu {
            Picker("Ordenar por", selection: $viewModel.sortKey) {
                ForEach(InventorySortKey.allCases, id: \.self) { key in
                    Text(key.label).tag(key)
                }
            }

            Divider()

            Button {
                viewModel.sortAscending.toggle()
            } label: {
                Label(
                    viewModel.sortAscending ? "Ascendente" : "Descendente",
                    systemImage: viewModel.sortAscending ? "arrow.up" : "arrow.down"
                )
            }
        } label: {
            Image(systemName: "arrow.up.arrow.down")
                .font(.body)
                .foregroundStyle(SolennixColors.primary)
                .accessibilityLabel("Ordenar inventario")
        }
    }

    // MARK: - Stock Adjustment Sheet

    private var stockAdjustmentSheet: some View {
        NavigationStack {
            VStack(spacing: Spacing.lg) {
                if let item = viewModel.adjustmentTarget {
                    Text(item.ingredientName)
                        .font(.title3)
                        .fontWeight(.semibold)

                    Text("Stock actual: \(Int(item.currentStock)) \(item.unit)")
                        .font(.subheadline)
                        .foregroundStyle(SolennixColors.textSecondary)

                    Divider()

                    HStack {
                        Text("Nuevo stock:")

                        TextField("0", value: $viewModel.adjustmentQuantity, format: .number)
                            .keyboardType(.decimalPad)
                            .textFieldStyle(.roundedBorder)
                            .frame(width: 100)

                        Text(item.unit)
                            .foregroundStyle(SolennixColors.textSecondary)
                    }

                    // Quick adjustment buttons
                    HStack(spacing: Spacing.md) {
                        ForEach([-10, -1, 1, 10], id: \.self) { delta in
                            Button {
                                viewModel.adjustmentQuantity = max(0, viewModel.adjustmentQuantity + Double(delta))
                            } label: {
                                Text(delta > 0 ? "+\(delta)" : "\(delta)")
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                    .foregroundStyle(delta > 0 ? SolennixColors.success : SolennixColors.error)
                                    .padding(.horizontal, Spacing.md)
                                    .padding(.vertical, Spacing.sm)
                                    .background(SolennixColors.surface)
                                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }

                Spacer()
            }
            .padding(Spacing.lg)
            .navigationTitle("Ajustar Stock")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") {
                        viewModel.showStockAdjustment = false
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Guardar") {
                        Task { await viewModel.saveStockAdjustment() }
                    }
                    .fontWeight(.semibold)
                }
            }
        }
        .presentationDetents([.medium])
    }

    // MARK: - FAB

}

// MARK: - Preview

#Preview("Inventory List") {
    NavigationStack {
        InventoryListView(apiClient: APIClient())
    }
}
