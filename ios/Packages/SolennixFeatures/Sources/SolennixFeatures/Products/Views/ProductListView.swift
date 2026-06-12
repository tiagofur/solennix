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
                        // Fix 8: plus.circle → plus (consistency with Clients/Events)
                        NavigationLink(value: Route.productForm()) {
                            Image(systemName: "plus")
                                .font(.body)
                                .foregroundStyle(planLimitsManager.canCreateProduct ? SolennixColors.primary : SolennixColors.textTertiary)
                                .accessibilityLabel(ProductStrings.addProductAccessibility)
                        }
                        .disabled(!planLimitsManager.canCreateProduct)

                        sortMenu
                    }
                }
            }
            .confirmationDialog(
                ProductStrings.deleteTitle,
                isPresented: $viewModel.showDeleteConfirm,
                presenting: viewModel.deleteTarget
            ) { product in
                Button(ProductStrings.deleteAction, role: .destructive) {
                    HapticsHelper.play(.success)
                    guard let removed = viewModel.softDeleteProduct(product) else { return }
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
            if !viewModel.categories.isEmpty {
                CategoryChips(
                    categories: viewModel.categories,
                    selectedCategory: $viewModel.selectedCategory
                ) { category in
                    viewModel.toggleCategory(category)
                }
                .padding(.vertical, Spacing.sm)
            }

            if viewModel.isLoading && viewModel.products.isEmpty {
                // iPad skeleton: ProgressView overlay (grid deferred)
                ProgressView()
                    .controlSize(.large)
                    .tint(SolennixColors.primary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, Spacing.xxxl)
            } else if viewModel.filteredProducts.isEmpty && !viewModel.isLoading {
                if viewModel.searchText.isEmpty && viewModel.selectedCategory == nil {
                    ipadFirstRunEmptyState
                } else {
                    EmptyStateView(
                        icon: "magnifyingglass",
                        title: ProductStrings.filteredEmptyTitle,
                        message: ProductStrings.filteredEmptyMessage
                    )
                }
            } else {
                LazyVGrid(columns: [GridItem(.adaptive(minimum: 250))], spacing: Spacing.sm) {
                    ForEach(viewModel.filteredProducts) { product in
                        NavigationLink(value: Route.productDetail(id: product.id)) {
                            ProductRow(product: product, dynamicTypeSize: dynamicTypeSize)
                                .padding(Spacing.md)
                                .background(SolennixColors.card)
                                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.lg))
                                .shadowSm()
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
        VStack(spacing: 0) {
            EmptyStateView(
                icon: "shippingbox",
                title: ProductStrings.emptyTitle,
                message: ProductStrings.emptyMessage
            )
            NavigationLink(value: Route.productForm()) {
                Text(ProductStrings.emptyAction)
                    .font(.headline)
                    .foregroundStyle(.white)
                    .padding(.horizontal, Spacing.xl)
                    .padding(.vertical, 16)
                    .background(SolennixGradient.premium)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                    .shadowFab()
            }
            .padding(.bottom, Spacing.xxl)
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - iPhone Compact List (Fix 1, 2, 3, 4)

    @ViewBuilder
    private var productListCompact: some View {
        List {
            // Category chips live in their OWN section: if they share the products
            // section they become its first row and the first product row loses the
            // insetGrouped rounded top corners (renders mid-section, squared).
            if !viewModel.categories.isEmpty {
                Section {
                    CategoryChips(
                        categories: viewModel.categories,
                        selectedCategory: $viewModel.selectedCategory
                    ) { category in
                        viewModel.toggleCategory(category)
                    }
                    .padding(.vertical, Spacing.sm)
                    .listRowBackground(Color.clear)
                    .listRowInsets(EdgeInsets())
                    .listRowSeparator(.hidden)
                }
            }

            Section {
                productContentRows
            }
        }
        .listStyle(.insetGrouped)
        .listSectionSpacing(.compact)
        .scrollContentBackground(.hidden)
        .background(SolennixColors.surfaceGrouped)
    }

    @ViewBuilder
    private var productContentRows: some View {
        Group {
            if let error = viewModel.errorMessage, viewModel.products.isEmpty, !viewModel.isLoading {
                // Error state
                EmptyStateView(
                    icon: "wifi.exclamationmark",
                    title: ProductStrings.errorLoadingTitle,
                    message: error,
                    actionTitle: ProductStrings.retry
                ) {
                    Task { await viewModel.loadProducts() }
                }
                .frame(maxWidth: .infinity)
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets())
                .listRowSeparator(.hidden)
            } else if viewModel.isLoading && viewModel.products.isEmpty {
                // Fix 3: skeleton rows inside the same List — no jump
                productSkeletonRows
            } else if viewModel.filteredProducts.isEmpty && !viewModel.isLoading {
                if viewModel.searchText.isEmpty && viewModel.selectedCategory == nil {
                    // Fix 2: working first-run CTA with real NavigationLink
                    productFirstRunEmptyRow
                } else {
                    EmptyStateView(
                        icon: "magnifyingglass",
                        title: ProductStrings.filteredEmptyTitle,
                        message: ProductStrings.filteredEmptyMessage
                    )
                    .frame(maxWidth: .infinity)
                    .listRowBackground(Color.clear)
                    .listRowInsets(EdgeInsets())
                    .listRowSeparator(.hidden)
                }
            } else {
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
                    .listRowBackground(SolennixColors.card)
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
    }

    // MARK: - First-Run Empty Row (Fix 2)

    /// Working NavigationLink CTA for the truly-empty state — mirrors ClientListView/EventListView.
    private var productFirstRunEmptyRow: some View {
        VStack(spacing: 0) {
            EmptyStateView(
                icon: "shippingbox",
                title: ProductStrings.emptyTitle,
                message: ProductStrings.emptyMessage
            )
            NavigationLink(value: Route.productForm()) {
                Text(ProductStrings.emptyAction)
                    .font(.headline)
                    .foregroundStyle(.white)
                    .padding(.horizontal, Spacing.xl)
                    .padding(.vertical, 16)
                    .background(SolennixGradient.premium)
                    .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                    .shadowFab()
            }
            .padding(.bottom, Spacing.xxl)
        }
        .frame(maxWidth: .infinity)
        .listRowBackground(Color.clear)
        .listRowInsets(EdgeInsets())
        .listRowSeparator(.hidden)
    }

    // MARK: - Skeleton Rows (Fix 3)

    /// Per-row skeletons inside the same List — no full-screen List swap.
    /// Mirrors ClientSkeletonCard pattern: listRowBackground(card) + separator tint.
    @ViewBuilder
    private var productSkeletonRows: some View {
        ForEach(0..<6, id: \.self) { _ in
            ProductSkeletonRow()
                .listRowBackground(SolennixColors.card)
                .listRowSeparatorTint(SolennixColors.primary.opacity(0.2))
        }
        .accessibilityHidden(true)
    }

    // MARK: - Product Row

    struct ProductRow: View {
        let product: Product
        let dynamicTypeSize: DynamicTypeSize

        var body: some View {
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

        // Fix 5: gold anchor + semibold; locale-aware via NumberFormatter (FeatureL10n)
        private var priceText: some View {
            Text(formattedPrice(product.basePrice))
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundStyle(SolennixColors.primary)
        }

        private func formattedPrice(_ value: Double) -> String {
            let f = NumberFormatter()
            f.numberStyle = .currency
            f.locale = FeatureL10n.locale
            f.maximumFractionDigits = 0
            f.minimumFractionDigits = 0
            return f.string(from: NSNumber(value: value)) ?? "$0"
        }
    }

    // MARK: - Accessibility (Fix 1)

    /// Composed ordered label: name, category, price.
    private func productAccessibilityLabel(_ product: Product) -> String {
        let price = formattedPrice(product.basePrice)
        return [product.name, product.category, price].joined(separator: ", ")
    }

    private func formattedPrice(_ value: Double) -> String {
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.locale = FeatureL10n.locale
        f.maximumFractionDigits = 0
        f.minimumFractionDigits = 0
        return f.string(from: NSNumber(value: value)) ?? "$0"
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
