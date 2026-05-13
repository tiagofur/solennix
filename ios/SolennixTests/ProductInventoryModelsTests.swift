import XCTest
import Foundation
import SolennixCore

final class ProductInventoryModelsTests: XCTestCase {

    func testProductInitDefaultsOptionalFields() {
        let product = Product(
            id: "prd_1",
            userId: "u_1",
            name: "Paquete Básico",
            category: "Servicio",
            basePrice: 1500,
            isActive: true,
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-02T00:00:00Z"
        )

        XCTAssertEqual(product.id, "prd_1")
        XCTAssertEqual(product.name, "Paquete Básico")
        XCTAssertEqual(product.basePrice, 1500)
        XCTAssertNil(product.recipe)
        XCTAssertNil(product.imageUrl)
        XCTAssertNil(product.staffTeamId)
        XCTAssertTrue(product.isActive)
    }

    func testProductDecodeSnakeCasePayloadWithRecipeAndTeam() throws {
        let json = """
        {
          "id": "prd_2",
          "user_id": "u_2",
          "name": "Paquete Premium",
          "category": "Catering",
          "base_price": 3200.5,
          "recipe": {
            "protein": "res",
            "servings": 80
          },
          "image_url": "https://cdn.solennix.com/p2.png",
          "staff_team_id": "team_7",
          "is_active": false,
          "created_at": "2026-02-01T00:00:00Z",
          "updated_at": "2026-02-05T00:00:00Z"
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let product = try decoder.decode(Product.self, from: json)

        XCTAssertEqual(product.userId, "u_2")
        XCTAssertEqual(product.basePrice, 3200.5)
        XCTAssertEqual(product.imageUrl, "https://cdn.solennix.com/p2.png")
        XCTAssertEqual(product.staffTeamId, "team_7")
        XCTAssertFalse(product.isActive)
        XCTAssertNotNil(product.recipe)

        guard case let .object(recipe)? = product.recipe?.value else {
            XCTFail("Expected recipe object")
            return
        }

        guard case let .string(protein)? = recipe["protein"] else {
            XCTFail("Expected protein string")
            return
        }

        guard case let .int(servings)? = recipe["servings"] else {
            XCTFail("Expected servings int")
            return
        }

        XCTAssertEqual(protein, "res")
        XCTAssertEqual(servings, 80)
    }

    func testProductRoundtripSnakeCaseCoding() throws {
        let original = Product(
            id: "prd_3",
            userId: "u_3",
            name: "Buffet Ejecutivo",
            category: "Corporativo",
            basePrice: 5000,
            recipe: AnyCodable(["menu": "executive"]),
            imageUrl: nil,
            staffTeamId: "team_exec",
            isActive: true,
            createdAt: "2026-03-01T00:00:00Z",
            updatedAt: "2026-03-02T00:00:00Z"
        )

        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        let data = try encoder.encode(original)

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        let decoded = try decoder.decode(Product.self, from: data)

        XCTAssertEqual(decoded.id, original.id)
        XCTAssertEqual(decoded.userId, original.userId)
        XCTAssertEqual(decoded.staffTeamId, original.staffTeamId)
        XCTAssertEqual(decoded.basePrice, original.basePrice)
        XCTAssertEqual(decoded.isActive, original.isActive)
    }

    func testInventoryItemInitWithAndWithoutUnitCost() {
        let withCost = InventoryItem(
            id: "inv_1",
            userId: "u_1",
            ingredientName: "Vaso",
            currentStock: 300,
            minimumStock: 50,
            unit: "pieza",
            unitCost: 2.5,
            lastUpdated: "2026-04-01T00:00:00Z",
            type: .supply
        )

        let withoutCost = InventoryItem(
            id: "inv_2",
            userId: "u_1",
            ingredientName: "Mantel",
            currentStock: 40,
            minimumStock: 10,
            unit: "pieza",
            lastUpdated: "2026-04-01T00:00:00Z",
            type: .equipment
        )

        XCTAssertEqual(withCost.unitCost, 2.5)
        XCTAssertEqual(withCost.type, .supply)
        XCTAssertNil(withoutCost.unitCost)
        XCTAssertEqual(withoutCost.type, .equipment)
    }

    func testInventoryItemDecodeSnakeCasePayload() throws {
        let json = """
        {
          "id": "inv_3",
          "user_id": "u_2",
          "ingredient_name": "Queso Oaxaca",
          "current_stock": 24.5,
          "minimum_stock": 5,
          "unit": "kg",
          "unit_cost": 110.75,
          "last_updated": "2026-04-15T00:00:00Z",
          "type": "ingredient"
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let item = try decoder.decode(InventoryItem.self, from: json)

        XCTAssertEqual(item.id, "inv_3")
        XCTAssertEqual(item.ingredientName, "Queso Oaxaca")
        XCTAssertEqual(item.currentStock, 24.5)
        XCTAssertEqual(item.minimumStock, 5)
        XCTAssertEqual(item.unitCost, 110.75)
        XCTAssertEqual(item.type, .ingredient)
    }

    func testInventoryTypeRejectsInvalidRawValue() {
        XCTAssertThrowsError(
            try JSONDecoder().decode(InventoryType.self, from: Data("\"unknown\"".utf8))
        )
    }
}
