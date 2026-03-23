import Foundation
import Observation

public struct QuickQuoteTransferData {
    public let products: [(productId: String, productName: String, quantity: Int, unitPrice: Double)]
    public let extras: [(description: String, cost: Double, price: Double, excludeUtility: Bool)]
    public let discountType: DiscountType
    public let discountValue: Double
    public let requiresInvoice: Bool
    public let numPeople: Int

    public init(
        products: [(productId: String, productName: String, quantity: Int, unitPrice: Double)],
        extras: [(description: String, cost: Double, price: Double, excludeUtility: Bool)],
        discountType: DiscountType,
        discountValue: Double,
        requiresInvoice: Bool,
        numPeople: Int
    ) {
        self.products = products
        self.extras = extras
        self.discountType = discountType
        self.discountValue = discountValue
        self.requiresInvoice = requiresInvoice
        self.numPeople = numPeople
    }
}

@Observable
public class QuickQuoteDataHolder {
    public static let shared = QuickQuoteDataHolder()
    public var pendingData: QuickQuoteTransferData?
    private init() {}
}
