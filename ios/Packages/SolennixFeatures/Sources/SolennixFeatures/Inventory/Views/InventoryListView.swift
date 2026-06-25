import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Inventory List View

public struct InventoryListView: View {

    @Environment(\.horizontalSizeClass) private var sizeClass
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
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
            // Fix 7: sensory feedback when delete confirmation appears (true only)
            .sensoryFeedback(.warning, trigger: viewModel.showDeleteConfirm) { _, newValue in newValue }
            .navigationTitle(InventoryStrings.title)
            .navigationBarTitleDisplayMode(.large)
            .solennixSearchable(text: $viewModel.searchText, prompt: InventoryStrings.searchPrompt)
            .safeAreaInset(edge: .top, spacing: 0) {
                VStack(spacing: 0) {
                    if viewModel.isShowingCachedData {
                        CachedDataBanner()
                    }
                    if !planLimitsManager.canCreateInventoryItem {
                        // Fix 14: wrap in NavigationLink(value: Route.pricing) so the banner
                        // CTA navigates to PricingView — same pattern as ClientDetailView.
                        NavigationLink(value: Route.pricing) {
                            UpgradeBannerView(
                                type: .limitReached,
                                resource: InventoryStrings.inventoryResource,
                                currentUsage: planLimitsManager.inventoryCount,
                                limit: PlanLimitsManager.inventoryLimit,
                                ctaLabel: InventoryStrings.upgradeCta
                            )
                        }
                        .buttonStyle(.plain)
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
                        // 1. Create
                        NavigationLink(value: Route.inventoryForm()) {
                            Image(systemName: "plus")
                                .font(.body)
                                .foregroundStyle(planLimitsManager.canCreateInventoryItem ? SolennixColors.primary : SolennixColors.textTertiary)
                                .accessibilityLabel(InventoryStrings.addAccessibility)
                        }
                        .disabled(!planLimitsManager.canCreateInventoryItem)

                        // 2. Sort
                        sortMenu

                        // 3. Filters
                        lowStockToggle

                        Menu {
                            Picker(InventoryStrings.scopeFilterAccessibility, selection: $viewModel.scope) {
                                ForEach(InventoryScope.allCases, id: \.self) { s in
                                    Text(s.label).tag(s)
                                }
                            }
                            .pickerStyle(.inline)
                        } label: {
                            Image(systemName: viewModel.scope != .all ? "line.3.horizontal.decrease.circle.fill" : "line.3.horizontal.decrease.circle")
                                .font(.body)
                                .foregroundStyle(SolennixColors.primary)
                                .symbolEffect(.bounce, value: viewModel.scope)
                                .accessibilityLabel(InventoryStrings.scopeFilterAccessibility)
                        }
                    }
                }
            }
            .confirmationDialog(
                InventoryStrings.deleteTitle,
                isPresented: $viewModel.showDeleteConfirm,
                presenting: viewModel.deleteTarget
            ) { item in
                Button(InventoryStrings.deleteAction, role: .destructive) {
                    guard let removed = viewModel.softDeleteItem(item) else { return }
                    HapticsHelper.play(.success)
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
        if sizeClass == .regular {
            inventoryGrid
        } else {
            // Fix 1, 3, 4: iPhone path uses a single List — skeleton rows inside,
            // no full-screen List swap, eliminates jump.
            inventoryListCompact
        }
    }

    // MARK: - iPad Grid

    private var inventoryGrid: some View {
        ScrollView {
            if viewModel.isLoading && viewModel.items.isEmpty {
                ProgressView()
                    .controlSize(.large)
                    .tint(SolennixColors.primary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.xxxl)
            } else if viewModel.filteredItems.isEmpty && !viewModel.isLoading {
                if viewModel.searchText.isEmpty && !viewModel.showLowStockOnly {
                    if viewModel.scope == .all {
                        ipadFirstRunEmptyState
                    } else {
                        EmptyStateView(
                            icon: "archivebox",
                            title: viewModel.scopedEmptyTitle,
                            message: viewModel.scopedEmptyMessage,
                            iconColor: SolennixColors.primary
                        )
                    }
                } else {
                    EmptyStateView(
                        icon: "magnifyingglass",
                        title: InventoryStrings.filteredEmptyTitle,
                        message: viewModel.showLowStockOnly
                            ? InventoryStrings.lowStockEmptyMessage
                            : InventoryStrings.filteredEmptyMessage,
                        iconColor: SolennixColors.primary
                    )
                }
            } else {
                // Single flat section — server already filtered by scope
                LazyVStack(alignment: .leading, spacing: Spacing.lg) {
                    inventoryGridSection(
                        title: viewModel.scope == .all ? nil : viewModel.scope.label,
                        items: viewModel.filteredItems
                    )
                }
                .padding(.horizontal, Spacing.lg)
                .padding(.vertical, Spacing.lg)
                .padding(.bottom, Spacing.xxl)

                if viewModel.isLoadingMore {
                    HStack {
                        Spacer()
                        ProgressView()
                        Spacer()
                    }
                    .padding(.vertical, Spacing.md)
                }
            }
        }
        .background(SolennixColors.surfaceGrouped)
    }



    // Fix 13: aligned to system grouped-header styling (footnote/semibold/secondary)
    private func inventoryGridSection(title: String?, items: [InventoryItem]) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            if let title {
                Text(title)
                    .font(.footnote)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.textSecondary)
                    .textCase(.uppercase)
                    .padding(.horizontal, Spacing.xs)
            }

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
                    // Fix 5c / R2: pagination trigger on the global last item regardless of section
                    .task {
                        if item == viewModel.filteredItems.last {
                            await viewModel.loadNextPage()
                        }
                    }
                }
            }
        }
    }

    private func inventoryCardRow(_ item: InventoryItem) -> some View {
        let isLow = item.minimumStock > 0 && item.currentStock < item.minimumStock
        let showTypeChip = viewModel.scope == .all

        return HStack(spacing: Spacing.md) {
            stockIndicator(item)

            VStack(alignment: .leading, spacing: Spacing.xs) {
                HStack(spacing: Spacing.xs) {
                    Text(item.ingredientName)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(SolennixColors.text)
                        .lineLimit(1)

                    if showTypeChip {
                        ipadTypeChip(item.type)
                    }
                }

                HStack(spacing: Spacing.sm) {
                    Text(InventoryStrings.quantityWithUnit(Int(item.currentStock), unit: item.unit))
                        .font(.caption)
                        .foregroundStyle(
                            isLow ? SolennixColors.error : SolennixColors.textSecondary
                        )

                    if isLow {
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
        .solennixCard(radius: CornerRadius.lg, border: false)
    }

    /// Tonal type badge for iPad grid cards (Todos scope).
    private func ipadTypeChip(_ type: InventoryType) -> some View {
        let (icon, color) = gridTypeIconAndColor(type)
        return Image(systemName: icon)
            .font(.caption2)
            .foregroundStyle(color)
            .padding(4)
            .background(color.opacity(0.12))
            .clipShape(Circle())
            .accessibilityHidden(true)
    }

    private func gridTypeIconAndColor(_ type: InventoryType) -> (String, Color) {
        switch type {
        case .ingredient: return ("leaf.fill", SolennixColors.success)
        case .equipment:  return ("wrench.and.screwdriver.fill", SolennixColors.primary)
        case .supply:     return ("shippingbox.fill", SolennixColors.accent)
        }
    }

    // Fix 4: first-run CTA for iPad grid
    private var ipadFirstRunEmptyState: some View {
        VStack(spacing: 0) {
            EmptyStateView(
                icon: "archivebox",
                title: InventoryStrings.emptyTitle,
                message: InventoryStrings.emptyMessage,
                iconColor: SolennixColors.primary
            )
            NavigationLink(value: Route.inventoryForm()) {
                Text(InventoryStrings.emptyAction)
                    .font(.headline)
                    .foregroundStyle(SolennixColors.primaryDark)
                    .padding(.horizontal, Spacing.xl)
                    .padding(.vertical, 16)
                    .background(SolennixColors.primaryLight)
                    .clipShape(Capsule())
                    .adaptiveGlass(in: Capsule(), fallback: .material)
            }
            .padding(.bottom, Spacing.xxl)
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - iPhone Compact List (Fix 1, 3, 4, 5)

    @ViewBuilder
    private var inventoryListCompact: some View {
        if let error = viewModel.errorMessage, viewModel.items.isEmpty, !viewModel.isLoading {
            // Error state — outside List for proper centering
            EmptyStateView(
                icon: "wifi.exclamationmark",
                title: InventoryStrings.errorLoadingTitle,
                message: error,
                actionTitle: InventoryStrings.retry,
                iconColor: SolennixColors.primary
            ) {
                Task { await viewModel.loadItems() }
            }
        } else if viewModel.isLoading && viewModel.items.isEmpty {
            // Fix 3: skeleton rows inside the same List — no jump
            List {
                inventorySkeletonRows
            }
            .listStyle(.insetGrouped)
            .solennixListStyle()
        } else if viewModel.filteredItems.isEmpty && !viewModel.isLoading {
            // Empty states — outside List for proper centering
            if viewModel.searchText.isEmpty && !viewModel.showLowStockOnly {
                if viewModel.scope == .all {
                    inventoryFirstRunEmptyState
                } else {
                    EmptyStateView(
                        icon: "archivebox",
                        title: viewModel.scopedEmptyTitle,
                        message: viewModel.scopedEmptyMessage,
                        iconColor: SolennixColors.primary
                    )
                }
            } else {
                EmptyStateView(
                    icon: "magnifyingglass",
                    title: InventoryStrings.filteredEmptyTitle,
                    message: viewModel.showLowStockOnly
                        ? InventoryStrings.lowStockEmptyMessage
                        : InventoryStrings.filteredEmptyMessage,
                    iconColor: SolennixColors.primary
                )
            }
        } else {
            List {
                Section {
                    ForEach(viewModel.filteredItems) { item in
                        inventoryRow(item)
                    }
                }

                // Fix 5b: ProgressView footer row while loading more
                if viewModel.isLoadingMore {
                    HStack {
                        Spacer()
                        ProgressView()
                        Spacer()
                    }
                    .listRowSeparator(.hidden)
                    .listRowBackground(Color.clear)
                }
            }
            .listStyle(.insetGrouped)
            .solennixListStyle()
        }
    }



    // MARK: - First-Run Empty State (Fix 4) — outside List for proper centering

    /// Working NavigationLink CTA for the truly-empty state.
    private var inventoryFirstRunEmptyState: some View {
        VStack(spacing: 0) {
            EmptyStateView(
                icon: "archivebox",
                title: InventoryStrings.emptyTitle,
                message: InventoryStrings.emptyMessage,
                iconColor: SolennixColors.primary
            )
            NavigationLink(value: Route.inventoryForm()) {
                Text(InventoryStrings.emptyAction)
                    .font(.headline)
                    .foregroundStyle(SolennixColors.primaryDark)
                    .padding(.horizontal, Spacing.xl)
                    .padding(.vertical, 16)
                    .background(SolennixColors.primaryLight)
                    .clipShape(Capsule())
                    .adaptiveGlass(in: Capsule(), fallback: .material)
            }
            .padding(.bottom, Spacing.xxl)
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Skeleton Rows (Fix 3)

    /// Per-row skeletons inside the same List — no full-screen List swap.
    @ViewBuilder
    private var inventorySkeletonRows: some View {
        Section {
            ForEach(0..<5, id: \.self) { _ in
                InventorySkeletonRow()
                    .solennixRow()
                    .listRowSeparatorTint(SolennixColors.primary.opacity(0.2))
                    .accessibilityHidden(true)
            }
        }
    }

    // MARK: - Inventory Row (Fix 1, 2, 5, 6, 8, 9)

    private func inventoryRow(_ item: InventoryItem) -> some View {
        let isLow = item.minimumStock > 0 && item.currentStock < item.minimumStock
        // Show type chip when viewing all types so each row is self-identifying
        let showTypeChip = viewModel.scope == .all

        return ZStack {
            // Fix 1: plain content (no NavigationLink wrapper)
            InventoryRowContent(item: item, dynamicTypeSize: dynamicTypeSize, showTypeChip: showTypeChip)
            // Fix 1: invisible NavigationLink for tap navigation
            NavigationLink(value: Route.inventoryDetail(id: item.id)) {
                EmptyView()
            }
            .opacity(0)
            .accessibilityHidden(true)
        }
        .solennixRow()
        .listRowSeparatorTint(SolennixColors.primary.opacity(0.2))
        // Fix 2: a11y — composed ordered label (includes type in Todos scope)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(inventoryAccessibilityLabel(item, isLow: isLow, includeType: showTypeChip))
        .accessibilityAddTraits(.isButton)
        .accessibilityAction(named: InventoryStrings.deleteAction) {
            viewModel.deleteTarget = item
            viewModel.showDeleteConfirm = true
        }
        .accessibilityAction(named: InventoryStrings.adjustStock) {
            viewModel.prepareAdjustment(for: item)
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
            // Fix 6: .blue → SolennixColors.accent
            .tint(SolennixColors.accent)
        }
        .swipeActions(edge: .leading, allowsFullSwipe: true) {
            Button {
                viewModel.prepareAdjustment(for: item)
            } label: {
                Label(InventoryStrings.adjust, systemImage: "plusminus")
            }
            // Fix 6: .orange → SolennixColors.warning
            .tint(SolennixColors.warning)
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
        // Fix 5b: infinite scroll — trigger loadNextPage on last row of last section
        .task {
            if item == viewModel.filteredItems.last {
                await viewModel.loadNextPage()
            }
        }
    }

    // MARK: - Accessibility (Fix 2)

    /// Composed ordered label: name, (type if includeType), stock with unit, low-stock state if applicable, cost.
    private func inventoryAccessibilityLabel(_ item: InventoryItem, isLow: Bool, includeType: Bool = true) -> String {
        let stock = InventoryStrings.quantityWithUnit(Int(item.currentStock), unit: item.unit)
        var parts: [String] = [item.ingredientName]
        if includeType {
            parts.append(localizedTypeName(item.type))
        }
        parts.append(stock)
        if isLow {
            parts.append(InventoryStrings.stockLow)
        }
        if let cost = item.unitCost, cost > 0 {
            parts.append(cost.formatted(.currency(code: "MXN")))
        }
        return parts.joined(separator: ", ")
    }

    private func localizedTypeName(_ type: InventoryType) -> String {
        switch type {
        case .ingredient: return InventoryStrings.ingredientType
        case .equipment:  return InventoryStrings.equipmentType
        case .supply:     return InventoryStrings.supplyType
        }
    }

    // MARK: - Stock Indicator

    private func stockIndicator(_ item: InventoryItem) -> some View {
        // Fix 9: @ScaledMetric applied via the InventoryRowContent struct
        let isLow = item.minimumStock > 0 && item.currentStock < item.minimumStock

        return ZStack {
            Circle()
                .fill(isLow ? SolennixColors.errorBg : SolennixColors.successBg)
                .frame(width: 36, height: 36)

            Image(systemName: isLow ? "exclamationmark.triangle.fill" : "checkmark.circle.fill")
                .font(.caption)
                .foregroundStyle(isLow ? SolennixColors.error : SolennixColors.success)
                .accessibilityHidden(true)
        }
    }

    // MARK: - Low Stock Toggle (Fix 10)

    private var lowStockToggle: some View {
        let isActive = viewModel.showLowStockOnly
        let count = viewModel.lowStockCount
        let valueLabel = isActive
            ? InventoryStrings.lowStockToggleActive(count)
            : InventoryStrings.lowStockToggleInactive

        return Button {
            viewModel.showLowStockOnly.toggle()
        } label: {
            HStack(spacing: 4) {
                Image(systemName: isActive ? "exclamationmark.triangle.fill" : "exclamationmark.triangle")
                    .foregroundStyle(isActive ? SolennixColors.warning : SolennixColors.textTertiary)
                    .accessibilityHidden(true)

                if count > 0 {
                    Text("\(count)")
                        .font(.caption2)
                        .fontWeight(.bold)
                        .foregroundStyle(.white)
                        .padding(.horizontal, 4)
                        .padding(.vertical, 1)
                        .background(SolennixColors.error)
                        .clipShape(Capsule())
                        .accessibilityHidden(true)
                }
            }
        }
        // Fix 10: toggle semantics + state announcement
        .accessibilityAddTraits(.isToggle)
        .accessibilityLabel(isActive ? InventoryStrings.hideLowStock : InventoryStrings.showLowStock)
        .accessibilityValue(valueLabel)
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

    // MARK: - Stock Adjustment Sheet (Fix 8)

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
            // Fix 8: .keyboardDoneToolbar() on the sheet content (once, applied here)
            .keyboardDoneToolbar()
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
        .presentationDragIndicator(.visible)
    }
}

// MARK: - Inventory Row Content (Fix 9: Dynamic Type)

/// Plain content view for each inventory row.
/// Stacks vertically at accessibility1+ — mirrors ProductRow pattern.
/// When `showTypeChip` is true (Todos scope), a tonal type badge is shown.
struct InventoryRowContent: View {
    let item: InventoryItem
    let dynamicTypeSize: DynamicTypeSize
    var showTypeChip: Bool = false

    // Fix 9: scaled stock indicator size
    @ScaledMetric(relativeTo: .body) private var indicatorSize: CGFloat = 36

    var body: some View {
        let isLow = item.minimumStock > 0 && item.currentStock < item.minimumStock

        if dynamicTypeSize >= .accessibility1 {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                HStack(spacing: Spacing.md) {
                    scaledStockIndicator(isLow: isLow)
                    VStack(alignment: .leading, spacing: 2) {
                        itemName
                        if showTypeChip {
                            typeChip
                        }
                    }
                }
                HStack {
                    stockAndCostInfo(item: item, isLow: isLow)
                    Spacer()
                }
                if let cost = item.unitCost, cost > 0 {
                    Text(cost.formatted(.currency(code: "MXN")))
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                }
            }
            .padding(.vertical, Spacing.xs)
        } else {
            HStack(spacing: Spacing.md) {
                scaledStockIndicator(isLow: isLow)
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    if showTypeChip {
                        HStack(spacing: Spacing.xs) {
                            itemName
                            typeChip
                        }
                    } else {
                        itemName
                    }
                    stockAndCostInfo(item: item, isLow: isLow)
                }
                Spacer()
                if let cost = item.unitCost, cost > 0 {
                    Text(cost.formatted(.currency(code: "MXN")))
                        .font(.caption)
                        .foregroundStyle(SolennixColors.textSecondary)
                }
            }
            .padding(.vertical, Spacing.xs)
        }
    }

    private func scaledStockIndicator(isLow: Bool) -> some View {
        ZStack {
            Circle()
                .fill(isLow ? SolennixColors.errorBg : SolennixColors.successBg)
                .frame(width: indicatorSize, height: indicatorSize)
            Image(systemName: isLow ? "exclamationmark.triangle.fill" : "checkmark.circle.fill")
                .font(.caption)
                .foregroundStyle(isLow ? SolennixColors.error : SolennixColors.success)
                .accessibilityHidden(true)
        }
    }

    private var itemName: some View {
        Text(item.ingredientName)
            .font(.subheadline)
            .fontWeight(.medium)
            .foregroundStyle(SolennixColors.text)
            .lineLimit(2)
    }

    private func stockAndCostInfo(item: InventoryItem, isLow: Bool) -> some View {
        HStack(spacing: Spacing.sm) {
            Text(InventoryStrings.quantityWithUnit(Int(item.currentStock), unit: item.unit))
                .font(.caption)
                .foregroundStyle(isLow ? SolennixColors.error : SolennixColors.textSecondary)

            if isLow {
                Text(InventoryStrings.minLabel(Int(item.minimumStock)))
                    .font(.caption2)
                    .foregroundStyle(SolennixColors.textTertiary)
            }
        }
    }

    /// Tonal type badge shown in the Todos scope so each row is self-identifying.
    private var typeChip: some View {
        let (icon, color) = typeIconAndColor(item.type)
        return Label {
            Text(typeLabel(item.type))
                .font(.caption2)
                .fontWeight(.medium)
        } icon: {
            Image(systemName: icon)
                .font(.caption2)
                .accessibilityHidden(true)
        }
        .foregroundStyle(color)
        .padding(.horizontal, 6)
        .padding(.vertical, 2)
        .background(color.opacity(0.12))
        .clipShape(Capsule())
        .accessibilityHidden(true) // type is already in the row's a11y label
    }

    private func typeLabel(_ type: InventoryType) -> String {
        switch type {
        case .ingredient: return InventoryStrings.ingredientType
        case .equipment:  return InventoryStrings.equipmentType
        case .supply:     return InventoryStrings.supplyType
        }
    }

    private func typeIconAndColor(_ type: InventoryType) -> (String, Color) {
        switch type {
        case .ingredient: return ("leaf.fill", SolennixColors.success)
        case .equipment:  return ("wrench.and.screwdriver.fill", SolennixColors.primary)
        case .supply:     return ("shippingbox.fill", SolennixColors.accent)
        }
    }
}

// MARK: - Inventory Skeleton Row (Fix 3)

/// Skeleton placeholder matching InventoryRowContent shape.
struct InventorySkeletonRow: View {
    public init() {}

    public var body: some View {
        HStack(spacing: Spacing.md) {
            // Stock indicator stub
            Circle()
                .fill(SolennixColors.surfaceAlt)
                .frame(width: 36, height: 36)

            // Text column stubs
            VStack(alignment: .leading, spacing: Spacing.xs) {
                SkeletonLine(width: 120, height: 14)  // name — subheadline
                SkeletonLine(width: 64, height: 10)   // stock — caption
            }

            Spacer(minLength: Spacing.sm)

            // Trailing cost stub
            SkeletonLine(width: 48, height: 10)
        }
        .padding(.vertical, Spacing.xs)
    }
}

// MARK: - Preview

#Preview("Inventory List") {
    NavigationStack {
        InventoryListView(apiClient: APIClient())
    }
}
