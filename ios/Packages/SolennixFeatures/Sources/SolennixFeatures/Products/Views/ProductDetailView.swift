import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Product Detail View

public struct ProductDetailView: View {

    @State private var viewModel: ProductDetailViewModel
    @State private var scoped: ViewScopedTask?
    @Environment(\.dismiss) private var dismiss
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    public init(apiClient: APIClient, productId: String) {
        _viewModel = State(initialValue: ProductDetailViewModel(apiClient: apiClient, productId: productId))
    }

    public var body: some View {
        Group {
            if viewModel.isLoading && viewModel.product == nil {
                ProductDetailSkeleton()
            } else if let product = viewModel.product {
                hubScrollView(product)
            } else {
                ContentUnavailableView {
                    Label(ProductStrings.errorTitle, systemImage: "exclamationmark.triangle")
                } description: {
                    Text(viewModel.errorMessage ?? ProductStrings.notFoundMessage)
                }
            }
        }
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle(viewModel.product?.name ?? ProductStrings.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    NavigationLink(value: Route.productForm(id: viewModel.productId)) {
                        Label(ProductStrings.edit, systemImage: "pencil")
                    }

                    Divider()

                    Button(role: .destructive) {
                        viewModel.showDeleteConfirm = true
                    } label: {
                        Label(ProductStrings.deleteAction, systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                        .foregroundStyle(SolennixColors.primary)
                        .accessibilityLabel(ProductStrings.moreActions)
                }
            }
        }
        .confirmationDialog(
            ProductStrings.deleteTitle,
            isPresented: $viewModel.showDeleteConfirm
        ) {
            Button(ProductStrings.deleteAction, role: .destructive) {
                scoped?.start {
                    if await viewModel.deleteProduct() {
                        dismiss()
                    }
                }
            }
            Button(ProductStrings.cancel, role: .cancel) {}
        } message: {
            Text(ProductStrings.deletePrompt(viewModel.product?.name ?? ""))
        }
        // Gate alert: only present when the main entity is loaded — first-load failures
        // stay in the empty-state branch only (prevents double error UI).
        .alert(ProductStrings.errorTitle, isPresented: Binding(
            get: { viewModel.errorMessage != nil && viewModel.product != nil },
            set: { if !$0 { viewModel.errorMessage = nil } }
        )) {
            Button(ProductStrings.ok, role: .cancel) {}
        } message: {
            Text(viewModel.errorMessage ?? "")
        }
        .task { await viewModel.loadData() }
        .viewScopedTask(scoped: $scoped)
    }

    // MARK: - @ScaledMetric sizes (Dynamic Type-safe, capped)

    @ScaledMetric(relativeTo: .body) private var scaledImageHeight: CGFloat = 280
    private var cappedImageHeight: CGFloat { min(scaledImageHeight, 400) }

    // MARK: - Hub ScrollView

    private func hubScrollView(_ product: Product) -> some View {
        ScrollView {
            VStack(spacing: 0) {
                // Hero Image at the very top (ignores safe area top)
                ProductDetailHeroHeader(product: product, cappedImageHeight: cappedImageHeight)

                VStack(spacing: Spacing.md) {
                    // Category & Status Kicker + Title inside a card
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        HStack(spacing: Spacing.xs) {
                            Text(product.category)
                                .font(.caption.weight(.bold))
                                .textCase(.uppercase)
                                .foregroundStyle(SolennixColors.primary)

                            if !product.isActive {
                                Text("•")
                                    .foregroundStyle(SolennixColors.textSecondary)
                                Text(ProductStrings.inactive)
                                    .font(.caption.weight(.bold))
                                    .textCase(.uppercase)
                                    .foregroundStyle(SolennixColors.error)
                            }
                        }

                        Text(product.name)
                            .font(.title.weight(.bold))
                            .foregroundStyle(SolennixColors.text)
                    }
                    .padding(Spacing.md)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .solennixCard(radius: CornerRadius.lg, shadow: false, border: false)
                    .shadow(color: Color.black.opacity(0.04), radius: 10, y: 5)
                    .padding(.horizontal, Spacing.md)

                    // Smart alert banner (Translucent iOS style)
                    ProductDetailSmartAlert(
                        demand7Days: viewModel.demand7Days,
                        hasDemand: !viewModel.demandData.isEmpty,
                        estimatedRevenue7Days: viewModel.estimatedRevenue7Days,
                        totalDemand: viewModel.totalDemand,
                        eventCount: viewModel.demandData.count
                    )

                    // KPI grid card
                    ProductDetailKpiSection(
                        product: product,
                        viewModel: viewModel,
                        dynamicTypeSize: dynamicTypeSize
                    )

                    // Demand chart card
                    DemandForecastChart(
                        dataPoints: viewModel.demandData,
                        productName: product.name,
                        basePrice: product.basePrice
                    )
                    .solennixCard(radius: CornerRadius.lg, shadow: false, border: false)
                    .padding(.horizontal, Spacing.md)

                    // Composition / Recipe sections
                    if !viewModel.ingredientItems.isEmpty {
                        ProductDetailCompositionSection(
                            title: ProductStrings.compositionTitle,
                            icon: "square.stack.3d.up.fill",
                            iconColor: SolennixColors.primary,
                            items: viewModel.ingredientItems,
                            dynamicTypeSize: dynamicTypeSize,
                            showCost: true,
                            totalLabel: ProductStrings.totalUnitCost,
                            totalValue: viewModel.unitCost
                        )
                    }

                    if !viewModel.supplyItems.isEmpty {
                        ProductDetailCompositionSection(
                            title: ProductStrings.suppliesTitle,
                            icon: "flame.fill",
                            iconColor: SolennixColors.warning,
                            items: viewModel.supplyItems,
                            dynamicTypeSize: dynamicTypeSize,
                            showCost: true,
                            badge: ProductStrings.fixedCostPerEvent,
                            badgeColor: SolennixColors.warning,
                            totalLabel: ProductStrings.costPerEvent,
                            totalValue: viewModel.perEventCost,
                            totalColor: SolennixColors.warning
                        )
                    }

                    if !viewModel.equipmentItems.isEmpty {
                        ProductDetailCompositionSection(
                            title: ProductStrings.equipmentTitle,
                            icon: "wrench.and.screwdriver.fill",
                            iconColor: SolennixColors.primary,
                            items: viewModel.equipmentItems,
                            dynamicTypeSize: dynamicTypeSize,
                            showCost: false,
                            badge: ProductStrings.reusableNoCost,
                            badgeColor: SolennixColors.info
                        )
                    }

                    // General info
                    ProductDetailGeneralInfoSection(product: product, viewModel: viewModel)

                    Color.clear.frame(height: Spacing.xl)
                }
                .padding(.top, -24)
                .zIndex(1)
            }
        }
        .ignoresSafeArea(.container, edges: .top)
        .background(SolennixColors.surfaceGrouped)
        .softScrollEdgeEffectIfAvailable()
        .refreshable {
            await viewModel.loadData()
        }
    }
}

// MARK: - Preview

#Preview("Product Detail") {
    NavigationStack {
        ProductDetailView(apiClient: APIClient(), productId: "prod-123")
    }
}
