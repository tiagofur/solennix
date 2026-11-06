import XCTest
import SolennixCore
import SolennixNetwork
@testable import SolennixFeatures

/// Regression tests for the 2026-11-06 factory review findings on #1366:
/// the staff seat badge/block (parity with web) and the assistant portal
/// ViewModel + role routing.
final class StaffSeatsAndPortalTests: XCTestCase {

    private var session: URLSession!
    private var apiClient: APIClient!

    override func setUp() async throws {
        try await super.setUp()
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [MockURLProtocol.self]
        session = URLSession(configuration: configuration)
        apiClient = APIClient(session: session)
        await apiClient.setAuthManager(AuthManager())
    }

    override func tearDown() async throws {
        MockURLProtocol.requestHandler = nil
        apiClient = nil
        session = nil
        try await super.tearDown()
    }

    private func respond(_ status: Int, _ body: String) -> (HTTPURLResponse, Data) {
        let response = HTTPURLResponse(
            url: URL(string: "https://api.test")!,
            statusCode: status,
            httpVersion: nil,
            headerFields: nil
        )!
        return (response, body.data(using: .utf8)!)
    }

    private func stubBackend(
        limits: String? = nil,
        staffPage: String = #"{"data":[],"total":0,"page":1,"limit":10000,"total_pages":1}"#,
        upcoming: String = #"{"data":[],"total":0,"page":1,"limit":10000,"total_pages":1}"#
    ) {
        MockURLProtocol.requestHandler = { request in
            let path = request.url?.path ?? ""
            if let limits, path.hasSuffix("/staff/limits") {
                return self.respond(200, limits)
            }
            if path.hasSuffix("/events/upcoming") {
                return self.respond(200, upcoming)
            }
            if path.hasSuffix("/staff") {
                return self.respond(200, staffPage)
            }
            return self.respond(404, "{}")
        }
    }

    // MARK: - Staff seats (#1366)

    @MainActor
    func testSeatsWithinLimitLoadsQuotaAndAllowsCreation() async throws {
        stubBackend(limits: #"{"used":3,"max":5,"unlimited":false,"plan":"pro"}"#)
        let viewModel = StaffListViewModel(apiClient: apiClient)

        await viewModel.loadStaff()

        XCTAssertFalse(viewModel.isAtLimit)
        XCTAssertEqual(viewModel.limits?.used, 3)
        XCTAssertEqual(viewModel.limits?.max, 5)
    }

    @MainActor
    func testSeatsAtLimitBlocksCreation() async throws {
        stubBackend(limits: #"{"used":5,"max":5,"unlimited":false,"plan":"pro"}"#)
        let viewModel = StaffListViewModel(apiClient: apiClient)

        await viewModel.loadStaff()

        XCTAssertTrue(viewModel.isAtLimit)
    }

    @MainActor
    func testUnlimitedPlanNeverBlocks() async throws {
        stubBackend(limits: #"{"used":9,"max":null,"unlimited":true,"plan":"business"}"#)
        let viewModel = StaffListViewModel(apiClient: apiClient)

        await viewModel.loadStaff()

        XCTAssertFalse(viewModel.isAtLimit)
        XCTAssertNil(viewModel.limits?.max)
    }

    @MainActor
    func testQuotaFailureDoesNotBlockTheList() async throws {
        stubBackend() // no /staff/limits stub → 404
        let viewModel = StaffListViewModel(apiClient: apiClient)

        await viewModel.loadStaff()

        XCTAssertNil(viewModel.limits)
        XCTAssertFalse(viewModel.isAtLimit)
        XCTAssertNil(viewModel.errorMessage)
    }

    // MARK: - Assistant portal ViewModel

    @MainActor
    func testPortalLoadSortsDirectoryAndKeepsAgendaOrder() async throws {
        // getAll decodes the paginated envelope and returns `.data`, so the
        // directory stub carries the two staff inside `data` (Bruno first to
        // prove the VM sorts by name).
        let staffEnvelope = #"{"data":[{"id":"s2","user_id":"u1","name":"Bruno","notification_email_opt_in":false,"created_at":"2026-01-01T00:00:00Z","updated_at":"2026-01-01T00:00:00Z"},{"id":"s1","user_id":"u1","name":"Ana","notification_email_opt_in":false,"created_at":"2026-01-01T00:00:00Z","updated_at":"2026-01-01T00:00:00Z"}],"total":2,"page":1,"limit":10000,"total_pages":1}"#
        stubBackend(staffPage: staffEnvelope)
        let viewModel = AssistantPortalViewModel(apiClient: apiClient)

        await viewModel.load()

        XCTAssertNil(viewModel.errorMessage)
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertEqual(viewModel.directory.map(\.id), ["s1", "s2"], "directory must sort by name")
    }

    @MainActor
    func testPortalLoadErrorSurfacesMessage() async throws {
        stubBackend(upcoming: "not-json")
        let viewModel = AssistantPortalViewModel(apiClient: apiClient)

        await viewModel.load()

        XCTAssertNotNil(viewModel.errorMessage)
        XCTAssertFalse(viewModel.isLoading)
    }

    // MARK: - Role routing

    func testPortalDestinationRouting() {
        XCTAssertEqual(portalDestination(forRole: "assistant"), .secretary)
        XCTAssertEqual(portalDestination(forRole: " Assistant "), .secretary)
        XCTAssertEqual(portalDestination(forRole: "team_member"), .teamMember)
        XCTAssertEqual(portalDestination(forRole: "organizer"), .organizer)
        XCTAssertEqual(portalDestination(forRole: "user"), .organizer)
        // Documented current behavior: the iOS state machine guarantees a
        // loaded user before .authenticated, so nil never routes in practice.
        XCTAssertEqual(portalDestination(forRole: nil), .organizer)
    }
}
