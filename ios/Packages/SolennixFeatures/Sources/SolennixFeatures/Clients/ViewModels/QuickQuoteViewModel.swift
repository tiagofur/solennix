import Foundation
import UIKit
import SolennixCore
import SolennixNetwork

@Observable
public final class QuickQuoteViewModel {
    let apiClient: APIClient

    // Form Data
    public var numPeople: Int = 100
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
    public var showShareSheet: Bool = false

    public init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    @MainActor
    public func loadData() async {
        isLoading = true
        do {
            let products: [Product] = try await apiClient.get(Endpoint.products)
            availableProducts = products.filter { $0.isActive }
        } catch {
            print("Error loading products for quick quote: \(error)")
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
            Task {
                await fetchIngredientCost(for: first.id)
            }
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
            let cost = ingredients
                .filter { $0.type == .ingredient }
                .reduce(0.0) { sum, ing in
                    sum + (ing.quantityRequired * (ing.unitCost ?? 0.0))
                }
            productUnitCosts[productId] = cost
        } catch {
            print("Error fetching ingredient costs: \(error)")
        }
    }

    public func updateCostsForCurrentProducts() {
        for product in selectedProducts {
            Task {
                await fetchIngredientCost(for: product.productId)
            }
        }
    }

    // Financial calculations
    public var financials: FinancialSummary {
        let productsSubtotal = selectedProducts.reduce(0.0) { sum, item in
            sum + ((item.unitPrice - item.discount) * Double(item.quantity))
        }

        let normalExtrasTotal = extras.filter { !$0.excludeUtility }.reduce(0.0) { $0 + $1.price }
        let passThroughExtrasTotal = extras.filter { $0.excludeUtility }.reduce(0.0) { $0 + $1.price }
        let extrasTotal = extras.reduce(0.0) { $0 + $1.price }

        let discountableBase = productsSubtotal + normalExtrasTotal

        let discountAmount: Double
        if discountType == .percent {
            discountAmount = discountableBase * (discountValue / 100)
        } else {
            discountAmount = min(discountValue, discountableBase)
        }

        let discountedBase = discountableBase - discountAmount
        let baseTotal = discountedBase + passThroughExtrasTotal

        let taxAmount = requiresInvoice ? baseTotal * (taxRate / 100) : 0
        let total = baseTotal + taxAmount

        // Costs
        let productCost = selectedProducts.reduce(0.0) { sum, p in
            sum + ((productUnitCosts[p.productId] ?? 0) * Double(p.quantity))
        }
        let extrasCost = extras.reduce(0.0) { $0 + $1.cost }
        let totalCost = productCost + extrasCost

        let revenue = total - (requiresInvoice ? taxAmount : 0)
        let profit = revenue - totalCost

        let passThroughRevenue = passThroughExtrasTotal
        let adjustedRevenue = revenue - passThroughRevenue
        let margin = adjustedRevenue > 0 ? (profit / adjustedRevenue) * 100 : 0

        return FinancialSummary(
            productsSubtotal: productsSubtotal,
            extrasTotal: extrasTotal,
            discountAmount: discountAmount,
            taxAmount: taxAmount,
            total: total,
            productCost: productCost,
            extrasCost: extrasCost,
            totalCost: totalCost,
            profit: profit,
            margin: margin
        )
    }

    // MARK: - PDF Generation

    /// Generates a quick quote PDF using current form data.
    public func generatePDF(profile: User?) {
        let fin = financials

        let items: [QuickQuotePDFGenerator.QuoteItem] = selectedProducts.compactMap { product in
            let name = availableProducts.first(where: { $0.id == product.productId })?.name ?? "Producto"
            let total = Double(product.quantity) * product.unitPrice
            return QuickQuotePDFGenerator.QuoteItem(
                name: name,
                quantity: product.quantity,
                unitPrice: product.unitPrice,
                total: total
            )
        }

        let quoteExtras: [QuickQuotePDFGenerator.QuoteExtra] = extras.map { extra in
            QuickQuotePDFGenerator.QuoteExtra(
                description: extra.description,
                price: extra.price
            )
        }

        let discountLabel: String
        if discountType == .percent && discountValue > 0 {
            discountLabel = "\(Int(discountValue))%"
        } else if discountValue > 0 {
            discountLabel = PDFConstants.formatCurrency(discountValue)
        } else {
            discountLabel = ""
        }

        pdfData = QuickQuotePDFGenerator.generate(
            profile: profile,
            numPeople: numPeople,
            items: items,
            extras: quoteExtras,
            productsSubtotal: fin.productsSubtotal,
            extrasTotal: fin.extrasTotal,
            discountAmount: fin.discountAmount,
            discountLabel: discountLabel,
            taxAmount: fin.taxAmount,
            taxRate: taxRate,
            total: fin.total
        )
        showShareSheet = true
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
