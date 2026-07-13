import XCTest
import CoreSpotlight
@testable import Solennix

final class DeepLinkHandlerTests: XCTestCase {

    func testHandleResetPasswordWithToken() {
        // JWT-shaped token: three Base64URL segments (mirrors backend output).
        let token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJwYXNzd29yZC1yZXNldCJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
        let url = URL(string: "solennix://reset-password?token=\(token)")!
        let action = DeepLinkHandler.handle(url)

        XCTAssertEqual(action, .resetPassword(token: token))
    }

    func testHandleTeamInviteWithToken() {
        // 64-char lowercase hex (mirrors backend `generateFormToken` output).
        let token = "5b3f8e9a2c1d4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2a4b6c8d0e2f4a"
        let url = URL(string: "solennix://team-invite?token=\(token)")!
        let action = DeepLinkHandler.handle(url)

        XCTAssertEqual(action, .teamInvite(token: token))
    }

    // MARK: - Token Format Validation (#815)

    func testHandleResetPasswordRejectsNonJWTToken() {
        // Reject placeholder strings, wrong segment counts, and invalid chars.
        // Note: the regex validates JWT shape (3 Base64URL segments), not
        // cryptographic validity — that's the server's job.
        let badTokens = [
            "abc123",                       // no dots — not a JWT
            "not.a.jwt.with.four.segments", // too many segments
            "two.segments",                 // too few segments
            "seg1.seg2.seg3!",              // invalid char (!)
        ]
        for token in badTokens {
            // Percent-encode so invalid chars survive URL parsing.
            let encoded = token.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? token
            let url = URL(string: "solennix://reset-password?token=\(encoded)")!
            XCTAssertNil(DeepLinkHandler.handle(url), "should reject non-JWT token: \(token)")
        }
    }

    func testHandleTeamInviteRejectsNonHexToken() {
        // Reject wrong length, non-hex chars, and uppercase.
        let badTokens = [
            "invite-token",                                                          // non-hex chars
            String(repeating: "a", count: 32),                                       // too short (32 chars)
            String(repeating: "a", count: 128),                                      // too long (128 chars)
            "5B3F8E9A2C1D4F6A8B0C2D4E6F8A0B2C4D6E8F0A2B4C6D8E0F2A4B6C8D0E2F4",       // uppercase
            "5b3f8e9a2c1d4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2a4b6c8d0e2g4",       // 'g' not hex
        ]
        for token in badTokens {
            let url = URL(string: "solennix://team-invite?token=\(token)")!
            XCTAssertNil(DeepLinkHandler.handle(url), "should reject non-hex64 token: \(token)")
        }
    }

    func testHandleRejectsInvalidScheme() {
        let url = URL(string: "https://reset-password?token=abc123")!
        let action = DeepLinkHandler.handle(url)

        XCTAssertNil(action)
    }

    func testHandleRejectsMissingOrEmptyToken() {
        let missingTokenURL = URL(string: "solennix://reset-password")!
        let emptyTokenURL = URL(string: "solennix://team-invite?token=")!

        XCTAssertNil(DeepLinkHandler.handle(missingTokenURL))
        XCTAssertNil(DeepLinkHandler.handle(emptyTokenURL))
    }

    func testHandleRejectsUnknownHost() {
        let url = URL(string: "solennix://something-else?token=abc")!

        XCTAssertNil(DeepLinkHandler.handle(url))
    }

    // MARK: - Event Route Parsing

    func testHandleEventDetailWithId() {
        let url = URL(string: "solennix://event/abc123")!
        let action = DeepLinkHandler.handle(url)

        XCTAssertEqual(action, .showEvent(id: "abc123"))
    }

    func testHandleEventPaymentWithId() {
        let url = URL(string: "solennix://event/abc123/payment")!
        let action = DeepLinkHandler.handle(url)

        XCTAssertEqual(action, .showEventPayment(id: "abc123"))
    }

    func testHandleEventRejectsMissingId() {
        let url = URL(string: "solennix://event/")!

        XCTAssertNil(DeepLinkHandler.handle(url))
    }

    func testHandleEventRejectsUnknownSubPath() {
        let url = URL(string: "solennix://event/abc123/unknown")!

        XCTAssertNil(DeepLinkHandler.handle(url))
    }

    func testHandleEventRejectsExtraPathSegments() {
        let url = URL(string: "solennix://event/abc123/payment/extra")!

        XCTAssertNil(DeepLinkHandler.handle(url))
    }

    func testHandleSpotlightClientWithDottedIdentifier() {
        let activity = NSUserActivity(activityType: CSSearchableItemActionType)
        activity.userInfo = [CSSearchableItemActivityIdentifier: "solennix.client.client.42"]

        let action = DeepLinkHandler.handleSpotlight(activity)

        XCTAssertEqual(action, .showClient(id: "client.42"))
    }

    func testHandleSpotlightEventAndProduct() {
        let eventActivity = NSUserActivity(activityType: CSSearchableItemActionType)
        eventActivity.userInfo = [CSSearchableItemActivityIdentifier: "solennix.event.evt-1"]

        let productActivity = NSUserActivity(activityType: CSSearchableItemActionType)
        productActivity.userInfo = [CSSearchableItemActivityIdentifier: "solennix.product.prd-1"]

        XCTAssertEqual(DeepLinkHandler.handleSpotlight(eventActivity), .showEvent(id: "evt-1"))
        XCTAssertEqual(DeepLinkHandler.handleSpotlight(productActivity), .showProduct(id: "prd-1"))
    }

    func testHandleSpotlightRejectsInvalidPayload() {
        let wrongActivityType = NSUserActivity(activityType: "custom")
        wrongActivityType.userInfo = [CSSearchableItemActivityIdentifier: "solennix.client.1"]

        let unknownType = NSUserActivity(activityType: CSSearchableItemActionType)
        unknownType.userInfo = [CSSearchableItemActivityIdentifier: "solennix.unknown.1"]

        XCTAssertNil(DeepLinkHandler.handleSpotlight(wrongActivityType))
        XCTAssertNil(DeepLinkHandler.handleSpotlight(unknownType))
    }

    func testRouteForSpotlightActionMapsToExpectedRoute() {
        XCTAssertEqual(DeepLinkHandler.route(for: .showClient(id: "c1")), .clientDetail(id: "c1"))
        XCTAssertEqual(DeepLinkHandler.route(for: .showEvent(id: "e1")), .eventDetail(id: "e1"))
        XCTAssertEqual(DeepLinkHandler.route(for: .showProduct(id: "p1")), .productDetail(id: "p1"))
    }

    func testURLQueryParametersParsesExpectedValues() {
        let url = URL(string: "solennix://reset-password?token=abc123&type=mobile")!
        let params = url.queryParameters

        XCTAssertEqual(params["token"], "abc123")
        XCTAssertEqual(params["type"], "mobile")
    }

    func testURLQueryParametersReturnsEmptyDictionaryWhenNoQuery() {
        let url = URL(string: "solennix://reset-password")!

        XCTAssertTrue(url.queryParameters.isEmpty)
    }
}
