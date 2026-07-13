import XCTest
import SolennixCore
import SolennixNetwork
@testable import SolennixFeatures

/// `PaymentInboxViewModel` tests covering fetch (success/error/plan-locked),
/// approve/reject flows, and filteredSubmissions search logic (#819).
///
/// Strategy: real `APIClient` whose `URLSession` is intercepted by
/// `MockURLProtocol` (same seam as `DashboardViewModelTests`). The VM only
/// depends on `APIClient`, so no AuthManager/PlanLimits wiring is needed.
final class PaymentInboxViewModelTests: XCTestCase {

    private var session: URLSession!
    private var apiClient: APIClient!
    private var viewModel: PaymentInboxViewModel!

    override func setUp() async throws {
        try await super.setUp()

        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [MockURLProtocol.self]
        session = URLSession(configuration: configuration)
        apiClient = APIClient(session: session)
        viewModel = await PaymentInboxViewModel(apiClient: apiClient)
        await apiClient.setAuthManager(AuthManager())
    }

    override func tearDown() async throws {
        MockURLProtocol.requestHandler = nil
        viewModel = nil
        apiClient = nil
        session = nil
        try await super.tearDown()
    }

    // MARK: - Helpers

    /// JSON dict for a single submission (used to stub API responses).
    private func submissionJSON(
        id: String = "sub-1",
        status: PaymentSubmissionStatus = .pending,
        clientName: String? = "María García",
        eventLabel: String? = "Boda — Salón Real"
    ) -> [String: Any] {
        [
            "id": id,
            "event_id": "evt-1",
            "client_id": "cli-1",
            "user_id": "usr-1",
            "amount": 1500.0,
            "transfer_ref": "TRF-001",
            "receipt_file_url": NSNull(),
            "status": status.rawValue,
            "submitted_at": "2026-07-01T00:00:00Z",
            "reviewed_by": NSNull(),
            "reviewed_at": NSNull(),
            "rejection_reason": NSNull(),
            "linked_payment_id": NSNull(),
            "created_at": "2026-07-01T00:00:00Z",
            "updated_at": "2026-07-01T00:00:00Z",
            "client_name": clientName as Any,
            "event_label": eventLabel as Any,
        ]
    }

    /// Builds a `PaymentSubmission` model via JSON decoding (the struct has no
    /// public memberwise init). Used for filter tests that seed state directly.
    private func makeSubmission(
        id: String = "sub-1",
        clientName: String? = "María García",
        eventLabel: String? = nil
    ) -> PaymentSubmission {
        let data = try! JSONSerialization.data(withJSONObject: submissionJSON(id: id, clientName: clientName, eventLabel: eventLabel))
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return try! decoder.decode(PaymentSubmission.self, from: data)
    }

    private func jsonResponse(_ array: [[String: Any]]) -> Data {
        try! JSONSerialization.data(withJSONObject: array)
    }

    // MARK: - 1. Fetch success populates the list

    @MainActor
    func testFetchSubmissions_PopulatesList_OnSuccess() async {
        let payload = jsonResponse([submissionJSON(id: "s1"), submissionJSON(id: "s2")])
        MockURLProtocol.requestHandler = { request in
            (HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil,
                             headerFields: ["Content-Type": "application/json"])!, payload)
        }

        await viewModel.fetchSubmissions()

        XCTAssertEqual(viewModel.submissions.count, 2)
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNil(viewModel.errorMessage)
        XCTAssertFalse(viewModel.isPlanLocked)
    }

    // MARK: - 2. Plan-locked path (#816 reactive behavior)

    /// A 403 whose body contains "pro-exclusive" must set `isPlanLocked`,
    /// clear submissions, and suppress the error message — the user sees the
    /// upgrade surface instead of a confusing API error.
    @MainActor
    func testFetchSubmissions_SetsIsPlanLocked_WhenProOnlyError() async {
        let body = """
        {"error":"This is a pro-exclusive feature","message":"Upgrade to Pro"}
        """.data(using: .utf8)!
        MockURLProtocol.requestHandler = { request in
            (HTTPURLResponse(url: request.url!, statusCode: 403, httpVersion: nil,
                             headerFields: ["Content-Type": "application/json"])!, body)
        }

        await viewModel.fetchSubmissions()

        XCTAssertTrue(viewModel.isPlanLocked, "pro-exclusive error must set isPlanLocked")
        XCTAssertTrue(viewModel.submissions.isEmpty)
        XCTAssertNil(viewModel.errorMessage, "plan-locked suppresses the raw error message")
        XCTAssertFalse(viewModel.isLoading)
    }

    // MARK: - 3. Generic error surfaces an error message

    @MainActor
    func testFetchSubmissions_SetsErrorMessage_OnGenericError() async {
        let body = """
        {"error":"Internal server error"}
        """.data(using: .utf8)!
        MockURLProtocol.requestHandler = { request in
            (HTTPURLResponse(url: request.url!, statusCode: 500, httpVersion: nil,
                             headerFields: ["Content-Type": "application/json"])!, body)
        }

        await viewModel.fetchSubmissions()

        XCTAssertNotNil(viewModel.errorMessage)
        XCTAssertFalse(viewModel.isPlanLocked)
        XCTAssertFalse(viewModel.isLoading)
    }

    // MARK: - 4. Approve removes the submission from the list

    @MainActor
    func testApprove_RemovesSubmissionFromList_OnSuccess() async {
        viewModel.submissions = [makeSubmission(id: "s1", clientName: "Test")]

        let approved = submissionJSON(id: "s1", status: .approved)
        let body = try! JSONSerialization.data(withJSONObject: ["data": approved])
        MockURLProtocol.requestHandler = { request in
            (HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil,
                             headerFields: ["Content-Type": "application/json"])!, body)
        }

        await viewModel.approve(id: "s1")

        XCTAssertTrue(viewModel.submissions.isEmpty, "approved submission leaves the inbox")
        XCTAssertNil(viewModel.approvingId)
    }

    // MARK: - 5. Reject removes the submission from the list

    @MainActor
    func testReject_RemovesSubmissionFromList_OnSuccess() async {
        viewModel.submissions = [makeSubmission(id: "s1", clientName: "Test")]

        let rejected = submissionJSON(id: "s1", status: .rejected)
        let body = try! JSONSerialization.data(withJSONObject: ["data": rejected])
        MockURLProtocol.requestHandler = { request in
            (HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil,
                             headerFields: ["Content-Type": "application/json"])!, body)
        }

        await viewModel.reject(id: "s1", reason: "Invalid receipt")

        XCTAssertTrue(viewModel.submissions.isEmpty, "rejected submission leaves the inbox")
        XCTAssertNil(viewModel.rejectingId)
    }

    // MARK: - 6. Filtered submissions: case-insensitive client + event match

    @MainActor
    func testFilteredSubmissions_MatchesClientAndEventLabel_CaseInsensitive() {
        viewModel.submissions = [
            makeSubmission(id: "s1", clientName: "María García", eventLabel: nil),
            makeSubmission(id: "s2", clientName: "John", eventLabel: "Boda Corporativa"),
        ]

        // Case- and diacritic-insensitive client match.
        viewModel.searchText = "maria"
        XCTAssertEqual(viewModel.filteredSubmissions.count, 1)
        XCTAssertEqual(viewModel.filteredSubmissions.first?.id, "s1")

        // Event-label match.
        viewModel.searchText = "corporativa"
        XCTAssertEqual(viewModel.filteredSubmissions.count, 1)
        XCTAssertEqual(viewModel.filteredSubmissions.first?.id, "s2")
    }

    // MARK: - 7. Filtered submissions returns all when search is empty

    @MainActor
    func testFilteredSubmissions_ReturnsAll_WhenSearchEmpty() {
        viewModel.submissions = [
            makeSubmission(id: "s1", clientName: "A"),
            makeSubmission(id: "s2", clientName: "B"),
        ]

        viewModel.searchText = ""
        XCTAssertEqual(viewModel.filteredSubmissions.count, 2)

        viewModel.searchText = "   "
        XCTAssertEqual(viewModel.filteredSubmissions.count, 2, "whitespace-only search returns all")
    }
}
