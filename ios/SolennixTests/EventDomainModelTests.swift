import XCTest
import Foundation
import SolennixCore

final class EventDomainModelTests: XCTestCase {

    func testEventExtraDecodingDefaultsOptionalBooleans() throws {
        let json = """
        {
          "id": "extra_1",
          "eventId": "ev_1",
          "description": "Servicio de montaje",
          "cost": 150.0,
          "price": 250.0,
          "createdAt": "2026-01-01T00:00:00Z"
        }
        """.data(using: .utf8)!

        let extra = try JSONDecoder().decode(EventExtra.self, from: json)

        XCTAssertEqual(extra.id, "extra_1")
        XCTAssertFalse(extra.excludeUtility)
        XCTAssertTrue(extra.includeInChecklist)
    }

    func testEventExtraDecodingKeepsExplicitBooleanValues() throws {
        let json = """
        {
          "id": "extra_2",
          "eventId": "ev_1",
          "description": "Horas extra",
          "cost": 300.0,
          "price": 450.0,
          "excludeUtility": true,
          "includeInChecklist": false,
          "createdAt": "2026-01-01T00:00:00Z"
        }
        """.data(using: .utf8)!

        let extra = try JSONDecoder().decode(EventExtra.self, from: json)

        XCTAssertTrue(extra.excludeUtility)
        XCTAssertFalse(extra.includeInChecklist)
    }

    func testEventStaffAssignmentStatusFallsBackToConfirmedWhenNil() {
        let assignment = EventStaff(
            id: "es_1",
            eventId: "ev_1",
            staffId: "st_1",
            createdAt: "2026-01-01T00:00:00Z",
            status: nil
        )

        XCTAssertEqual(assignment.assignmentStatus, .confirmed)
    }

    func testEventStaffAssignmentStatusFallsBackToConfirmedWhenInvalid() {
        let assignment = EventStaff(
            id: "es_2",
            eventId: "ev_1",
            staffId: "st_1",
            createdAt: "2026-01-01T00:00:00Z",
            status: "unknown_status"
        )

        XCTAssertEqual(assignment.assignmentStatus, .confirmed)
    }

    func testEventStaffAssignmentStatusUsesValidRawStatus() {
        let assignment = EventStaff(
            id: "es_3",
            eventId: "ev_1",
            staffId: "st_1",
            createdAt: "2026-01-01T00:00:00Z",
            status: "pending"
        )

        XCTAssertEqual(assignment.assignmentStatus, .pending)
    }

    func testEventStaffDecodingMapsSnakeCaseJoinedFields() throws {
        let json = """
        {
          "id": "es_4",
          "event_id": "ev_2",
          "staff_id": "st_9",
          "fee_amount": 1200,
          "role_override": "Mesero",
          "notes": "Llegar 1h antes",
          "notification_sent_at": "2026-01-02T00:00:00Z",
          "notification_last_result": "ok",
          "created_at": "2026-01-01T00:00:00Z",
          "shift_start": "2026-03-01T18:00:00Z",
          "shift_end": "2026-03-02T02:00:00Z",
          "status": "declined",
          "staff_name": "Luis",
          "staff_role_label": "Capitan",
          "staff_phone": "+5215512345678",
          "staff_email": "luis@solennix.com"
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let assignment = try decoder.decode(EventStaff.self, from: json)

        XCTAssertEqual(assignment.eventId, "ev_2")
        XCTAssertEqual(assignment.staffId, "st_9")
        XCTAssertEqual(assignment.feeAmount, 1200)
        XCTAssertEqual(assignment.roleOverride, "Mesero")
        XCTAssertEqual(assignment.assignmentStatus, .declined)
        XCTAssertEqual(assignment.staffName, "Luis")
        XCTAssertEqual(assignment.staffRoleLabel, "Capitan")
        XCTAssertEqual(assignment.staffPhone, "+5215512345678")
        XCTAssertEqual(assignment.staffEmail, "luis@solennix.com")
    }
}
