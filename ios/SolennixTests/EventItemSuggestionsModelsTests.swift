import XCTest
import Foundation
import SolennixCore

final class EventItemSuggestionsModelsTests: XCTestCase {

    func testEventProductInitKeepsOptionalTotalPrice() {
        let item = EventProduct(
            id: "ep_1",
            eventId: "ev_1",
            productId: "prd_1",
            quantity: 3,
            unitPrice: 250,
            discount: 50,
            totalPrice: 700,
            createdAt: "2026-05-12T00:00:00Z"
        )

        XCTAssertEqual(item.id, "ep_1")
        XCTAssertEqual(item.quantity, 3)
        XCTAssertEqual(item.totalPrice, 700)
    }

    func testEventEquipmentDecodeSnakeCasePayload() throws {
        let json = """
        {
          "id": "ee_1",
          "event_id": "ev_1",
          "inventory_id": "inv_eq_1",
          "quantity": 20,
          "notes": "llevar extras",
          "created_at": "2026-05-10T00:00:00Z",
          "equipment_name": "Silla Tiffany",
          "unit": "pieza",
          "current_stock": 120
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let equipment = try decoder.decode(EventEquipment.self, from: json)

        XCTAssertEqual(equipment.id, "ee_1")
        XCTAssertEqual(equipment.eventId, "ev_1")
        XCTAssertEqual(equipment.inventoryId, "inv_eq_1")
        XCTAssertEqual(equipment.quantity, 20)
        XCTAssertEqual(equipment.notes, "llevar extras")
        XCTAssertEqual(equipment.equipmentName, "Silla Tiffany")
        XCTAssertEqual(equipment.unit, "pieza")
        XCTAssertEqual(equipment.currentStock, 120)
    }

    func testEventSupplyDecodeSnakeCasePayload() throws {
        let json = """
        {
          "id": "es_1",
          "event_id": "ev_1",
          "inventory_id": "inv_sup_1",
          "quantity": 10.5,
          "unit_cost": 32.5,
          "source": "stock",
          "exclude_cost": false,
          "created_at": "2026-05-10T00:00:00Z",
          "supply_name": "Refresco",
          "unit": "litro",
          "current_stock": 88
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let supply = try decoder.decode(EventSupply.self, from: json)

        XCTAssertEqual(supply.id, "es_1")
        XCTAssertEqual(supply.source, .stock)
        XCTAssertFalse(supply.excludeCost)
        XCTAssertEqual(supply.supplyName, "Refresco")
        XCTAssertEqual(supply.currentStock, 88)
    }

    func testSupplySourceRejectsInvalidValue() {
        XCTAssertThrowsError(
            try JSONDecoder().decode(SupplySource.self, from: Data("\"invalid\"".utf8))
        )
    }

    func testConflictTypeDecodeInsufficientGapRawValue() throws {
        let decoded = try JSONDecoder().decode(ConflictType.self, from: Data("\"insufficient_gap\"".utf8))

        XCTAssertEqual(decoded, .insufficientGap)
    }

    func testConflictTypeAllCasesHaveExpectedRawValues() {
        XCTAssertEqual(ConflictType.overlap.rawValue, "overlap")
        XCTAssertEqual(ConflictType.insufficientGap.rawValue, "insufficient_gap")
        XCTAssertEqual(ConflictType.fullDay.rawValue, "full_day")
        XCTAssertEqual(ConflictType.allCases.count, 3)
    }

    func testConflictTypeRejectsUnknownRawValue() {
        XCTAssertThrowsError(
            try JSONDecoder().decode(ConflictType.self, from: Data("\"unknown\"".utf8))
        )
    }

    func testSupplySuggestionDecodeSnakeCasePayload() throws {
        let json = """
        {
          "id": "inv_1",
          "ingredient_name": "Hielo",
          "current_stock": 25,
          "unit": "kg",
          "unit_cost": 8.5,
          "suggested_quantity": 40
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let suggestion = try decoder.decode(SupplySuggestion.self, from: json)

        XCTAssertEqual(suggestion.id, "inv_1")
        XCTAssertEqual(suggestion.ingredientName, "Hielo")
        XCTAssertEqual(suggestion.suggestedQuantity, 40)
    }

    func testEquipmentSuggestionDecodeSnakeCasePayload() throws {
        let json = """
        {
          "id": "inv_eq_5",
          "ingredient_name": "Silla Tiffany",
          "current_stock": 120,
          "unit": "pieza",
          "type": "equipment",
          "suggested_quantity": 80
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let suggestion = try decoder.decode(EquipmentSuggestion.self, from: json)

        XCTAssertEqual(suggestion.id, "inv_eq_5")
        XCTAssertEqual(suggestion.ingredientName, "Silla Tiffany")
        XCTAssertEqual(suggestion.currentStock, 120)
        XCTAssertEqual(suggestion.unit, "pieza")
        XCTAssertEqual(suggestion.type, "equipment")
        XCTAssertEqual(suggestion.suggestedQuantity, 80)
    }

    func testEquipmentSuggestionRoundtripSnakeCaseCoding() throws {
                let json = """
                {
                    "id": "inv_eq_6",
                    "ingredient_name": "Mesa redonda",
                    "current_stock": 40,
                    "unit": "pieza",
                    "type": "equipment",
                    "suggested_quantity": 18
                }
                """.data(using: .utf8)!

                let seedDecoder = JSONDecoder()
                seedDecoder.keyDecodingStrategy = .convertFromSnakeCase
                let original = try seedDecoder.decode(EquipmentSuggestion.self, from: json)

        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        let data = try encoder.encode(original)

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        let decoded = try decoder.decode(EquipmentSuggestion.self, from: data)

        XCTAssertEqual(decoded, original)
    }

    func testEquipmentConflictDecodeSnakeCasePayload() throws {
        let json = """
        {
          "inventory_id": "inv_eq_9",
          "equipment_name": "Mesa redonda",
          "conflicting_event_id": "ev_conflict",
          "event_date": "2026-06-01",
          "start_time": "18:00",
          "end_time": "23:00",
          "service_type": "Boda",
          "client_name": "Mariana",
          "conflict_type": "overlap"
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let conflict = try decoder.decode(EquipmentConflict.self, from: json)

        XCTAssertEqual(conflict.inventoryId, "inv_eq_9")
        XCTAssertEqual(conflict.clientName, "Mariana")
        XCTAssertEqual(conflict.conflictType, .overlap)
    }

    func testEquipmentAvailabilityDecodeSnakeCasePayload() throws {
        let json = """
        {
          "inventory_id": "inv_eq_3",
          "available": 12
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let availability = try decoder.decode(EquipmentAvailability.self, from: json)

        XCTAssertEqual(availability.inventoryId, "inv_eq_3")
        XCTAssertEqual(availability.available, 12)
    }
}
