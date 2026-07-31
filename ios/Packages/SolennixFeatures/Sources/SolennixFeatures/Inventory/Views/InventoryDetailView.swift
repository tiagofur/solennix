import SwiftUI
import SolennixCore
import SolennixDesign
import SolennixNetwork

// MARK: - Inventory Detail View

public struct InventoryDetailView: View {

    @State private var viewModel: InventoryDetailViewModel
    @State private var scoped: ViewScopedTask?
    @Environment(\.dismiss) private var dismiss

    // MARK: - @ScaledMetric sizes (capped — fix #10)
    @ScaledMetric(relativeTo: .largeTitle) private var stockFontSize: CGFloat = 48
    private var cappedStockFontSize: CGFloat { min(stockFontSize, 64) }

    @ScaledMetric(relativeTo: .body) private var emptyIconSize: CGFloat = 28
    private var cappedEmptyIconSize: CGFloat { min(emptyIconSize, 56) }

    public init(apiClient: APIClient, itemId: String) {
        _viewModel = State(initialValue: InventoryDetailViewModel(apiClient: apiClient, itemId: itemId))
    }

    public var body: some View {
        Group {
            // Fix #5 + #6: skeleton guard is isLoading && item == nil
            if viewModel.isLoading && viewModel.item == nil {
                List {
                    InventoryDetailSkeleton()
                }
                .listStyle(.insetGrouped)
                .solennixListStyle()
            } else if let item = viewModel.item {
                hubList(item)
            } else {
                ContentUnavailableView {
                    Label(InventoryStrings.errorTitle, systemImage: "exclamationmark.triangle")
                } description: {
                    Text(viewModel.errorMessage ?? InventoryStrings.errorLoadingTitle)
                }
            }
        }
        .background(SolennixColors.surfaceGrouped)
        .navigationTitle(viewModel.item?.ingredientName ?? InventoryStrings.itemFallback)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                // Fix #8: only Edit + Delete in toolbar Menu; "Ajustar Stock" stays in body
                Menu {
                    NavigationLink(value: Route.inventoryForm(id: viewModel.itemId)) {
                        Label(InventoryStrings.edit, systemImage: "pencil")
                    }

                    Divider()

                    Button(role: .destructive) {
                        viewModel.showDeleteConfirm = true
                    } label: {
                        Label(InventoryStrings.deleteAction, systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                        .foregroundStyle(SolennixColors.primary)
                        .accessibilityLabel(InventoryStrings.moreActions)
                }
            }
        }
        .confirmationDialog(
            InventoryStrings.deleteTitle,
            isPresented: $viewModel.showDeleteConfirm
        ) {
            Button(InventoryStrings.deleteAction, role: .destructive) {
                scoped?.start {
                    if await viewModel.deleteItem() {
                        dismiss()
                    }
                }
            }
            Button(InventoryStrings.cancel, role: .cancel) {}
        } message: {
            Text(InventoryStrings.permanentDeletePrompt(viewModel.item?.ingredientName ?? ""))
        }
        // Gate alert: only present when the main entity is loaded — first-load failures
        // stay in the empty-state branch only (prevents double error UI).
        .alert(InventoryStrings.errorTitle, isPresented: Binding(
            get: { viewModel.errorMessage != nil && viewModel.item != nil },
            set: { if !$0 { viewModel.errorMessage = nil } }
        )) {
            Button(InventoryStrings.ok, role: .cancel) {}
        } message: {
            Text(viewModel.errorMessage ?? "")
        }
        .sheet(isPresented: $viewModel.showStockAdjustment) {
            InventoryStockAdjustmentSheet(
                item: viewModel.item,
                adjustmentQuantity: $viewModel.adjustmentQuantity,
                isPresented: $viewModel.showStockAdjustment,
                onSave: {
                    scoped?.start { await viewModel.saveStockAdjustment() }
                }
            )
        }
        .sensoryFeedback(.success, trigger: viewModel.stockSavedCounter)
        .sensoryFeedback(.error, trigger: viewModel.stockErrorCounter)
        .task { await viewModel.loadData() }
        .viewScopedTask(scoped: $scoped)
    }

    // MARK: - Hub List (fix #4 — List insetGrouped, no shadows, no AdaptiveDetailLayout)

    private func hubList(_ item: InventoryItem) -> some View {
        List {
            // Stock status hero
            Section {
                InventoryStockStatusCard(
                    item: item,
                    isLowStock: viewModel.isLowStock,
                    stockFontSize: cappedStockFontSize,
                    onAdjustStock: {
                        viewModel.adjustmentQuantity = item.currentStock
                        viewModel.showStockAdjustment = true
                    }
                )
            }
            .listRowSeparator(.hidden)

            // KPI row
            Section {
                InventoryKPISection(item: item, stockValue: viewModel.stockValue)
            }
            .listRowSeparator(.hidden)

            // Smart alert
            Section {
                InventorySmartAlertSection(
                    item: item,
                    demand7Days: viewModel.demand7Days,
                    stockAfter7Days: viewModel.stockAfter7Days,
                    isLowStock: viewModel.isLowStock,
                    hasDemand: !viewModel.demandEntries.isEmpty
                )
            }
            .listRowSeparator(.hidden)

            // Stock health bars
            Section {
                InventoryStockHealthBars(
                    item: item,
                    isLowStock: viewModel.isLowStock,
                    demand7Days: viewModel.demand7Days,
                    stockAfter7Days: viewModel.stockAfter7Days
                )
            }
            .listRowSeparator(.hidden)

            // Info card
            Section {
                InventoryInfoCard(item: item)
            }
            .listRowSeparator(.hidden)

            // Demand forecast
            Section {
                InventoryDemandForecastSection(
                    rows: viewModel.makeDemandRows(),
                    total: viewModel.demandEntries.reduce(0) { $0 + $1.quantity },
                    unit: item.unit,
                    emptyIconSize: cappedEmptyIconSize
                )
            }
            .listRowSeparator(.hidden)
        }
        .listStyle(.insetGrouped)
        .solennixListStyle()
        .softScrollEdgeEffectIfAvailable()
        // Fix #6: refreshable keeps content visible (does NOT clear item/arrays)
        .refreshable {
            await viewModel.loadData()
        }
    }
}

// MARK: - Preview

#Preview("Inventory Detail") {
    NavigationStack {
        InventoryDetailView(apiClient: APIClient(), itemId: "inv-123")
    }
}
