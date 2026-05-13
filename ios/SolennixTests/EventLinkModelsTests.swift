import XCTest
import Foundation
import SolennixCore

final class EventLinkModelsTests: XCTestCase {

    func testEventPublicLinkInitPreservesAllFields() {
        let link = EventPublicLink(
            id: "pl_1",
            eventId: "ev_1",
            userId: "u_1",
            token: "abc123",
            status: .active,
            expiresAt: "2026-12-31T00:00:00Z",
            revokedAt: nil,
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-02T00:00:00Z",
            url: "https://solennix.com/p/abc123"
        )

        XCTAssertEqual(link.id, "pl_1")
        XCTAssertEqual(link.eventId, "ev_1")
        XCTAssertEqual(link.status, .active)
        XCTAssertEqual(link.expiresAt, "2026-12-31T00:00:00Z")
        XCTAssertNil(link.revokedAt)
        XCTAssertEqual(link.url, "https://solennix.com/p/abc123")
    }

    func testEventPublicLinkDecodeSnakeCasePayload() throws {
        let json = """
        {
          "id": "pl_2",
          "event_id": "ev_2",
          "user_id": "u_2",
          "token": "xyz999",
          "status": "revoked",
          "expires_at": null,
          "revoked_at": "2026-03-01T00:00:00Z",
          "created_at": "2026-02-01T00:00:00Z",
          "updated_at": "2026-03-01T00:00:00Z",
          "url": "https://solennix.com/p/xyz999"
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let link = try decoder.decode(EventPublicLink.self, from: json)

        XCTAssertEqual(link.status, .revoked)
        XCTAssertNil(link.expiresAt)
        XCTAssertEqual(link.revokedAt, "2026-03-01T00:00:00Z")
    }

    func testEventPublicLinkStatusRejectsInvalidRawValue() {
        XCTAssertThrowsError(
            try JSONDecoder().decode(EventPublicLinkStatus.self, from: Data("\"unknown\"".utf8))
        )
    }

    func testEventFormLinkInitWithOptionalFieldsNil() {
        let form = EventFormLink(
            id: "fl_1",
            userId: "u_1",
            token: "tok_1",
            label: nil,
            status: "active",
            submittedEventId: nil,
            submittedClientId: nil,
            url: "https://solennix.com/f/tok_1",
            expiresAt: "2026-12-01T00:00:00Z",
            usedAt: nil,
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z"
        )

        XCTAssertEqual(form.id, "fl_1")
        XCTAssertEqual(form.status, "active")
        XCTAssertNil(form.label)
        XCTAssertNil(form.submittedEventId)
        XCTAssertNil(form.submittedClientId)
        XCTAssertNil(form.usedAt)
    }

    func testEventFormLinkDecodeSnakeCasePayload() throws {
        let json = """
        {
          "id": "fl_2",
          "user_id": "u_2",
          "token": "tok_2",
          "label": "Formulario boda",
          "status": "used",
          "submitted_event_id": "ev_9",
          "submitted_client_id": "cl_9",
          "url": "https://solennix.com/f/tok_2",
          "expires_at": "2026-10-01T00:00:00Z",
          "used_at": "2026-05-01T00:00:00Z",
          "created_at": "2026-01-10T00:00:00Z",
          "updated_at": "2026-05-01T00:00:00Z"
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let form = try decoder.decode(EventFormLink.self, from: json)

        XCTAssertEqual(form.label, "Formulario boda")
        XCTAssertEqual(form.status, "used")
        XCTAssertEqual(form.submittedEventId, "ev_9")
        XCTAssertEqual(form.submittedClientId, "cl_9")
        XCTAssertEqual(form.usedAt, "2026-05-01T00:00:00Z")
    }
}
