import XCTest
import SolennixCore
import SolennixNetwork
@testable import SolennixFeatures

/// Unit tests for `RequestsInboxViewModel` (#1122).
final class RequestsInboxViewModelTests: XCTestCase {

    private var session: URLSession!
    private var apiClient: APIClient!
    private var viewModel: RequestsInboxViewModel!

    override func setUp() async throws {
        try await super.setUp()
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [MockURLProtocol.self]
        session = URLSession(configuration: configuration)
        apiClient = APIClient(session: session)
        viewModel = await RequestsInboxViewModel(apiClient: apiClient)
        await apiClient.setAuthManager(AuthManager())
    }

    override func tearDown() async throws {
        MockURLProtocol.requestHandler = nil
        viewModel = nil
        apiClient = nil
        session = nil
        try await super.tearDown()
    }

    private func requestJSON(
        id: String = "req-1",
        status: String = "pending",
        isRead: Bool = false,
        name: String? = "Maria"
    ) -> [String: Any] {
        [
            "id": id,
            "contact_email": "client@example.com",
            "contact_name": name as Any,
            "event_type": "boda",
            "event_date": "2026-09-01",
            "location": "CDMX",
            "guest_count": 100,
            "budget": 15000.0,
            "currency": "MXN",
            "services": [] as [Any],
            "message": "Hola",
            "status": status,
            "is_read": isRead,
            "event_id": NSNull(),
            "declined_reason": NSNull(),
            "last_status_change": "2026-08-01T12:00:00Z",
            "created_at": "2026-08-01T12:00:00Z",
            "updated_at": "2026-08-01T12:00:00Z",
        ]
    }

    private func cursorPayload(items: [[String: Any]], next: String? = nil) -> Data {
        var obj: [String: Any] = [
            "data": items,
            "has_more": next != nil,
            "limit": 20,
        ]
        if let next {
            obj["next_cursor"] = next
        } else {
            obj["next_cursor"] = NSNull()
        }
        return try! JSONSerialization.data(withJSONObject: obj)
    }

    @MainActor
    func testRefresh_PopulatesList_OnCursorSuccess() async {
        let payload = cursorPayload(items: [requestJSON(id: "a"), requestJSON(id: "b")])
        let unread = try! JSONSerialization.data(withJSONObject: ["data": ["count": 2]])
        MockURLProtocol.requestHandler = { request in
            let path = request.url?.path ?? ""
            let body: Data
            if path.contains("unread-count") {
                body = unread
            } else {
                body = payload
            }
            return (
                HTTPURLResponse(
                    url: request.url!,
                    statusCode: 200,
                    httpVersion: nil,
                    headerFields: ["Content-Type": "application/json"]
                )!,
                body
            )
        }

        await viewModel.refresh()

        XCTAssertEqual(viewModel.items.count, 2)
        XCTAssertEqual(viewModel.unreadCount, 2)
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNil(viewModel.errorMessage)
        XCTAssertFalse(viewModel.hasMore)
    }

    @MainActor
    func testRefresh_SetsError_OnNetworkFailure() async {
        MockURLProtocol.requestHandler = { request in
            throw URLError(.notConnectedToInternet)
        }

        await viewModel.refresh()

        XCTAssertTrue(viewModel.items.isEmpty)
        XCTAssertNotNil(viewModel.errorMessage)
    }

    @MainActor
    func testDisplayName_FallsBackToEmailLocalPart() {
        let req = PublicRequest(id: "1", contactEmail: "ana@example.com", contactName: nil)
        XCTAssertEqual(req.displayName, "ana")
    }

    @MainActor
    func testStatusFilterQuery_MapsChips() {
        XCTAssertNil(RequestsStatusFilter.all.queryStatus)
        XCTAssertEqual(RequestsStatusFilter.pending.queryStatus, "pending")
        XCTAssertEqual(RequestsStatusFilter.responded.queryStatus, "responded")
        XCTAssertEqual(RequestsStatusFilter.booked.queryStatus, "booked")
    }
}
