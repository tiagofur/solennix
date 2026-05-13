import XCTest
import Foundation
import SolennixCore

final class StaffInviteIngredientModelsTests: XCTestCase {

    func testStaffInitDefaultsOptionalFieldsAndNotificationOptIn() {
        let staff = Staff(
            id: "st_1",
            userId: "u_1",
            name: "Luis",
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-02T00:00:00Z"
        )

        XCTAssertEqual(staff.id, "st_1")
        XCTAssertEqual(staff.name, "Luis")
        XCTAssertNil(staff.roleLabel)
        XCTAssertNil(staff.phone)
        XCTAssertNil(staff.email)
        XCTAssertNil(staff.notes)
        XCTAssertFalse(staff.notificationEmailOptIn)
        XCTAssertNil(staff.invitedUserId)
    }

    func testStaffDecodeSnakeCasePayload() throws {
        let json = """
        {
          "id": "st_2",
          "user_id": "u_2",
          "name": "Mariana",
          "role_label": "Capitana",
          "phone": "+525511223344",
          "email": "mariana@solennix.com",
          "notes": "Solo eventos nocturnos",
          "notification_email_opt_in": true,
          "invited_user_id": "usr_99",
          "created_at": "2026-02-01T00:00:00Z",
          "updated_at": "2026-02-10T00:00:00Z"
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let staff = try decoder.decode(Staff.self, from: json)

        XCTAssertEqual(staff.roleLabel, "Capitana")
        XCTAssertEqual(staff.phone, "+525511223344")
        XCTAssertTrue(staff.notificationEmailOptIn)
        XCTAssertEqual(staff.invitedUserId, "usr_99")
    }

    func testStaffInviteResponseDecodeSnakeCasePayload() throws {
        let json = """
        {
          "invite_id": "inv_1",
          "staff_id": "st_3",
          "email": "staff@solennix.com",
          "status": "pending",
          "accept_url": "https://solennix.com/invite/abc",
          "expires_at": "2026-03-01T00:00:00Z",
          "created_at": "2026-02-01T00:00:00Z"
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let invite = try decoder.decode(StaffInviteResponse.self, from: json)

        XCTAssertEqual(invite.inviteId, "inv_1")
        XCTAssertEqual(invite.staffId, "st_3")
        XCTAssertEqual(invite.status, "pending")
        XCTAssertEqual(invite.acceptUrl, "https://solennix.com/invite/abc")
    }

    func testProductIngredientDecodeSnakeCasePayload() throws {
        let json = """
        {
          "id": "pi_1",
          "product_id": "prd_1",
          "inventory_id": "inv_1",
          "quantity_required": 2.5,
          "capacity": 100,
          "bring_to_event": true,
          "created_at": "2026-02-05T00:00:00Z",
          "ingredient_name": "Queso",
          "unit": "kg",
          "unit_cost": 120.0,
          "type": "ingredient"
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let ingredient = try decoder.decode(ProductIngredient.self, from: json)

        XCTAssertEqual(ingredient.id, "pi_1")
        XCTAssertEqual(ingredient.productId, "prd_1")
        XCTAssertEqual(ingredient.inventoryId, "inv_1")
        XCTAssertEqual(ingredient.quantityRequired, 2.5)
        XCTAssertEqual(ingredient.capacity, 100)
        XCTAssertEqual(ingredient.bringToEvent, true)
        XCTAssertEqual(ingredient.ingredientName, "Queso")
        XCTAssertEqual(ingredient.unit, "kg")
        XCTAssertEqual(ingredient.unitCost, 120.0)
        XCTAssertEqual(ingredient.type, .ingredient)
    }

    func testProductIngredientDecodeWithoutOptionalFields() throws {
        let json = """
        {
          "id": "pi_2",
          "product_id": "prd_2",
          "inventory_id": "inv_2",
          "quantity_required": 1,
          "created_at": "2026-02-05T00:00:00Z"
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let ingredient = try decoder.decode(ProductIngredient.self, from: json)

        XCTAssertNil(ingredient.capacity)
        XCTAssertNil(ingredient.bringToEvent)
        XCTAssertNil(ingredient.ingredientName)
        XCTAssertNil(ingredient.unit)
        XCTAssertNil(ingredient.unitCost)
        XCTAssertNil(ingredient.type)
    }
}
