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

    func testPublicRequestLinkInitWithOptionalFieldsNil() {
        let link = PublicRequestLink(
            id: "rl_1",
            organizerUserId: "u_1",
            token: "tok_1",
            label: nil,
            status: "active",
            submitMode: "auto_event",
            maxUses: nil,
            useCount: 0,
            expiresAt: "2026-12-01T00:00:00Z",
            url: "https://solennix.com/s/tok_1",
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z"
        )

        XCTAssertEqual(link.id, "rl_1")
        XCTAssertEqual(link.status, "active")
        XCTAssertEqual(link.submitMode, "auto_event")
        XCTAssertNil(link.label)
        XCTAssertNil(link.maxUses)
        XCTAssertEqual(link.shareURL, "https://solennix.com/s/tok_1")
    }

    func testPublicRequestLinkDecodeSnakeCasePayload() throws {
        let json = """
        {
          "id": "rl_2",
          "organizer_user_id": "u_2",
          "token": "tok_2",
          "label": "Link boda",
          "status": "active",
          "submit_mode": "auto_quote",
          "max_uses": 3,
          "use_count": 1,
          "url": "https://solennix.com/s/tok_2",
          "expires_at": "2026-10-01T00:00:00Z",
          "created_at": "2026-01-10T00:00:00Z",
          "updated_at": "2026-05-01T00:00:00Z"
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        let link = try decoder.decode(PublicRequestLink.self, from: json)

        XCTAssertEqual(link.label, "Link boda")
        XCTAssertEqual(link.status, "active")
        XCTAssertEqual(link.submitMode, "auto_quote")
        XCTAssertEqual(link.maxUses, 3)
        XCTAssertEqual(link.useCount, 1)
        XCTAssertEqual(link.organizerUserId, "u_2")
        XCTAssertEqual(link.shareURL, "https://solennix.com/s/tok_2")
    }

    func testPublicRequestLinkShareURLFallbackFromToken() {
        let link = PublicRequestLink(
            id: "rl_3",
            token: "abc",
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z"
        )
        XCTAssertEqual(link.shareURL, "https://solennix.com/s/abc")
    }
}
