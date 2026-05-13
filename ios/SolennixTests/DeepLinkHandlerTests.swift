import XCTest
import CoreSpotlight
@testable import Solennix

final class DeepLinkHandlerTests: XCTestCase {

    func testHandleResetPasswordWithToken() {
        let url = URL(string: "solennix://reset-password?token=abc123")!
        let action = DeepLinkHandler.handle(url)

        XCTAssertEqual(action, .resetPassword(token: "abc123"))
    }

    func testHandleTeamInviteWithToken() {
        let url = URL(string: "solennix://team-invite?token=invite-token")!
        let action = DeepLinkHandler.handle(url)

        XCTAssertEqual(action, .teamInvite(token: "invite-token"))
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
