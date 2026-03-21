import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Product List View

public struct ProductListView: View {

    @State private var viewModel: ProductListViewModel
    @Environment(PlanLimitsManager.self) private var planLimitsManager

    public init(apiClient: APIClient) {
        _viewModel = State(initialValue: ProductListViewModel(apiClient: apiClient))
    }

    public var body: some View {
        content
        .navigationTitle("Productos")
        .navigationBarTitleDisplayMode(.inline)
        .searchable(text: $viewModel.searchText, prompt: "Buscar productos...")
        .refreshable { await viewModel.loadProducts() }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                HStack(spacing: Spacing.sm) {
                    NavigationLink(value: Route.productForm()) {
                        Image(systemName: "plus.circle")
                            .font(.body)
                            .foregroundStyle(planLimitsManager.canCreateCatalogItem ? SolennixColors.primary : SolennixColors.textTertiary)
                    }
                    .disabled(!planLimitsManager.canCreateCatalogItem)

                    sortMenu
                }
            }
        }
        .confirmationDialog(
            "Eliminar producto",
            isPresented: $viewModel.showDeleteConfirm,
            presenting: viewModel.deleteTarget
        ) { product in
            Button("Eliminar", role: .destructive) {
                Task { await viewModel.deleteProduct(product) }
            }
            Button("Cancelar", role: .cancel) {}
        } message: { product in
            Text("Estas seguro de que quieres eliminar \"\(product.name)\"? Esta accion no se puede deshacer.")
        }
        .task { 
            await viewModel.loadProducts() 
            await planLimitsManager.checkLimits()
        }
    }

    // MARK: - Content

    @ViewBuilder
    private var content: some View {
        if viewModel.isLoading && viewModel.products.isEmpty {
            skeletonList
        } else if viewModel.filteredProducts.isEmpty && !viewModel.isLoading {
            if viewModel.searchText.isEmpty && viewModel.selectedCategory == nil {
                EmptyStateView(
                    icon: "shippingbox",
                    title: "Sin productos",
                    message: "Agrega tu primer producto al catalogo",
                    actionTitle: "Nuevo Producto"
                ) {
                    // FAB handles navigation
                }
            } else {
                EmptyStateView(
                    icon: "magnifyingglass",
                    title: "Sin resultados",
                    message: "No se encontraron productos que coincidan con los filtros aplicados"
                )
            }
        } else {
            VStack(spacing: 0) {
                // Plan limit warning
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

                // Category chips
                if !viewModel.categories.isEmpty {
                    CategoryChips(
                        categories: viewModel.categories,
                        selectedCategory: $viewModel.selectedCategory
                    ) { category in
                        viewModel.toggleCategory(category)
                    }
                    .padding(.vertical, Spacing.sm)
                }

                // Product list
                productList
            }
        }
    }

    // MARK: - Product List

    private var productList: some View {
        List(viewModel.filteredProducts) { product in
            NavigationLink(value: Route.productDetail(id: product.id)) {
                ProductRow(product: product)
            }
            .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                Button(role: .destructive) {
                    viewModel.deleteTarget = product
                    viewModel.showDeleteConfirm = true
                } label: {
                    Label("Eliminar", systemImage: "trash")
                }

                NavigationLink(value: Route.productForm(id: product.id)) {
                    Label("Editar", systemImage: "pencil")
                }
                .tint(.blue)
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
                            Text("Inactivo")
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
            Picker("Ordenar por", selection: $viewModel.sortKey) {
                ForEach(ProductSortKey.allCases, id: \.self) { key in
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
