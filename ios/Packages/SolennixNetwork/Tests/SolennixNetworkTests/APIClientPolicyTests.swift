import XCTest
@testable import SolennixNetwork
import SolennixCore

final class APIClientPolicyTests: XCTestCase {

    func testShouldQueueMutationAllowsCrudMutations() {
        XCTAssertTrue(APIClient.shouldQueueMutation(endpoint: "/events", method: "POST"))
        XCTAssertTrue(APIClient.shouldQueueMutation(endpoint: "/events/123", method: "PUT"))
        XCTAssertTrue(APIClient.shouldQueueMutation(endpoint: "/events/123", method: "DELETE"))
    }

    func testShouldQueueMutationSkipsAuthAndUploads() {
        XCTAssertFalse(APIClient.shouldQueueMutation(endpoint: "/auth/login", method: "POST"))
        XCTAssertFalse(APIClient.shouldQueueMutation(endpoint: "/uploads/image", method: "POST"))
    }

    func testShouldQueueMutationSkipsReadOperations() {
        XCTAssertFalse(APIClient.shouldQueueMutation(endpoint: "/events", method: "GET"))
        XCTAssertFalse(APIClient.shouldQueueMutation(endpoint: "/events/123", method: "PATCH"))
    }

    func testShouldDropReplayForPermanentClientErrors() {
        XCTAssertTrue(APIClient.shouldDropReplay(statusCode: 400))
        XCTAssertTrue(APIClient.shouldDropReplay(statusCode: 404))
        XCTAssertTrue(APIClient.shouldDropReplay(statusCode: 422))
    }

    func testShouldKeepReplayFor429AndServerErrors() {
        XCTAssertFalse(APIClient.shouldDropReplay(statusCode: 429))
        XCTAssertFalse(APIClient.shouldDropReplay(statusCode: 500))
        XCTAssertFalse(APIClient.shouldDropReplay(statusCode: 503))
    }

    // MARK: - Bug #526: refresh error discrimination
    //
    // These tests exercise `AuthManager.isDefinitiveAuthFailure(_:)` directly — the same
    // pure function used by both `AuthManager.refreshToken()` and `APIClient`'s 401-retry
    // path. A single source of truth means tests cannot drift from production logic.

    /// `APIError.unauthorized` (401) is a definitive auth failure — tokens must be cleared.
    func testRefreshErrorDiscrimination_401_isDefinitive() {
        let error = APIError.unauthorized
        XCTAssertTrue(AuthManager.isDefinitiveAuthFailure(error), "401 should be a definitive auth failure")
    }

    /// `APIError.serverError(403, _)` is a definitive auth failure — tokens must be cleared.
    func testRefreshErrorDiscrimination_403_isDefinitive() {
        let error = APIError.serverError(statusCode: 403, message: "Forbidden")
        XCTAssertTrue(AuthManager.isDefinitiveAuthFailure(error), "403 should be a definitive auth failure")
    }

    /// 429 is transient — tokens must NOT be cleared, session must survive.
    func testRefreshErrorDiscrimination_429_isTransient() {
        let error = APIError.serverError(statusCode: 429, message: "Too Many Requests")
        XCTAssertFalse(AuthManager.isDefinitiveAuthFailure(error), "429 should be transient — keep session alive")
    }

    /// 500 is transient — tokens must NOT be cleared.
    func testRefreshErrorDiscrimination_500_isTransient() {
        let error = APIError.serverError(statusCode: 500, message: "Internal Server Error")
        XCTAssertFalse(AuthManager.isDefinitiveAuthFailure(error), "500 should be transient — keep session alive")
    }

    /// Network errors are transient — tokens must NOT be cleared.
    func testRefreshErrorDiscrimination_networkError_isTransient() {
        let error = APIError.networkError("no connection")
        XCTAssertFalse(AuthManager.isDefinitiveAuthFailure(error), "Network error should be transient — keep session alive")
    }
}
