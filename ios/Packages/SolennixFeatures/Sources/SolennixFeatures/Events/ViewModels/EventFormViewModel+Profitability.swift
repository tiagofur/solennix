import Foundation
import SolennixCore
import SolennixNetwork

extension EventFormViewModel {
    // MARK: - Profitability (parity con Android)
    //
    // All calculations delegate to EventFinancials.compute() — the single source
    // of truth shared with EventFinancesDetailView and QuickQuoteViewModel.

    public var hasPendingProductCosts: Bool {
        let ids = Set(selectedProducts.map { $0.productId })
        return ids.contains { productUnitCosts[$0] == nil }
    }

    // MARK: - Shared financial result

    /// Full financial result computed from current form state.
    public var financialResult: EventFinancials.Result {
        EventFinancials.compute(
            products: selectedProducts.map { p in
                EventFinancials.ProductRow(
                    quantity: p.quantity,
                    unitPrice: p.unitPrice,
                    lineDiscount: p.discount,
                    unitCost: productUnitCosts[p.productId]
                )
            },
            extras: extras.map { e in
                EventFinancials.ExtraRow(
                    price: e.price,
                    cost: e.cost,
                    excludeUtility: e.excludeUtility
                )
            },
            supplies: selectedSupplies.map { s in
                EventFinancials.SupplyRow(
                    quantity: s.quantity,
                    unitCost: s.unitCost,
                    excludeCost: s.excludeCost
                )
            },
            globalDiscountType: discountType,
            globalDiscount: discount,
            requiresInvoice: requiresInvoice,
            taxRate: taxRate
        )
    }

    // MARK: - Cost breakdown (kept for backward compatibility)

    public var costProducts: Double { financialResult.productCost }
    public var costExtras: Double { financialResult.extrasCost }
    public var costSupplies: Double { financialResult.suppliesCost }
    public var totalCosts: Double { financialResult.totalCost }
    public var netProfit: Double { financialResult.netProfit }
    public var profitMargin: Double { financialResult.profitMargin }

    /// Busca ingredients de cada producto seleccionado y calcula el costo
    /// unitario sumando `quantityRequired × unitCost` de cada ingrediente
    /// de tipo ingredient/supply. Cachea en `productUnitCosts`. Skip productos
    /// ya cacheados.
    @MainActor
    public func fetchProductCosts() async {
        let missing = selectedProducts
            .map { $0.productId }
            .filter { !$0.isEmpty && productUnitCosts[$0] == nil }
            .reduce(into: Set<String>()) { $0.insert($1) }

        guard !missing.isEmpty else { return }

        for productId in missing {
            do {
                let ingredients: [ProductIngredient] = try await apiClient.getAll(
                    Endpoint.productIngredients(productId)
                )
                // Filter: ingredient OR supply — matches EventFinancials cost aggregation.
                let cost = ingredients
                    .filter { ing in
                        guard let type = ing.type else { return true }
                        return type == .ingredient || type == .supply
                    }
                    .reduce(0) { sum, ing in
                        sum + (ing.unitCost ?? 0) * ing.quantityRequired
                    }
                productUnitCosts[productId] = cost
            } catch {
                productUnitCosts[productId] = 0
            }
        }
    }
}
