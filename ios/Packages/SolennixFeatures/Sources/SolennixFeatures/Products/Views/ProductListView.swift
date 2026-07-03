import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Product List View

public struct ProductListView: View {

    @Environment(\.horizontalSizeClass) private var sizeClass
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @Environment(CacheManager.self) private var cacheManager: CacheManager?
    @Environment(ToastManager.self) private var toastManager
    @State private var viewModel: ProductListViewModel
    @Environment(PlanLimitsManager.self) private var planLimitsManager

    public init(apiClient: APIClient) {
        _viewModel = State(initialValue: ProductListViewModel(apiClient: apiClient))
    }

    public var body: some View {
        content
            .background(SolennixColors.surfaceGrouped)
            // Fix 9: sensory feedback when delete confirmation appears (true only)
            .sensoryFeedback(.warning, trigger: viewModel.showDeleteConfirm) { _, newValue in newValue }
            .navigationTitle(ProductStrings.title)
            .navigationBarTitleDisplayMode(.large)
            .solennixSearchable(text: $viewModel.searchText, prompt: ProductStrings.searchPrompt)
            .safeAreaInset(edge: .top, spacing: 0) {
                // Only static banners live in safeAreaInset. CategoryChips
                // (a horizontal ScrollView) stays inside the List so it does
                // not steal scroll-edge tracking from the large title.
                VStack(spacing: 0) {
                    if viewModel.isShowingCachedData {
                        CachedDataBanner()
                    }
                    if !planLimitsManager.canCreateProduct {
                        // Fix 14: wrap in NavigationLink(value: Route.pricing) — same pattern as
                        // ClientDetailView and InventoryListView. Banner CTA navigates to PricingView.
                        NavigationLink(value: Route.pricing) {
                            UpgradeBannerView(
                                type: .limitReached,
                                // Fix 11: use ProductStrings.title instead of hardcoded "Productos"
                                resource: ProductStrings.title,
                                currentUsage: planLimitsManager.productsCount,
                                limit: PlanLimitsManager.productLimit,
                                ctaLabel: ProductStrings.upgradeCta
                            )
                        }
                        .buttonStyle(.plain)
                        .padding(.horizontal, Spacing.md)
                        .padding(.top, Spacing.sm)
                    }
                }
                .background(SolennixColors.surfaceGrouped)
            }
            .refreshable { await viewModel.loadProducts() }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    HStack(spacing: Spacing.sm) {
                        // 1. Create
                        NavigationLink(value: Route.productForm()) {
                            Image(systemName: "plus")
                                .font(.body)
                                .foregroundStyle(planLimitsManager.canCreateProduct ? SolennixColors.primary : SolennixColors.textTertiary)
                                .accessibilityLabel(ProductStrings.addProductAccessibility)
                        }
                        .disabled(!planLimitsManager.canCreateProduct)

                        // 2. Sort
                        sortMenu

                        // 3. Category filter
                        Menu {
                            Picker(ProductStrings.categoryFilterAccessibility, selection: $viewModel.selectedCategory) {
                                Text(ProductStrings.categoryAll).tag(nil as String?)
                                ForEach(viewModel.categories, id: \.self) { cat in
                                    Text(cat).tag(cat as String?)
                                }
                            }
                            .pickerStyle(.inline)
                        } label: {
                            Image(systemName: viewModel.selectedCategory != nil ? "line.3.horizontal.decrease.circle.fill" : "line.3.horizontal.decrease.circle")
                                .font(.body)
                                .foregroundStyle(SolennixColors.primary)
                                .symbolEffect(.bounce, value: viewModel.selectedCategory)
                                .accessibilityLabel(ProductStrings.categoryFilterAccessibility)
                        }
                    }
                }
            }
            .confirmationDialog(
                ProductStrings.deleteTitle,
                isPresented: $viewModel.showDeleteConfirm,
                presenting: viewModel.deleteTarget
            ) { product in
                Button(ProductStrings.deleteAction, role: .destructive) {
                    guard let removed = viewModel.softDeleteProduct(product) else { return }
                    HapticsHelper.play(.success)
                    toastManager.showUndo(
                        message: ProductStrings.deletedMessage(product.name),
                        onUndo: {
                            viewModel.restoreProduct(removed.product, at: removed.index)
                            HapticsHelper.play(.success)
                        },
                        onExpire: {
                            Task {
                                await viewModel.confirmDeleteProduct(removed.product)
                                if let message = viewModel.errorMessage {
                                    toastManager.show(message: message, type: .error)
                                }
                            }
                        }
                    )
                }
                Button(ProductStrings.cancel, role: .cancel) {}
            } message: { product in
                Text(ProductStrings.deletePrompt(product.name))
            }
            .task {
                viewModel.setCacheManager(cacheManager)
                await viewModel.loadProducts()
                await planLimitsManager.checkLimits()
            }
    }

    // MARK: - Content

    @ViewBuilder
    private var content: some View {
        if sizeClass == .regular {
            productGrid
        } else {
            // Fix 3: iPhone path uses a single List (skeleton rows inside the same List,
            // no separate full-screen List swap — eliminates the jump).
            productListCompact
        }
    }

    // MARK: - iPad Grid (unchanged from reference — shadows deferred to iPad pass)

    private var productGrid: some View {
        ScrollView {
            if viewModel.isLoading && viewModel.products.isEmpty {
                // iPad skeleton: ProgressView overlay (grid deferred)
                ProgressView()
                    .controlSize(.large)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.xxxl)
            } else if viewModel.filteredProducts.isEmpty && !viewModel.isLoading {
                if viewModel.searchText.isEmpty && viewModel.selectedCategory == nil {
                    ipadFirstRunEmptyState
                } else {
                    productFilteredEmptyState
                }
            } else {
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 250))], spacing: Spacing.sm) {
                    ForEach(viewModel.filteredProducts) { product in
                        NavigationLink(value: Route.productDetail(id: product.id)) {
                            ProductRow(product: product, dynamicTypeSize: dynamicTypeSize)
                                .padding(Spacing.md)
                                .solennixCard(radius: CornerRadius.lg, border: false)
                        }
                        .buttonStyle(.plain)
                        .contextMenu {
                            NavigationLink(value: Route.productForm(id: product.id)) {
                                Label(ProductStrings.edit, systemImage: "pencil")
                            }
                            NavigationLink(value: Route.productDetail(id: product.id)) {
                                Label(ProductStrings.viewDetail, systemImage: "eye")
                            }
                            Divider()
                            Button(role: .destructive) {
                                HapticsHelper.play(.warning)
                                viewModel.deleteTarget = product
                                viewModel.showDeleteConfirm = true
                            } label: {
                                Label(ProductStrings.deleteAction, systemImage: "trash")
                            }
                        }
                        .task {
                            if product == viewModel.filteredProducts.last {
                                await viewModel.loadNextPage()
                            }
                        }
                    }
                }
                .padding(.horizontal, Spacing.lg)
                .padding(.vertical, Spacing.lg)

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

    // Fix 2: first-run CTA for iPad grid
    private var ipadFirstRunEmptyState: some View {
        ContentUnavailableView {
            Label(ProductStrings.emptyTitle, systemImage: "shippingbox")
        } description: {
            Text(ProductStrings.emptyMessage)
        } actions: {
            NavigationLink(value: Route.productForm()) {
                Text(ProductStrings.emptyAction)
                    .font(.headline)
                    .foregroundStyle(SolennixColors.primaryDark)
                    .padding(.horizontal, Spacing.xl)
                    .padding(.vertical, 16)
                    .background(SolennixColors.primaryLight)
                    .clipShape(Capsule())
                    .adaptiveGlass(in: Capsule(), fallback: .material)
            }
        }
        .tint(SolennixColors.primary)
        .symbolRenderingMode(.hierarchical)
        .frame(maxWidth: .infinity)
    }

    // MARK: - Filtered Empty State (PR1 migration)
    // Mixed source: text search OR category filter. Pure text search uses the
    // system `.search` affordance; a category-only filter shows a plain
    // ContentUnavailableView with a clear-filters action.
    @ViewBuilder
    private var productFilteredEmptyState: some View {
        if !viewModel.searchText.isEmpty {
            ContentUnavailableView.search(text: viewModel.searchText)
        } else {
            ContentUnavailableView {
                Label(ProductStrings.filteredEmptyTitle, systemImage: "magnifyingglass")
            } description: {
                Text(ProductStrings.filteredEmptyMessage)
            } actions: {
                Button(ProductStrings.clearFilters) {
                    viewModel.selectedCategory = nil
                }
            }
        }
    }

    // MARK: - iPhone Compact List (Fix 1, 2, 3, 4)

    @ViewBuilder
    private var productListCompact: some View {
        if let error = viewModel.errorMessage, viewModel.products.isEmpty, !viewModel.isLoading {
            // Error state — outside List for proper centering
            ContentUnavailableView {
                Label(ProductStrings.errorLoadingTitle, systemImage: "network")
            } description: {
                Text(error)
            } actions: {
                Button(ProductStrings.retry) {
                    Task { await viewModel.loadProducts() }
                }
            }
        } else if viewModel.isLoading && viewModel.products.isEmpty {
            // Fix 3: skeleton rows inside the same List — no jump
            List {
                Section {
                    productSkeletonRows
                }
            }
            .listStyle(.insetGrouped)
            .listSectionSpacing(.compact)
            .solennixListStyle()
        } else if viewModel.filteredProducts.isEmpty && !viewModel.isLoading {
            // Empty states — outside List for proper centering
            if viewModel.searchText.isEmpty && viewModel.selectedCategory == nil {
                // Fix 2: working first-run CTA with real NavigationLink
                productFirstRunEmptyState
            } else {
                productFilteredEmptyState
            }
        } else {
            List {
                Section {
                    // Fix 1: canonical ZStack + opacity-0 NavigationLink row chrome
                    ForEach(viewModel.filteredProducts) { product in
                        ZStack {
                            ProductRow(product: product, dynamicTypeSize: dynamicTypeSize)
                            NavigationLink(value: Route.productDetail(id: product.id)) {
                                EmptyView()
                            }
                            .opacity(0)
                            .accessibilityHidden(true)
                        }
                        .solennixRow()
                        .listRowSeparatorTint(SolennixColors.primary.opacity(0.2))
                        .accessibilityElement(children: .ignore)
                        .accessibilityLabel(productAccessibilityLabel(product))
                        .accessibilityAddTraits(.isButton)
                        // Fix 1: VoiceOver delete action wired to delete-confirm flow
                        .accessibilityAction(named: ProductStrings.deleteAction) {
                            viewModel.deleteTarget = product
                            viewModel.showDeleteConfirm = true
                        }
                        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                            Button(role: .destructive) {
                                HapticsHelper.play(.warning)
                                viewModel.deleteTarget = product
                                viewModel.showDeleteConfirm = true
                            } label: {
                                Label(ProductStrings.deleteAction, systemImage: "trash")
                            }

                            NavigationLink(value: Route.productForm(id: product.id)) {
                                Label(ProductStrings.edit, systemImage: "pencil")
                            }
                            // Fix 13: navy accent, not .blue
                            .tint(SolennixColors.accent)
                        }
                        .contextMenu {
                            NavigationLink(value: Route.productForm(id: product.id)) {
                                Label(ProductStrings.edit, systemImage: "pencil")
                            }
                            NavigationLink(value: Route.productDetail(id: product.id)) {
                                Label(ProductStrings.viewDetail, systemImage: "eye")
                            }
                            Divider()
                            Button(role: .destructive) {
                                HapticsHelper.play(.warning)
                                viewModel.deleteTarget = product
                                viewModel.showDeleteConfirm = true
                            } label: {
                                Label(ProductStrings.deleteAction, systemImage: "trash")
                            }
                        }
                        // Fix 4: infinite scroll — trigger loadNextPage on last row
                        .task {
                            if product == viewModel.filteredProducts.last {
                                await viewModel.loadNextPage()
                            }
                        }
                    }

                    // Fix 4: ProgressView footer row while loading more
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
            }
            .listStyle(.insetGrouped)
            .listSectionSpacing(.compact)
            .solennixListStyle()
        }
    }

    // MARK: - First-Run Empty State (Fix 2) — outside List for proper centering

    /// Working NavigationLink CTA for the truly-empty state — mirrors ClientListView/EventListView.
    private var productFirstRunEmptyState: some View {
        ContentUnavailableView {
            Label(ProductStrings.emptyTitle, systemImage: "shippingbox")
        } description: {
            Text(ProductStrings.emptyMessage)
        } actions: {
            NavigationLink(value: Route.productForm()) {
                Text(ProductStrings.emptyAction)
                    .font(.headline)
                    .foregroundStyle(SolennixColors.primaryDark)
                    .padding(.horizontal, Spacing.xl)
                    .padding(.vertical, 16)
                    .background(SolennixColors.primaryLight)
                    .clipShape(Capsule())
                    .adaptiveGlass(in: Capsule(), fallback: .material)
            }
        }
        .tint(SolennixColors.primary)
        .symbolRenderingMode(.hierarchical)
        .frame(maxWidth: .infinity)
    }

    // MARK: - Skeleton Rows (Fix 3)

    /// Per-row skeletons inside the same List — no full-screen List swap.
    /// Mirrors ClientSkeletonCard pattern: listRowBackground(card) + separator tint.
    @ViewBuilder
    private var productSkeletonRows: some View {
        ForEach(0..<6, id: \.self) { _ in
            ProductSkeletonRow()
                .solennixRow()
                .listRowSeparatorTint(SolennixColors.primary.opacity(0.2))
        }
        .accessibilityHidden(true)
    }

    // MARK: - Product Row

    struct ProductRow: View {
        let product: Product
        let dynamicTypeSize: DynamicTypeSize

        var body: some View {
            Group {
                // Fix 10: stack vertically at accessibility1+ (mirrors ClientListView pattern)
                if dynamicTypeSize >= .accessibility1 {
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        HStack(spacing: Spacing.md) {
                            productIcon
                            productName
                        }
                        HStack {
                            categoryAndStatusBadge
                            Spacer()
                            priceText
                        }
                    }
                    .padding(.vertical, Spacing.xs)
                } else {
                    HStack(spacing: Spacing.md) {
                        productIcon
                        VStack(alignment: .leading, spacing: Spacing.xs) {
                            productName
                            categoryAndStatusBadge
                        }
                        Spacer()
                        priceText
                    }
                    .padding(.vertical, Spacing.xs)
                }
            }
            .opacity(product.isActive ? 1.0 : 0.5)
        }

        // Fix 6: muted tonal icon — iconSlate glyph on surfaceAlt fill
        private var productIcon: some View {
            Group {
                if let imageUrl = product.imageUrl, !imageUrl.isEmpty {
                    AsyncImage(url: APIClient.resolveURL(imageUrl)) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    } placeholder: {
                        productIconPlaceholder
                    }
                    .frame(width: 44, height: 44)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                } else {
                    productIconPlaceholder
                }
            }
        }

        private var productIconPlaceholder: some View {
            ZStack {
                RoundedRectangle(cornerRadius: CornerRadius.md)
                    .fill(SolennixColors.surfaceAlt)
                    .frame(width: 44, height: 44)
                // Fix 6: iconSlate tint on neutral fill (no gold)
                Image(systemName: "shippingbox.fill")
                    .foregroundStyle(SolennixColors.iconSlate)
            }
        }

        private var productName: some View {
            Text(product.name)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(SolennixColors.text)
                .lineLimit(1)
        }

        @ViewBuilder
        private var categoryAndStatusBadge: some View {
            HStack(spacing: Spacing.xs) {
                Text(product.category)
                    .font(.caption2)
                    .fontWeight(.semibold)
                    .foregroundStyle(SolennixColors.textSecondary)
                    .textCase(.uppercase)
                    .padding(.horizontal, Spacing.xs)
                    .padding(.vertical, 1)
                    .background(SolennixColors.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 2))

                if !product.isActive {
                    Text(ProductStrings.inactive)
                        .font(.caption2)
                        .fontWeight(.semibold)
                        .foregroundStyle(SolennixColors.error)
                        .padding(.horizontal, Spacing.xs)
                        .padding(.vertical, 1)
                        .background(SolennixColors.errorBg)
                        .clipShape(RoundedRectangle(cornerRadius: CornerRadius.sm))
                }
            }
        }

        // Fix 5: gold anchor + semibold. Pinned to MXN/es_MX via the shared
        // DashboardFormatting.currencyMXN formatter (business currency).
        private var priceText: some View {
            Text(DashboardFormatting.currencyMXN(product.basePrice))
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundStyle(SolennixColors.primary)
        }
    }

    // MARK: - Accessibility (Fix 1)

    /// Composed ordered label: name, category, price.
    private func productAccessibilityLabel(_ product: Product) -> String {
        let price = DashboardFormatting.currencyMXN(product.basePrice)
        return [product.name, product.category, price].joined(separator: ", ")
    }

    // MARK: - Sort Menu

    private var sortMenu: some View {
        Menu {
            Picker(ProductStrings.sortTitle, selection: $viewModel.sortKey) {
                ForEach(ProductSortKey.allCases, id: \.self) { key in
                    Text(key.label).tag(key)
                }
            }

            Divider()

            Button {
                viewModel.sortAscending.toggle()
            } label: {
                Label(
                    viewModel.sortAscending ? ProductStrings.sortAscending : ProductStrings.sortDescending,
                    systemImage: viewModel.sortAscending ? "arrow.up" : "arrow.down"
                )
            }

            Divider()

            Button {
                viewModel.showInactive.toggle()
            } label: {
                Label(
                    ProductStrings.showInactiveLabel,
                    systemImage: viewModel.showInactive ? "checkmark.circle.fill" : "circle"
                )
            }
        } label: {
            Image(systemName: "arrow.up.arrow.down")
                .font(.body)
                .foregroundStyle(SolennixColors.primary)
                .accessibilityLabel(ProductStrings.sortAccessibility)
        }
    }
}

// MARK: - Product Skeleton Row (Fix 3)

/// Skeleton placeholder matching ProductRow shape:
/// icon square stub + name bar + category pill stub + trailing price bar.
struct ProductSkeletonRow: View {
    public init() {}

    public var body: some View {
        HStack(spacing: Spacing.md) {
            // Icon square stub
            RoundedRectangle(cornerRadius: CornerRadius.md)
                .fill(SolennixColors.surfaceAlt)
                .frame(width: 44, height: 44)

            // Text column stubs
            VStack(alignment: .leading, spacing: Spacing.xs) {
                SkeletonLine(width: 140, height: 14)  // name — subheadline
                SkeletonLine(width: 72, height: 10)   // category pill — caption2
            }

            Spacer(minLength: Spacing.sm)

            // Trailing price stub
            SkeletonLine(width: 56, height: 14)       // price — subheadline
        }
        .padding(.vertical, Spacing.xs)
    }
}

// MARK: - Preview

#Preview("Product List") {
    NavigationStack {
        ProductListView(apiClient: APIClient())
    }
}
