import Foundation
import UIKit
import SolennixCore
import SolennixNetwork

private struct QuickQuotePDFClientPayload: Encodable {
    let name: String
    let phone: String
    let email: String?
}

private struct QuickQuotePDFProductPayload: Encodable {
    let productId: String?
    let name: String
    let quantity: Double
    let unitPrice: Double
    let discount: Double
}

private struct QuickQuotePDFExtraPayload: Encodable {
    let description: String
    let cost: Double
    let price: Double
    let excludeUtility: Bool
}

private struct QuickQuotePDFRequestPayload: Encodable {
    let client: QuickQuotePDFClientPayload?
    let products: [QuickQuotePDFProductPayload]
    let extras: [QuickQuotePDFExtraPayload]
    let numPeople: Int
    let discount: Double
    let discountType: String
    let requiresInvoice: Bool
    let taxRate: Double
}

@Observable
public final class QuickQuoteViewModel {
    let apiClient: APIClient

    // Form Data
    public var numPeople: Int = 1
    public var clientName: String = ""
    public var clientPhone: String = ""
    public var clientEmail: String = ""
    public var showClientInfo: Bool = false

    // Items
    public var selectedProducts: [EventProduct] = []
    public var extras: [EventExtra] = []

    // Financials
    public var discountType: DiscountType = .percent
    public var discountValue: Double = 0
    public var requiresInvoice: Bool = false
    public var taxRate: Double = 16

    // Source data
    public var availableProducts: [Product] = []
    public var productUnitCosts: [String: Double] = [:]

    public var isLoading: Bool = true

    // PDF
    public var pdfData: Data?
    /// Prepared temp-file URL written during `generatePDF()`. Non-nil only when the file
    /// has been successfully written and the share sheet is ready to present.
    public var pdfURL: URL?
    public var showShareSheet: Bool = false
    public var errorMessage: String?

    // Pending background tasks — cancelled on deinit to avoid dangling async work.
    private var pendingTasks: [Task<Void, Never>] = []

    public init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    deinit {
        pendingTasks.forEach { $0.cancel() }
    }

    @MainActor
    public func loadData() async {
        isLoading = true
        errorMessage = nil
        do {
            let products: [Product] = try await apiClient.getAll(Endpoint.products)
            availableProducts = products.filter { $0.isActive }
        } catch {
            // Surface the error so the UI can show a non-empty-picker explanation
            // instead of leaving the user with a silent empty product list.
            errorMessage = QuickQuoteStrings.productsLoadError
        }
        isLoading = false
    }

    // Handlers
    public func addProduct() {
        if let first = availableProducts.first {
            selectedProducts.append(EventProduct(
                id: UUID().uuidString,
                eventId: "quick-quote",
                productId: first.id,
                quantity: 1,
                unitPrice: first.basePrice,
                discount: 0,
                createdAt: ""
            ))
            let task = Task { await fetchIngredientCost(for: first.id) }
            pendingTasks.append(task)
        }
    }

    public func removeProduct(at offsets: IndexSet) {
        selectedProducts.remove(atOffsets: offsets)
    }

    public func addExtra() {
        extras.append(EventExtra(
            id: UUID().uuidString,
            eventId: "quick-quote",
            description: "",
            cost: 0,
            price: 0,
            excludeUtility: false,
            createdAt: ""
        ))
    }

    public func removeExtra(at offsets: IndexSet) {
        extras.remove(atOffsets: offsets)
    }

    @MainActor
    private func fetchIngredientCost(for productId: String) async {
        if productUnitCosts[productId] != nil { return }
        do {
            let ingredients: [ProductIngredient] = try await apiClient.get(Endpoint.productIngredients(productId))
            // Filter: ingredient OR supply — matches EventFormViewModel+Profitability and
            // EventFinancials cost aggregation. Previously only filtered .ingredient.
            let cost = ingredients
                .filter { ing in
                    guard let type = ing.type else { return true }
                    return type == .ingredient || type == .supply
                }
                .reduce(0.0) { sum, ing in
                    sum + (ing.quantityRequired * (ing.unitCost ?? 0.0))
                }
            productUnitCosts[productId] = cost
        } catch {
            // Ingredient cost fetch failure is non-critical — it only affects the
            // profitability section. No user-facing error needed; just skip.
            // (Using os_log here would require OSLog import — omit for brevity.)
        }
    }

    public func updateCostsForCurrentProducts() {
        for product in selectedProducts {
            let task = Task { await fetchIngredientCost(for: product.productId) }
            pendingTasks.append(task)
        }
    }

    // MARK: - Financial calculations
    //
    // Delegates to EventFinancials — the single source of truth for all
    // financial computations across the app. This replaces the former inline
    // calculation which had a stale ingredient-only cost filter.

    public var financials: FinancialSummary {
        let result = EventFinancials.compute(
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
            globalDiscountType: discountType,
            // Percent discount clamped to [0, 100] inside EventFinancials.compute().
            globalDiscount: discountValue,
            requiresInvoice: requiresInvoice,
            taxRate: taxRate
        )

        return FinancialSummary(
            productsSubtotal: result.productsSubtotal,
            extrasTotal: result.normalExtrasSubtotal + result.passThroughExtrasSubtotal,
            discountAmount: result.discountAmount,
            taxAmount: result.taxAmount,
            total: result.total,
            productCost: result.productCost,
            extrasCost: result.extrasCost,
            totalCost: result.totalCost,
            profit: result.netProfit,
            margin: result.profitMargin
        )
    }

    // MARK: - PDF Generation

    /// Downloads a backend-generated quick quote PDF using current form data.
    @MainActor
    public func generatePDF() async {
        let validProducts = selectedProducts.filter { !$0.productId.isEmpty && $0.quantity > 0 }
        let validExtras = extras.filter { !$0.description.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }

        guard !validProducts.isEmpty || !validExtras.isEmpty else {
            return
        }

        // Clamp percent discount before sending to backend PDF endpoint.
        let clampedDiscount: Double
        switch discountType {
        case .percent: clampedDiscount = max(0, min(100, discountValue))
        case .fixed:   clampedDiscount = max(0, discountValue)
        }

        let payload = QuickQuotePDFRequestPayload(
            client: clientName.isEmpty ? nil : QuickQuotePDFClientPayload(
                name: clientName,
                phone: clientPhone,
                email: clientEmail.isEmpty ? nil : clientEmail
            ),
            products: validProducts.map { product in
                QuickQuotePDFProductPayload(
                    productId: product.productId,
                    name: availableProducts.first(where: { $0.id == product.productId })?.name ?? QuickQuoteStrings.product,
                    quantity: product.quantity,
                    unitPrice: product.unitPrice,
                    discount: product.discount
                )
            },
            extras: validExtras.map { extra in
                QuickQuotePDFExtraPayload(
                    description: extra.description,
                    cost: extra.cost,
                    price: extra.price,
                    excludeUtility: extra.excludeUtility
                )
            },
            numPeople: numPeople,
            discount: clampedDiscount,
            discountType: discountType == .percent ? "percent" : "fixed",
            requiresInvoice: requiresInvoice,
            taxRate: taxRate
        )

        do {
            let data = try await apiClient.postData(Endpoint.quickQuotePDF, body: payload)
            pdfData = data

            // Write to temp URL BEFORE presenting the share sheet.
            // Performing file I/O inside the .sheet content builder is a side effect
            // in view body — SwiftUI may call it multiple times; errors are silently
            // swallowed by try?. We write here so errors are catchable and the sheet
            // only presents when the file is ready.
            let tempURL = FileManager.default.temporaryDirectory
                .appendingPathComponent(QuickQuoteStrings.pdfFileName)
            try data.write(to: tempURL)
            pdfURL = tempURL
            showShareSheet = true
        } catch {
            pdfData = nil
            pdfURL = nil
            showShareSheet = false
            errorMessage = QuickQuoteStrings.pdfExportError
        }
    }
}

public struct FinancialSummary {
    public let productsSubtotal: Double
    public let extrasTotal: Double
    public let discountAmount: Double
    public let taxAmount: Double
    public let total: Double
    public let productCost: Double
    public let extrasCost: Double
    public let totalCost: Double
    public let profit: Double
    public let margin: Double
}
