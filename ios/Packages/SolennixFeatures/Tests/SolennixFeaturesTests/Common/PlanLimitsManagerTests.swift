import XCTest
import SolennixCore
import SolennixNetwork
@testable import SolennixFeatures

// MARK: - PlanLimitsManager tests
//
// Covers two fixes that both touch `checkLimits()`:
//   #805 — the `start`/`end` query params must use the shared UTC month range
//          (not `Calendar.current`), so counts agree with the dashboard in
//          negative-offset zones.
//   #806 — on a network/server error the last known count is preserved (not
//          zeroed), so the free-plan gate can't silently reopen.

final class PlanLimitsManagerTests: XCTestCase {

    private var session: URLSession!
    private var apiClient: APIClient!
    private var authManager: AuthManager!
    private var planLimits: PlanLimitsManager!
    private var mockKeychain: MockKeychain!
    private var defaults: UserDefaults!
    private let defaultsSuite = "com.solennix.tests.plan-limits"

    // Encoder mirroring APIClient's wire format (snake_case) so arrays round-trip
    // through the decoder's `.convertFromSnakeCase` strategy.
    private let encoder: JSONEncoder = {
        let e = JSONEncoder()
        e.keyEncodingStrategy = .convertToSnakeCase
        return e
    }()

    override func setUp() async throws {
        try await super.setUp()

        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [MockURLProtocol.self]
        session = URLSession(configuration: configuration)

        mockKeychain = MockKeychain()
        defaults = UserDefaults(suiteName: defaultsSuite)!
        defaults.removePersistentDomain(forName: defaultsSuite)

        apiClient = APIClient(
            baseURL: URL(string: "https://api.solennix.com/api")!,
            keychainHelper: mockKeychain,
            session: session
        )
        authManager = AuthManager(keychain: mockKeychain, defaults: defaults)
        await apiClient.setAuthManager(authManager)
        authManager.apiClient = apiClient
        planLimits = PlanLimitsManager(apiClient: apiClient)
        planLimits.setAuthManager(authManager)
    }

    override func tearDown() async throws {
        MockURLProtocol.requestHandler = nil
        defaults.removePersistentDomain(forName: defaultsSuite)
        planLimits = nil
        authManager = nil
        apiClient = nil
        session = nil
        try await super.tearDown()
    }

    // MARK: - Helpers

    /// Run `checkAuth()` against a mocked `/auth/me` to populate `currentUser`
    /// with a `.basic` user — the guard `checkLimits()` requires.
    private func seedBasicUser() async {
        mockKeychain.saveString("test-access-token", for: KeychainHelper.Keys.accessToken)
        mockKeychain.saveString("test-refresh-token", for: KeychainHelper.Keys.refreshToken)

        MockURLProtocol.requestHandler = { request in
            let response = HTTPURLResponse(
                url: request.url!,
                statusCode: 200,
                httpVersion: nil,
                headerFields: ["Content-Type": "application/json"]
            )!
            return (response, self.authMeResponse())
        }

        await authManager.checkAuth()
        XCTAssertNotNil(authManager.currentUser, "precondition: /auth/me should populate currentUser")
        XCTAssertEqual(authManager.currentUser?.plan, .basic, "precondition: user must be basic plan")
    }

    private func authMeResponse() -> Data {
        """
        {
            "id": "user-1",
            "email": "tiago@solennix.com",
            "name": "Tiago",
            "plan": "basic",
            "created_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-01-01T00:00:00Z"
        }
        """.data(using: .utf8)!
    }

    private func makeEvent(id: String) -> Event {
        Event(
            id: id,
            userId: "user-1",
            clientId: "client-1",
            eventDate: "2026-07-10T12:00:00Z",
            serviceType: "Catering",
            numPeople: 50,
            status: .confirmed,
            discount: 0.0,
            discountType: .percent,
            requiresInvoice: false,
            taxRate: 0.16,
            taxAmount: 0.0,
            totalAmount: 1000.0,
            createdAt: "2026-07-09T00:00:00Z",
            updatedAt: "2026-07-09T00:00:00Z"
        )
    }

    private func makeClient(id: String) -> Client {
        Client(
            id: id,
            userId: "user-1",
            name: "Client \(id)",
            phone: "555-0100",
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z"
        )
    }

    /// Handler returning canned arrays for each collection — events/clients
    /// populated, products/inventory empty. Used to establish a known baseline.
    private func successHandler(events: [Event], clients: [Client]) -> (URLRequest) throws -> (HTTPURLResponse, Data) {
        let eventsData = try! encoder.encode(events)
        let clientsData = try! encoder.encode(clients)
        return { request in
            let url = request.url?.absoluteString ?? ""
            let data: Data
            if url.contains("/events") { data = eventsData }
            else if url.contains("/clients") { data = clientsData }
            else { data = "[]".data(using: .utf8)! }
            let response = HTTPURLResponse(
                url: request.url!, statusCode: 200, httpVersion: nil,
                headerFields: ["Content-Type": "application/json"])!
            return (response, data)
        }
    }

    // MARK: - 1. Month range is UTC (regression for #805)

    @MainActor
    func testCheckLimitsSendsUtcMonthRangeParams() async {
        await seedBasicUser()
        var capturedEventsURL: URL?

        MockURLProtocol.requestHandler = { request in
            let urlString = request.url?.absoluteString ?? ""
            if urlString.contains("/events") {
                capturedEventsURL = request.url
            }
            let response = HTTPURLResponse(
                url: request.url!,
                statusCode: 200,
                httpVersion: nil,
                headerFields: ["Content-Type": "application/json"]
            )!
            return (response, "[]".data(using: .utf8)!)
        }

        await planLimits.checkLimits()

        // The `start`/`end` query items must equal the shared UTC range for the
        // current month — the exact behavior the dashboard already had and that
        // PlanLimitsManager was missing (it sent Calendar.current values).
        guard let url = capturedEventsURL else {
            XCTFail("checkLimits should have issued a GET /events request"); return
        }
        let expected = Date.utcMonthRange()
        guard let comps = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
            XCTFail("events URL must parse: \(url)"); return
        }
        let items = Dictionary(uniqueKeysWithValues: (comps.queryItems ?? []).map { ($0.name, $0.value ?? "") })
        XCTAssertEqual(items["start"], expected.start, "events request must use UTC month start")
        XCTAssertEqual(items["end"], expected.end, "events request must use UTC month end")
    }

    // MARK: - 2. Event count reflects the month-scoped response (#805)

    @MainActor
    func testEventsThisMonthMatchesResponseCount_BelowLimit() async {
        await seedBasicUser()
        let events = (1...3).map { makeEvent(id: "evt-\($0)") }
        MockURLProtocol.requestHandler = successHandler(events: events, clients: [])

        await planLimits.checkLimits()

        XCTAssertEqual(planLimits.eventsThisMonth, 3)
        XCTAssertTrue(planLimits.canCreateEvent,
            "3 events < free-plan limit (\(PlanLimitsManager.freePlanEventLimit)) → can create")
    }

    @MainActor
    func testEventsThisMonthAtLimitBlocksFreePlan() async {
        await seedBasicUser()
        let events = (1...PlanLimitsManager.freePlanEventLimit).map { makeEvent(id: "evt-\($0)") }
        MockURLProtocol.requestHandler = successHandler(events: events, clients: [])

        await planLimits.checkLimits()

        XCTAssertEqual(planLimits.eventsThisMonth, PlanLimitsManager.freePlanEventLimit)
        XCTAssertFalse(planLimits.canCreateEvent,
            "At the free-plan limit, canCreateEvent must be false for basic plan")
    }

    // MARK: - 3. On error, last known counts are preserved (regression for #806)

    @MainActor
    func testCheckLimitsPreservesCountsOnError() async {
        await seedBasicUser()

        // First call succeeds → counts populated to known values.
        MockURLProtocol.requestHandler = successHandler(
            events: [makeEvent(id: "e1"), makeEvent(id: "e2")],
            clients: (1...10).map { makeClient(id: "c\($0)") }
        )
        await planLimits.checkLimits()
        XCTAssertEqual(planLimits.eventsThisMonth, 2, "baseline: first load should report 2 events")
        XCTAssertEqual(planLimits.clientsCount, 10, "baseline: first load should report 10 clients")

        // Second call fails on every endpoint. Before #806 this zeroed the
        // counts and reopened the free-plan gate; now the previous values must
        // be preserved.
        MockURLProtocol.requestHandler = { _ in
            throw URLError(.notConnectedToInternet)
        }
        await planLimits.checkLimits()

        XCTAssertEqual(planLimits.eventsThisMonth, 2,
            "#806: a failed fetch must NOT zero eventsThisMonth — preserve last known value")
        XCTAssertEqual(planLimits.clientsCount, 10,
            "#806: a failed fetch must NOT zero clientsCount — preserve last known value")
        XCTAssertFalse(planLimits.isLoading, "isLoading must clear even on failure")
    }

    // MARK: - 4. Counts update to the latest server value on success (#806)

    @MainActor
    func testCheckLimitsUpdatesCountsOnSuccess() async {
        await seedBasicUser()

        MockURLProtocol.requestHandler = successHandler(
            events: (1...3).map { makeEvent(id: "e\($0)") },
            clients: (1...5).map { makeClient(id: "c\($0)") }
        )
        await planLimits.checkLimits()
        XCTAssertEqual(planLimits.eventsThisMonth, 3)
        XCTAssertEqual(planLimits.clientsCount, 5)

        // A subsequent successful fetch with different counts must reflect them.
        MockURLProtocol.requestHandler = successHandler(
            events: (1...5).map { makeEvent(id: "e\($0)") },
            clients: (1...8).map { makeClient(id: "c\($0)") }
        )
        await planLimits.checkLimits()
        XCTAssertEqual(planLimits.eventsThisMonth, 5, "successful refetch must update the count")
        XCTAssertEqual(planLimits.clientsCount, 8)
    }

    // MARK: - 5. Partial failure preserves the failing count, updates the rest (#806)

    @MainActor
    func testCheckLimitsPartialFailurePreservesFailingCount() async {
        await seedBasicUser()

        // Baseline: 4 events, 6 clients.
        MockURLProtocol.requestHandler = successHandler(
            events: (1...4).map { makeEvent(id: "e\($0)") },
            clients: (1...6).map { makeClient(id: "c\($0)") }
        )
        await planLimits.checkLimits()
        XCTAssertEqual(planLimits.eventsThisMonth, 4)
        XCTAssertEqual(planLimits.clientsCount, 6)

        // Now: events endpoint errors, clients succeeds with 9.
        let clientsData = try! encoder.encode((1...9).map { makeClient(id: "c\($0)") })
        MockURLProtocol.requestHandler = { request in
            let url = request.url?.absoluteString ?? ""
            if url.contains("/events") {
                throw URLError(.timedOut)
            }
            let data = url.contains("/clients") ? clientsData : "[]".data(using: .utf8)!
            let response = HTTPURLResponse(
                url: request.url!, statusCode: 200, httpVersion: nil,
                headerFields: ["Content-Type": "application/json"])!
            return (response, data)
        }
        await planLimits.checkLimits()

        XCTAssertEqual(planLimits.eventsThisMonth, 4,
            "#806: events endpoint failed → preserve last known (4), not 0")
        XCTAssertEqual(planLimits.clientsCount, 9,
            "clients endpoint succeeded → update to fresh count")
    }

    // MARK: - 6. No user → no-op (guard)

    @MainActor
    func testCheckLimitsNoCurrentUserIsNoOp() async {
        // Do not seed a user → checkLimits returns early.
        MockURLProtocol.requestHandler = { request in
            let response = HTTPURLResponse(
                url: request.url!, statusCode: 200, httpVersion: nil,
                headerFields: ["Content-Type": "application/json"])!
            return (response, "[]".data(using: .utf8)!)
        }

        await planLimits.checkLimits()

        XCTAssertEqual(planLimits.eventsThisMonth, 0,
            "Without a current user, checkLimits must not fetch or mutate counts")
        XCTAssertFalse(planLimits.isLoading)
    }
}

// MARK: - Test Keychain double

/// Dictionary-backed `KeychainStoring` so the suite never touches the simulator
/// keychain. Mirrors the one in SolennixNetworkTests (not shared across targets).
final class MockKeychain: KeychainStoring, @unchecked Sendable {
    private var store: [String: String] = [:]

    func saveString(_ value: String, for key: String) -> Bool {
        store[key] = value
        return true
    }

    func readString(for key: String) -> String? { store[key] }

    func delete(for key: String) -> Bool {
        store.removeValue(forKey: key)
        return true
    }
}
