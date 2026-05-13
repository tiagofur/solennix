import XCTest
import SolennixCore

final class CachedModelConversionTests: XCTestCase {

    func testCachedEventInitFromEventStoresEnumRawValues() {
        let event = Event(
            id: "ev_1",
            userId: "u_1",
            clientId: "c_1",
            eventDate: "2026-09-10",
            startTime: "18:00",
            endTime: "23:00",
            serviceType: "Boda",
            numPeople: 120,
            status: .confirmed,
            discount: 10,
            discountType: .fixed,
            requiresInvoice: true,
            taxRate: 0.16,
            taxAmount: 100,
            totalAmount: 1200,
            location: "Salon Centro",
            city: "CDMX",
            depositPercent: 30,
            cancellationDays: 15,
            refundPercent: 50,
            notes: "Sin frutos secos",
            photos: "[]",
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-02T00:00:00Z"
        )

        let cached = CachedEvent(from: event)

        XCTAssertEqual(cached.statusRawValue, "confirmed")
        XCTAssertEqual(cached.discountTypeRawValue, "fixed")
        XCTAssertEqual(cached.id, "ev_1")
        XCTAssertEqual(cached.city, "CDMX")
    }

    func testCachedEventToEventFallsBackWhenRawValuesAreInvalid() {
        let cached = CachedEvent(
            id: "ev_2",
            userId: "u_2",
            clientId: "c_2",
            eventDate: "2026-10-10",
            serviceType: "Corporativo",
            numPeople: 80,
            statusRawValue: "invalid_status",
            discount: 0,
            discountTypeRawValue: "invalid_discount",
            requiresInvoice: false,
            taxRate: 0.16,
            taxAmount: 0,
            totalAmount: 800,
            createdAt: "2026-02-01T00:00:00Z",
            updatedAt: "2026-02-02T00:00:00Z"
        )

        let event = cached.toEvent()

        XCTAssertEqual(event.status, .quoted)
        XCTAssertEqual(event.discountType, .percent)
        XCTAssertEqual(event.totalAmount, 800)
    }

    func testCachedInventoryItemInitFromInventoryStoresTypeRawValue() {
        let item = InventoryItem(
            id: "inv_1",
            userId: "u_1",
            ingredientName: "Silla Tiffany",
            currentStock: 200,
            minimumStock: 50,
            unit: "pieza",
            unitCost: 45.5,
            lastUpdated: "2026-03-01T00:00:00Z",
            type: .equipment
        )

        let cached = CachedInventoryItem(from: item)

        XCTAssertEqual(cached.typeRawValue, "equipment")
        XCTAssertEqual(cached.unitCost, 45.5)
        XCTAssertEqual(cached.ingredientName, "Silla Tiffany")
    }

    func testCachedInventoryItemToInventoryFallsBackToIngredientForInvalidType() {
        let cached = CachedInventoryItem(
            id: "inv_2",
            userId: "u_2",
            ingredientName: "Mantel",
            currentStock: 10,
            minimumStock: 2,
            unit: "pieza",
            unitCost: nil,
            lastUpdated: "2026-03-10T00:00:00Z",
            typeRawValue: "invalid_type"
        )

        let item = cached.toInventoryItem()

        XCTAssertEqual(item.type, .ingredient)
        XCTAssertNil(item.unitCost)
        XCTAssertEqual(item.currentStock, 10)
    }

    func testCachedProductInitFromProductSerializesRecipeJSON() {
        let product = Product(
            id: "prd_1",
            userId: "u_1",
            name: "Paquete Banquete",
            category: "Servicio",
            basePrice: 2500,
            recipe: AnyCodable(["protein": "pollo", "qty": 12]),
            imageUrl: "https://cdn.solennix.com/p1.png",
            isActive: true,
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-02T00:00:00Z"
        )

        let cached = CachedProduct(from: product)

        XCTAssertNotNil(cached.recipeJSON)
        XCTAssertTrue(cached.recipeJSON?.contains("protein") ?? false)
        XCTAssertEqual(cached.name, "Paquete Banquete")
    }

    func testCachedProductToProductFallsBackToNilRecipeForInvalidJSON() {
        let cached = CachedProduct(
            id: "prd_2",
            userId: "u_2",
            name: "Paquete Corporativo",
            category: "Servicio",
            basePrice: 3000,
            recipeJSON: "{invalid_json}",
            isActive: false,
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-02T00:00:00Z"
        )

        let product = cached.toProduct()

        XCTAssertNil(product.recipe)
        XCTAssertFalse(product.isActive)
        XCTAssertEqual(product.basePrice, 3000)
    }

    func testCachedProductToProductDecodesValidRecipeJSON() {
        let cached = CachedProduct(
            id: "prd_3",
            userId: "u_3",
            name: "Paquete Premium",
            category: "Servicio",
            basePrice: 4500,
            recipeJSON: "{\"menu\":\"premium\",\"count\":4}",
            isActive: true,
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-02T00:00:00Z"
        )

        let product = cached.toProduct()

        XCTAssertNotNil(product.recipe)
        guard case .object(let recipe)? = product.recipe?.value else {
            return XCTFail("Expected recipe object payload")
        }
        if case .string(let menu)? = recipe["menu"] {
            XCTAssertEqual(menu, "premium")
        } else {
            XCTFail("Expected recipe menu string")
        }
    }

    func testCachedPaymentRoundtripPreservesOptionalNotes() throws {
                let paymentJSON = """
                {
                    "id": "pay_1",
                    "event_id": "ev_1",
                    "user_id": "u_1",
                    "amount": 1200,
                    "payment_date": "2026-04-10",
                    "payment_method": "transfer",
                    "notes": "Anticipo",
                    "created_at": "2026-04-10T00:00:00Z"
                }
                """.data(using: .utf8)!

                let decoder = JSONDecoder()
                decoder.keyDecodingStrategy = .convertFromSnakeCase
                let payment = try decoder.decode(Payment.self, from: paymentJSON)

        let cached = CachedPayment(from: payment)
        let restored = cached.toPayment()

        XCTAssertEqual(restored.id, "pay_1")
        XCTAssertEqual(restored.notes, "Anticipo")
        XCTAssertEqual(restored.paymentMethod, "transfer")
    }

    func testCachedClientRoundtripPreservesTotalsAndOptionals() {
        let client = Client(
            id: "cl_1",
            userId: "u_1",
            name: "Ana",
            phone: "+5215511111111",
            email: "ana@solennix.com",
            address: "Roma Norte",
            city: "CDMX",
            notes: "Prefiere WhatsApp",
            photoUrl: "https://cdn.solennix.com/ana.png",
            totalEvents: 5,
            totalSpent: 15500,
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-02T00:00:00Z"
        )

        let cached = CachedClient(from: client)
        let restored = cached.toClient()

        XCTAssertEqual(restored.totalEvents, 5)
        XCTAssertEqual(restored.totalSpent, 15500)
        XCTAssertEqual(restored.city, "CDMX")
        XCTAssertEqual(restored.email, "ana@solennix.com")
    }
}
