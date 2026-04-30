import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Inventory List View

public struct InventoryListView: View {

    @Environment(\.horizontalSizeClass) private var sizeClass
    @Environment(CacheManager.self) private var cacheManager: CacheManager?
    @Environment(ToastManager.self) private var toastManager
    @Environment(PlanLimitsManager.self) private var planLimitsManager
    @State private var viewModel: InventoryListViewModel

    public init(apiClient: APIClient) {
        _viewModel = State(initialValue: InventoryListViewModel(apiClient: apiClient))
    }

    public var body: some View {
        content
            .background(SolennixColors.surfaceGrouped)
            .navigationTitle(InventoryStrings.title)
            .navigationBarTitleDisplayMode(.large)
            .searchable(text: $viewModel.searchText, prompt: InventoryStrings.searchPrompt)
            .safeAreaInset(edge: .top, spacing: 0) {
                VStack(spacing: 0) {
                    if viewModel.isShowingCachedData {
                        CachedDataBanner()
                    }
                    if !planLimitsManager.canCreateInventoryItem {
                        UpgradeBannerView(
                            type: .limitReached,
                            resource: InventoryStrings.inventoryResource,
                            currentUsage: planLimitsManager.inventoryCount,
                            limit: PlanLimitsManager.inventoryLimit
                        ) {
                            // Action to go to Pricing
                        }
                        .padding(.horizontal, Spacing.md)
                        .padding(.top, Spacing.sm)
                    }
                }
                .background(SolennixColors.surfaceGrouped)
            }
            .refreshable { await viewModel.loadItems() }
            .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                HStack(spacing: Spacing.sm) {
                    NavigationLink(value: Route.inventoryForm()) {
                        Image(systemName: "plus.circle")
                            .font(.body)
                            .foregroundStyle(planLimitsManager.canCreateInventoryItem ? SolennixColors.primary : SolennixColors.textTertiary)
                            .accessibilityLabel(InventoryStrings.addAccessibility)
                    }
                    .disabled(!planLimitsManager.canCreateInventoryItem)

                    lowStockToggle
                    sortMenu
                }
            }
        }
            .confirmationDialog(
                InventoryStrings.deleteTitle,
                isPresented: $viewModel.showDeleteConfirm,
                presenting: viewModel.deleteTarget
            ) { item in
                Button(InventoryStrings.deleteAction, role: .destructive) {
                    HapticsHelper.play(.success)
                    guard let removed = viewModel.softDeleteItem(item) else { return }
                    toastManager.showUndo(
                        message: InventoryStrings.deletedMessage(item.ingredientName),
                        onUndo: {
                            viewModel.restoreItem(removed.item, at: removed.index)
                            HapticsHelper.play(.success)
                        },
                        onExpire: {
                            Task { await viewModel.confirmDeleteItem(removed.item) }
                        }
                    )
                }
                Button(InventoryStrings.cancel, role: .cancel) {}
            } message: { item in
                Text(InventoryStrings.deletePrompt(item.ingredientName))
            }
            .sheet(isPresented: $viewModel.showStockAdjustment) {
                stockAdjustmentSheet
            }
            .task {
                viewModel.setCacheManager(cacheManager)
                await viewModel.loadItems()
                await planLimitsManager.checkLimits()
            }
    }

    // MARK: - Content

    @ViewBuilder
    private var content: some View {
        if let error = viewModel.errorMessage, viewModel.items.isEmpty, !viewModel.isLoading {
            EmptyStateView(
                icon: "wifi.exclamationmark",
                title: InventoryStrings.errorLoadingTitle,
                message: error,
                actionTitle: InventoryStrings.retry
            ) {
                Task { await viewModel.loadItems() }
            }
        } else if viewModel.isLoading && viewModel.items.isEmpty {
            skeletonList
        } else if viewModel.filteredItems.isEmpty && !viewModel.isLoading {
            if viewModel.searchText.isEmpty && !viewModel.showLowStockOnly {
                EmptyStateView(
                    icon: "archivebox",
                    title: InventoryStrings.emptyTitle,
                    message: InventoryStrings.emptyMessage,
                    actionTitle: InventoryStrings.emptyAction
                ) {
                    // FAB handles navigation
                }
            } else {
                EmptyStateView(
                    icon: "magnifyingglass",
                    title: InventoryStrings.filteredEmptyTitle,
                    message: viewModel.showLowStockOnly
                        ? InventoryStrings.lowStockEmptyMessage
                        : InventoryStrings.filteredEmptyMessage
                )
            }
        } else {
            inventoryList
        }
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
                    inventoryGridSection(title: InventoryStrings.ingredients, items: viewModel.ingredientItems)
                }
                if !viewModel.equipmentItems.isEmpty {
                    inventoryGridSection(title: InventoryStrings.equipment, items: viewModel.equipmentItems)
                }
                if !viewModel.supplyItems.isEmpty {
                    inventoryGridSection(title: InventoryStrings.supplies, items: viewModel.supplyItems)
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
                            Label(InventoryStrings.edit, systemImage: "pencil")
                        }
                        Button {
                            viewModel.prepareAdjustment(for: item)
                        } label: {
                            Label(InventoryStrings.adjustStock, systemImage: "plusminus")
                        }
                        NavigationLink(value: Route.inventoryDetail(id: item.id)) {
                            Label(InventoryStrings.viewDetail, systemImage: "eye")
                        }
                        Divider()
                        Button(role: .destructive) {
                            HapticsHelper.play(.warning)
                            viewModel.deleteTarget = item
                            viewModel.showDeleteConfirm = true
                        } label: {
                            Label(InventoryStrings.deleteAction, systemImage: "trash")
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
                    Text(InventoryStrings.quantityWithUnit(Int(item.currentStock), unit: item.unit))
                        .font(.caption)
                        .foregroundStyle(
                            item.minimumStock > 0 && item.currentStock < item.minimumStock
                                ? SolennixColors.error
                                : SolennixColors.textSecondary
                        )

                    if item.minimumStock > 0 && item.currentStock < item.minimumStock {
                        Text(InventoryStrings.minLabel(Int(item.minimumStock)))
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
                Section(InventoryStrings.ingredients) {
                    ForEach(viewModel.ingredientItems) { item in
                        inventoryRow(item)
                    }
                }
            }

            // Equipment section
            if !viewModel.equipmentItems.isEmpty {
                Section(InventoryStrings.equipment) {
                    ForEach(viewModel.equipmentItems) { item in
                        inventoryRow(item)
                    }
                }
            }

            // Supplies section
            if !viewModel.supplyItems.isEmpty {
                Section(InventoryStrings.supplies) {
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
                        Text(InventoryStrings.quantityWithUnit(Int(item.currentStock), unit: item.unit))
                            .font(.caption)
                            .foregroundStyle(
                                item.minimumStock > 0 && item.currentStock < item.minimumStock
                                    ? SolennixColors.error
                                    : SolennixColors.textSecondary
                            )

                        if item.minimumStock > 0 && item.currentStock < item.minimumStock {
                            Text(InventoryStrings.minLabel(Int(item.minimumStock)))
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
                Label(InventoryStrings.deleteAction, systemImage: "trash")
            }

            NavigationLink(value: Route.inventoryForm(id: item.id)) {
                Label(InventoryStrings.edit, systemImage: "pencil")
            }
            .tint(.blue)
        }
        .swipeActions(edge: .leading, allowsFullSwipe: true) {
            Button {
                viewModel.prepareAdjustment(for: item)
            } label: {
                Label(InventoryStrings.adjust, systemImage: "plusminus")
            }
            .tint(.orange)
        }
        .contextMenu {
            NavigationLink(value: Route.inventoryForm(id: item.id)) {
                Label(InventoryStrings.edit, systemImage: "pencil")
            }
            Button {
                viewModel.prepareAdjustment(for: item)
            } label: {
                Label(InventoryStrings.adjustStock, systemImage: "plusminus")
            }
            NavigationLink(value: Route.inventoryDetail(id: item.id)) {
                Label(InventoryStrings.viewDetail, systemImage: "eye")
            }
            Divider()
            Button(role: .destructive) {
                HapticsHelper.play(.warning)
                viewModel.deleteTarget = item
                viewModel.showDeleteConfirm = true
            } label: {
                Label(InventoryStrings.deleteAction, systemImage: "trash")
            }
        }
    }

    // MARK: - Stock Indicator

    private func stockIndicator(_ item: InventoryItem) -> some View {
        let isLow = item.minimumStock > 0 && item.currentStock < item.minimumStock

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
            Section(InventoryStrings.ingredients) {
                ForEach(0..<3, id: \.self) { _ in
                    skeletonRow
                }
            }
            Section(InventoryStrings.equipment) {
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
                    .accessibilityLabel(viewModel.showLowStockOnly ? InventoryStrings.hideLowStock : InventoryStrings.showLowStock)

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
            Picker(InventoryStrings.sortTitle, selection: $viewModel.sortKey) {
                ForEach(InventorySortKey.allCases, id: \.self) { key in
                    Text(key.label).tag(key)
                }
            }

            Divider()

            Button {
                viewModel.sortAscending.toggle()
            } label: {
                Label(
                    viewModel.sortAscending ? InventoryStrings.sortAscending : InventoryStrings.sortDescending,
                    systemImage: viewModel.sortAscending ? "arrow.up" : "arrow.down"
                )
            }
        } label: {
            Image(systemName: "arrow.up.arrow.down")
                .font(.body)
                .foregroundStyle(SolennixColors.primary)
                .accessibilityLabel(InventoryStrings.sortAccessibility)
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

                    Text(InventoryStrings.stockActual(Int(item.currentStock), unit: item.unit))
                        .font(.subheadline)
                        .foregroundStyle(SolennixColors.textSecondary)

                    Divider()

                    HStack {
                        Text(InventoryStrings.newStock)

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
            .navigationTitle(InventoryStrings.adjustStock)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(InventoryStrings.cancel) {
                        viewModel.showStockAdjustment = false
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(InventoryStrings.save) {
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
