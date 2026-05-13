import XCTest
import SolennixCore

final class QuickQuoteTransferDataTests: XCTestCase {

    override func setUp() {
        super.setUp()
        QuickQuoteDataHolder.shared.pendingData = nil
    }

    func testTransferDataStoresAllFields() {
        let data = QuickQuoteTransferData(
            products: [(productId: "p1", productName: "Taco", quantity: 3, unitPrice: 120)],
            extras: [(description: "Servicio", cost: 50, price: 80, excludeUtility: false)],
            discountType: .fixed,
            discountValue: 150,
            requiresInvoice: true,
            numPeople: 120
        )

        XCTAssertEqual(data.products.count, 1)
        XCTAssertEqual(data.products.first?.productId, "p1")
        XCTAssertEqual(data.products.first?.productName, "Taco")
        XCTAssertEqual(data.products.first?.quantity, 3)
        XCTAssertEqual(data.products.first?.unitPrice, 120)

        XCTAssertEqual(data.extras.count, 1)
        XCTAssertEqual(data.extras.first?.description, "Servicio")
        XCTAssertEqual(data.extras.first?.cost, 50)
        XCTAssertEqual(data.extras.first?.price, 80)
        XCTAssertEqual(data.extras.first?.excludeUtility, false)

        XCTAssertEqual(data.discountType, .fixed)
        XCTAssertEqual(data.discountValue, 150)
        XCTAssertTrue(data.requiresInvoice)
        XCTAssertEqual(data.numPeople, 120)
    }

    func testSharedHolderKeepsPendingDataReference() {
        let data = QuickQuoteTransferData(
            products: [(productId: "p2", productName: "Buffet", quantity: 2, unitPrice: 999)],
            extras: [],
            discountType: .percent,
            discountValue: 10,
            requiresInvoice: false,
            numPeople: 80
        )

        QuickQuoteDataHolder.shared.pendingData = data

        XCTAssertEqual(QuickQuoteDataHolder.shared.pendingData?.products.first?.productId, "p2")
        XCTAssertEqual(QuickQuoteDataHolder.shared.pendingData?.discountType, .percent)
        XCTAssertEqual(QuickQuoteDataHolder.shared.pendingData?.discountValue, 10)
        XCTAssertEqual(QuickQuoteDataHolder.shared.pendingData?.numPeople, 80)
    }

    func testSharedHolderIsSingletonInstance() {
        let first = QuickQuoteDataHolder.shared
        let second = QuickQuoteDataHolder.shared

        XCTAssertTrue(first === second)
    }

    func testDiscountTypeDecodingIsCaseInsensitiveAndFallsBackToPercent() throws {
        let upper = try JSONDecoder().decode(DiscountType.self, from: Data("\"FIXED\"".utf8))
        let unknown = try JSONDecoder().decode(DiscountType.self, from: Data("\"not_valid\"".utf8))

        XCTAssertEqual(upper, .fixed)
        XCTAssertEqual(unknown, .percent)
    }

    func testEventStatusDecodingIsCaseInsensitiveAndFallsBackToQuoted() throws {
        let upper = try JSONDecoder().decode(EventStatus.self, from: Data("\"COMPLETED\"".utf8))
        let unknown = try JSONDecoder().decode(EventStatus.self, from: Data("\"not_valid\"".utf8))

        XCTAssertEqual(upper, .completed)
        XCTAssertEqual(unknown, .quoted)
    }
}
