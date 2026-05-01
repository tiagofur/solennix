import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Product List View

public struct ProductListView: View {

    @Environment(\.horizontalSizeClass) private var sizeClass
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
            .navigationTitle(ProductStrings.title)
            .navigationBarTitleDisplayMode(.large)
            .searchable(text: $viewModel.searchText, prompt: ProductStrings.searchPrompt)
            .safeAreaInset(edge: .top, spacing: 0) {
                // Only static banners live in safeAreaInset. The CategoryChips
                // (a horizontal ScrollView) is placed inside the main list so
                // it does not steal scroll-edge tracking from the large title.
                VStack(spacing: 0) {
                    if viewModel.isShowingCachedData {
                        CachedDataBanner()
                    }
                    if !planLimitsManager.canCreateProduct {
                        UpgradeBannerView(
                            type: .limitReached,
                            resource: "Productos",
                            currentUsage: planLimitsManager.productsCount,
                            limit: PlanLimitsManager.productLimit
                        ) {
                            // Action to go to Pricing
                        }
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
                    NavigationLink(value: Route.productForm()) {
                        Image(systemName: "plus.circle")
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
                            Task { await viewModel.confirmDeleteProduct(removed.product) }
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
        if let error = viewModel.errorMessage, viewModel.products.isEmpty, !viewModel.isLoading {
            EmptyStateView(
                icon: "wifi.exclamationmark",
                title: ProductStrings.errorLoadingTitle,
                message: error,
                actionTitle: ProductStrings.retry
            ) {
                Task { await viewModel.loadProducts() }
            }
        } else if viewModel.isLoading && viewModel.products.isEmpty {
            skeletonList
        } else if viewModel.filteredProducts.isEmpty && !viewModel.isLoading {
            if viewModel.searchText.isEmpty && viewModel.selectedCategory == nil {
                EmptyStateView(
                    icon: "shippingbox",
                    title: ProductStrings.emptyTitle,
                    message: ProductStrings.emptyMessage,
                    actionTitle: ProductStrings.emptyAction
                ) {
                    // FAB handles navigation
                }
            } else {
                EmptyStateView(
                    icon: "magnifyingglass",
                    title: ProductStrings.filteredEmptyTitle,
                    message: ProductStrings.filteredEmptyMessage
                )
            }
        } else {
            productList
        }
    }

    // MARK: - Product List

    @ViewBuilder
    private var productList: some View {
        if sizeClass == .regular {
            productGrid
        } else {
            productListCompact
        }
    }

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

            LazyVGrid(columns: [GridItem(.adaptive(minimum: 250))], spacing: Spacing.sm) {
                ForEach(viewModel.filteredProducts) { product in
                    NavigationLink(value: Route.productDetail(id: product.id)) {
                        ProductRow(product: product)
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
                }
            }
            .padding(.horizontal, Spacing.md)
            .padding(.top, Spacing.sm)
            .padding(.bottom, Spacing.xxl)
        }
        .background(SolennixColors.surfaceGrouped)
    }

    private var productListCompact: some View {
        List {
            if !viewModel.categories.isEmpty {
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

            ForEach(viewModel.filteredProducts) { product in
                NavigationLink(value: Route.productDetail(id: product.id)) {
                    ProductRow(product: product)
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
                    .tint(.blue)
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
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .background(SolennixColors.surfaceGrouped)
    }

    // MARK: - Product Row

    private struct ProductRow: View {
        let product: Product

        var body: some View {
            HStack(spacing: Spacing.md) {
                // Product image or icon
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

                // Product info
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(product.name)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(SolennixColors.text)
                        .lineLimit(1)

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

                Spacer()

                // Price
                Text(product.basePrice.formatted(.currency(code: "MXN")))
                    .font(.subheadline)
                    .foregroundStyle(SolennixColors.text)
            }
            .padding(.vertical, Spacing.xs)
        }

        private var productIconPlaceholder: some View {
            ZStack {
                RoundedRectangle(cornerRadius: CornerRadius.md)
                    .fill(SolennixColors.primaryLight)
                    .frame(width: 44, height: 44)

                Image(systemName: "shippingbox.fill")
                    .foregroundStyle(SolennixColors.primary)
            }
        }
    }

    // MARK: - Skeleton Loading

    private var skeletonList: some View {
        List(0..<6, id: \.self) { _ in
            HStack(spacing: Spacing.md) {
                RoundedRectangle(cornerRadius: CornerRadius.md)
                    .fill(SolennixColors.surfaceAlt)
                    .frame(width: 44, height: 44)

                VStack(alignment: .leading, spacing: Spacing.xs) {
                    RoundedRectangle(cornerRadius: CornerRadius.sm)
                        .fill(SolennixColors.surfaceAlt)
                        .frame(width: 120, height: 14)

                    RoundedRectangle(cornerRadius: CornerRadius.sm)
                        .fill(SolennixColors.surfaceAlt)
                        .frame(width: 60, height: 10)
                }

                Spacer()

                RoundedRectangle(cornerRadius: CornerRadius.sm)
                    .fill(SolennixColors.surfaceAlt)
                    .frame(width: 60, height: 14)
            }
            .padding(.vertical, Spacing.xs)
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .background(SolennixColors.surfaceGrouped)
        .redacted(reason: .placeholder)
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

    // REMOVED Custom plan limit warning (using UpgradeBannerView instead)

    // MARK: - FAB

}

// MARK: - Preview

#Preview("Product List") {
    NavigationStack {
        ProductListView(apiClient: APIClient())
    }
}
