import XCTest
import Foundation
import SolennixCore

final class TeamAndAvailabilityModelTests: XCTestCase {

    func testStaffTeamMemberComputedIdUsesTeamAndStaffIds() {
        let member = StaffTeamMember(
            teamId: "team_1",
            staffId: "staff_9",
            isLead: true,
            position: 1,
            createdAt: "2026-01-01T00:00:00Z"
        )

        XCTAssertEqual(member.id, "team_1:staff_9")
    }

    func testStaffTeamInitKeepsMembersAndMemberCount() {
        let members = [
            StaffTeamMember(teamId: "team_1", staffId: "staff_1", isLead: true, position: 0),
            StaffTeamMember(teamId: "team_1", staffId: "staff_2", isLead: false, position: 1)
        ]

        let team = StaffTeam(
            id: "team_1",
            userId: "user_1",
            name: "Equipo Banquetes",
            roleLabel: "Meseros",
            notes: "Turno noche",
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-02T00:00:00Z",
            members: members,
            memberCount: 2
        )

        XCTAssertEqual(team.id, "team_1")
        XCTAssertEqual(team.name, "Equipo Banquetes")
        XCTAssertEqual(team.members?.count, 2)
        XCTAssertEqual(team.memberCount, 2)
    }

    func testTeamMemberAssignmentComputedIdMatchesEventStaffId() throws {
        let json = """
        {
          "event_staff_id": "es_42",
          "event_id": "ev_1",
          "event_name": "Boda Ana",
          "event_date": "2026-03-10",
          "staff_id": "st_7",
          "status": "pending",
          "role_override": null,
          "notes": null,
          "shift_start": null,
          "shift_end": null,
          "offer_group_id": null,
          "offer_slots": null,
          "notification_last_result": null,
          "notification_sent_at": null
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let assignment = try decoder.decode(TeamMemberAssignment.self, from: json)

        XCTAssertEqual(assignment.id, "es_42")
        XCTAssertEqual(assignment.status, .pending)
    }

    func testAssignmentResponseOutcomeDecodesFromSnakeCase() throws {
        let json = """
        {
          "event_staff_id": "es_10",
          "final_status": "confirmed",
          "seats_remaining": 1,
          "auto_declined_count": 2
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let outcome = try decoder.decode(AssignmentResponseOutcome.self, from: json)

        XCTAssertEqual(outcome.eventStaffId, "es_10")
        XCTAssertEqual(outcome.finalStatus, .confirmed)
        XCTAssertEqual(outcome.seatsRemaining, 1)
        XCTAssertEqual(outcome.autoDeclinedCount, 2)
    }

    func testAssignmentPortalResponseDecodesBothValues() throws {
        let accepted = try JSONDecoder().decode(AssignmentPortalResponse.self, from: Data("\"accept\"".utf8))
        let declined = try JSONDecoder().decode(AssignmentPortalResponse.self, from: Data("\"decline\"".utf8))

        XCTAssertEqual(accepted, .accept)
        XCTAssertEqual(declined, .decline)
    }

    func testTopClientInitMapsEventCountIntoTotalEvents() {
        let client = TopClient(id: "c_1", name: "Cliente VIP", totalSpent: 15300.5, eventCount: 4)

        XCTAssertEqual(client.totalEvents, 4)
        XCTAssertEqual(client.eventCount, 4)
        XCTAssertEqual(client.totalSpent, 15300.5)
    }

    func testTopClientDecodingFromSnakeCaseMapsComputedEventCount() throws {
        let json = """
        {
          "id": "c_2",
          "name": "Cliente Corporativo",
          "total_spent": 8800,
          "total_events": 3
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let client = try decoder.decode(TopClient.self, from: json)

        XCTAssertEqual(client.totalEvents, 3)
        XCTAssertEqual(client.eventCount, 3)
        XCTAssertEqual(client.name, "Cliente Corporativo")
    }

    func testStaffAvailabilityComputedIdMatchesStaffId() {
        let availability = StaffAvailability(
            staffId: "staff_88",
            staffName: "Laura",
            assignments: []
        )

        XCTAssertEqual(availability.id, "staff_88")
        XCTAssertEqual(availability.assignments.count, 0)
    }

    func testStaffAvailabilityAssignmentInitKeepsOptionalShifts() {
        let assignment = StaffAvailabilityAssignment(
            eventId: "ev_22",
            eventName: "Quince Sofi",
            eventDate: "2026-06-15",
            shiftStart: "2026-06-15T18:00:00Z",
            shiftEnd: "2026-06-16T02:00:00Z",
            status: "confirmed"
        )

        XCTAssertEqual(assignment.eventId, "ev_22")
        XCTAssertEqual(assignment.shiftStart, "2026-06-15T18:00:00Z")
        XCTAssertEqual(assignment.shiftEnd, "2026-06-16T02:00:00Z")
        XCTAssertEqual(assignment.status, "confirmed")
    }
}
