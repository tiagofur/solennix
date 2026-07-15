import XCTest
import Foundation
import SolennixCore
import SolennixNetwork
@testable import SolennixFeatures

/// Focused coverage for team-portal execution-state sync (#875):
/// legacy migration, load failure, GET/edit race, optimistic rollback.
final class TeamMemberPortalViewModelExecutionStateTests: XCTestCase {

    private var session: URLSession!
    private var apiClient: APIClient!
    private var viewModel: TeamMemberPortalViewModel!

    override func setUp() async throws {
        try await super.setUp()

        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [MockURLProtocol.self]
        session = URLSession(configuration: configuration)
        apiClient = APIClient(session: session)
        viewModel = await TeamMemberPortalViewModel(apiClient: apiClient)
        await apiClient.setAuthManager(AuthManager())
        // Keep note-debounce tests snappy when used.
        await MainActor.run { viewModel.noteSaveDebounceNanoseconds = 20_000_000 }
    }

    override func tearDown() async throws {
        MockURLProtocol.requestHandler = nil
        viewModel = nil
        apiClient = nil
        session = nil
        try await super.tearDown()
    }

    // MARK: - Helpers

    private func makeAssignment(
        eventStaffId: String = "es_1",
        eventId: String = "ev_1"
    ) throws -> TeamMemberAssignment {
        let json: [String: Any] = [
            "event_staff_id": eventStaffId,
            "event_id": eventId,
            "event_name": "Boda Ana",
            "event_date": "2026-03-10",
            "staff_id": "st_7",
            "status": "confirmed",
            "role_override": NSNull(),
            "notes": NSNull(),
            "shift_start": NSNull(),
            "shift_end": NSNull(),
            "offer_group_id": NSNull(),
            "offer_slots": NSNull(),
            "notification_last_result": NSNull(),
            "notification_sent_at": NSNull()
        ]
        let data = try JSONSerialization.data(withJSONObject: json)
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        return try decoder.decode(TeamMemberAssignment.self, from: data)
    }

    private func executionStateJSON(
        arrival: Bool = false,
        materials: Bool = false,
        closing: Bool = false,
        quickNote: String = ""
    ) -> Data {
        let payload: [String: Any] = [
            "checklist": [
                "arrival": arrival,
                "materials": materials,
                "closing": closing
            ],
            "quick_note": quickNote
        ]
        return try! JSONSerialization.data(withJSONObject: payload)
    }

    private func okResponse(url: URL, data: Data) -> (HTTPURLResponse, Data) {
        (
            HTTPURLResponse(
                url: url,
                statusCode: 200,
                httpVersion: nil,
                headerFields: ["Content-Type": "application/json"]
            )!,
            data
        )
    }

    /// Prefer 4xx so `APIClient` does not spend ~3s retrying transient 5xx GETs.
    private func errorResponse(url: URL, status: Int = 422) -> (HTTPURLResponse, Data) {
        (
            HTTPURLResponse(
                url: url,
                statusCode: status,
                httpVersion: nil,
                headerFields: ["Content-Type": "application/json"]
            )!,
            Data(#"{"error":"failed"}"#.utf8)
        )
    }

    private func seedLegacy(
        eventId: String,
        arrival: Bool = true,
        materials: Bool = false,
        closing: Bool = false,
        quickNote: String = "legacy note"
    ) throws {
        let legacy: [String: Any] = [
            "arrivalReady": arrival,
            "materialsReady": materials,
            "closingDone": closing,
            "quickNote": quickNote
        ]
        let data = try JSONSerialization.data(withJSONObject: legacy)
        UserDefaults.standard.set(data, forKey: TeamMemberPortalViewModel.legacyDefaultsKey(eventId: eventId))
    }

    private func clearLegacy(eventId: String) {
        UserDefaults.standard.removeObject(
            forKey: TeamMemberPortalViewModel.legacyDefaultsKey(eventId: eventId)
        )
    }

    // MARK: - Load failure is not sticky default

    @MainActor
    func testLoadExecutionState_FailureLeavesCacheUnset_AndRetriesOnReopen() async throws {
        let assignment = try makeAssignment()
        var getCount = 0

        MockURLProtocol.requestHandler = { [self] request in
            let url = request.url!
            if request.httpMethod == "GET", url.path.contains("execution-state") {
                getCount += 1
                if getCount == 1 {
                    return errorResponse(url: url)
                }
                return okResponse(
                    url: url,
                    data: executionStateJSON(arrival: true, quickNote: "from server")
                )
            }
            return errorResponse(url: url)
        }

        await viewModel.loadExecutionState(for: assignment)

        XCTAssertNil(
            viewModel.executionStates[assignment.eventStaffId],
            "Failed load must not sticky-cache .defaultState"
        )
        XCTAssertNotNil(viewModel.errorMessage)

        await viewModel.loadExecutionState(for: assignment)

        XCTAssertEqual(getCount, 2, "reopen must retry GET when cache was left unset")
        let state = try XCTUnwrap(viewModel.executionStates[assignment.eventStaffId])
        XCTAssertTrue(state.checklist.arrival)
        XCTAssertEqual(state.quickNote, "from server")
    }

    // MARK: - GET/edit race

    @MainActor
    func testLoadExecutionState_DoesNotOverwriteLocalMutationDuringLoad() async throws {
        let assignment = try makeAssignment()
        let gate = Gate()

        MockURLProtocol.requestHandler = { [self] request in
            let url = request.url!
            if request.httpMethod == "GET", url.path.contains("execution-state") {
                // Block until the test applies a local mutation mid-flight.
                gate.waitSync()
                return okResponse(
                    url: url,
                    data: executionStateJSON(arrival: true, quickNote: "server wins if applied")
                )
            }
            if request.httpMethod == "PUT", url.path.contains("execution-state") {
                return okResponse(url: url, data: request.httpBody ?? executionStateJSON())
            }
            return errorResponse(url: url)
        }

        let loadTask = Task { @MainActor in
            await viewModel.loadExecutionState(for: assignment)
        }

        // Yield so the GET is in flight behind the gate.
        try await Task.sleep(nanoseconds: 50_000_000)

        let local = AssignmentExecutionState(
            checklist: ExecutionChecklist(arrival: false, materials: true, closing: false),
            quickNote: "typed during load"
        )
        await viewModel.saveExecutionState(for: assignment, state: local, debounce: false)

        gate.open()
        await loadTask.value

        let state = try XCTUnwrap(viewModel.executionStates[assignment.eventStaffId])
        XCTAssertEqual(state.quickNote, "typed during load")
        XCTAssertTrue(state.checklist.materials)
        XCTAssertFalse(state.checklist.arrival, "server GET must not clobber concurrent local edit")
    }

    // MARK: - Optimistic rollback on PUT failure

    @MainActor
    func testSaveExecutionState_RestoresLastSynced_OnPutFailure() async throws {
        let assignment = try makeAssignment()

        MockURLProtocol.requestHandler = { [self] request in
            let url = request.url!
            if request.httpMethod == "GET", url.path.contains("execution-state") {
                return okResponse(url: url, data: executionStateJSON(arrival: true, quickNote: "synced"))
            }
            if request.httpMethod == "PUT", url.path.contains("execution-state") {
                return errorResponse(url: url, status: 422)
            }
            return errorResponse(url: url)
        }

        await viewModel.loadExecutionState(for: assignment)
        let before = try XCTUnwrap(viewModel.executionStates[assignment.eventStaffId])
        XCTAssertTrue(before.checklist.arrival)

        let failed = AssignmentExecutionState(
            checklist: ExecutionChecklist(arrival: true, materials: true, closing: false),
            quickNote: "synced"
        )
        await viewModel.saveExecutionState(for: assignment, state: failed, debounce: false)

        let after = try XCTUnwrap(viewModel.executionStates[assignment.eventStaffId])
        XCTAssertEqual(after, before, "PUT failure must restore last synced snapshot")
        XCTAssertFalse(after.checklist.materials)
        XCTAssertNotNil(viewModel.errorMessage)
    }

    // MARK: - Legacy delete only after successful PUT

    @MainActor
    func testLoadExecutionState_KeepsLegacyKey_WhenMigratePutFails() async throws {
        let eventId = "ev_legacy_fail"
        let assignment = try makeAssignment(eventStaffId: "es_legacy_fail", eventId: eventId)
        try seedLegacy(eventId: eventId, arrival: true, quickNote: "keep me")
        defer { clearLegacy(eventId: eventId) }

        MockURLProtocol.requestHandler = { [self] request in
            let url = request.url!
            if request.httpMethod == "GET", url.path.contains("execution-state") {
                return okResponse(url: url, data: executionStateJSON()) // server default
            }
            if request.httpMethod == "PUT", url.path.contains("execution-state") {
                return errorResponse(url: url, status: 422)
            }
            return errorResponse(url: url)
        }

        await viewModel.loadExecutionState(for: assignment)

        let key = TeamMemberPortalViewModel.legacyDefaultsKey(eventId: eventId)
        XCTAssertNotNil(
            UserDefaults.standard.data(forKey: key),
            "Legacy key must survive a failed migrate PUT"
        )
        XCTAssertNotNil(viewModel.errorMessage)
        XCTAssertNil(
            viewModel.executionStates[assignment.eventStaffId],
            "Failed migrate must clear cache so reopen retries GET+migrate"
        )
    }

    @MainActor
    func testLoadExecutionState_DeletesLegacyKey_OnlyAfterSuccessfulMigratePut() async throws {
        let eventId = "ev_legacy_ok"
        let assignment = try makeAssignment(eventStaffId: "es_legacy_ok", eventId: eventId)
        try seedLegacy(eventId: eventId, arrival: true, materials: true, quickNote: "migrated")
        defer { clearLegacy(eventId: eventId) }

        var putCount = 0
        MockURLProtocol.requestHandler = { [self] request in
            let url = request.url!
            if request.httpMethod == "GET", url.path.contains("execution-state") {
                return okResponse(url: url, data: executionStateJSON()) // server default
            }
            if request.httpMethod == "PUT", url.path.contains("execution-state") {
                putCount += 1
                // Echo body so decode succeeds.
                return okResponse(url: url, data: request.httpBody ?? executionStateJSON(arrival: true, materials: true, quickNote: "migrated"))
            }
            return errorResponse(url: url)
        }

        await viewModel.loadExecutionState(for: assignment)

        XCTAssertEqual(putCount, 1)
        let key = TeamMemberPortalViewModel.legacyDefaultsKey(eventId: eventId)
        XCTAssertNil(
            UserDefaults.standard.data(forKey: key),
            "Legacy key must be removed only after successful migrate PUT"
        )
        let state = try XCTUnwrap(viewModel.executionStates[assignment.eventStaffId])
        XCTAssertTrue(state.checklist.arrival)
        XCTAssertTrue(state.checklist.materials)
        XCTAssertEqual(state.quickNote, "migrated")
    }

    // MARK: - Migration does not clobber non-default server state

    @MainActor
    func testLoadExecutionState_DoesNotPutLegacy_WhenServerHasState() async throws {
        let eventId = "ev_legacy_clobber"
        let assignment = try makeAssignment(eventStaffId: "es_legacy_clobber", eventId: eventId)
        try seedLegacy(eventId: eventId, arrival: true, quickNote: "stale local")
        defer { clearLegacy(eventId: eventId) }

        var putCount = 0
        MockURLProtocol.requestHandler = { [self] request in
            let url = request.url!
            if request.httpMethod == "GET", url.path.contains("execution-state") {
                return okResponse(
                    url: url,
                    data: executionStateJSON(arrival: false, materials: true, closing: true, quickNote: "server newer")
                )
            }
            if request.httpMethod == "PUT", url.path.contains("execution-state") {
                putCount += 1
                return okResponse(url: url, data: request.httpBody ?? Data())
            }
            return errorResponse(url: url)
        }

        await viewModel.loadExecutionState(for: assignment)

        XCTAssertEqual(putCount, 0, "must not PUT legacy over non-default server state")
        let state = try XCTUnwrap(viewModel.executionStates[assignment.eventStaffId])
        XCTAssertEqual(state.quickNote, "server newer")
        XCTAssertTrue(state.checklist.materials)
        XCTAssertTrue(state.checklist.closing)
        XCTAssertFalse(state.checklist.arrival)
        // Leftover legacy discarded after server wins (no clobber path).
        XCTAssertNil(
            UserDefaults.standard.data(forKey: TeamMemberPortalViewModel.legacyDefaultsKey(eventId: eventId))
        )
    }

    // MARK: - Successful empty server is cached (distinct from failure)

    @MainActor
    func testLoadExecutionState_EmptyServerSuccessIsCached_AndDoesNotReGet() async throws {
        let assignment = try makeAssignment(eventStaffId: "es_empty", eventId: "ev_empty")
        var getCount = 0

        MockURLProtocol.requestHandler = { [self] request in
            let url = request.url!
            if request.httpMethod == "GET", url.path.contains("execution-state") {
                getCount += 1
                return okResponse(url: url, data: executionStateJSON())
            }
            return errorResponse(url: url)
        }

        await viewModel.loadExecutionState(for: assignment)
        await viewModel.loadExecutionState(for: assignment)

        XCTAssertEqual(getCount, 1, "authoritative empty success may short-circuit subsequent loads")
        let state = try XCTUnwrap(viewModel.executionStates[assignment.eventStaffId])
        XCTAssertTrue(state.isDefault)
    }
}

// MARK: - Sync gate for mid-flight GET races

/// Blocks the URLProtocol handler thread until `open()` is called from the test.
private final class Gate: @unchecked Sendable {
    private let semaphore = DispatchSemaphore(value: 0)

    func waitSync() {
        _ = semaphore.wait(timeout: .now() + 2)
    }

    func open() {
        semaphore.signal()
    }
}


// MARK: - Mock URLProtocol (SolennixTests-local)

private final class MockURLProtocol: URLProtocol {
    static var requestHandler: ((URLRequest) throws -> (HTTPURLResponse, Data))?

    override class func canInit(with request: URLRequest) -> Bool { true }

    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        guard let handler = MockURLProtocol.requestHandler else { return }
        do {
            let (response, data) = try handler(request)
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data)
            client?.urlProtocolDidFinishLoading(self)
        } catch {
            client?.urlProtocol(self, didFailWithError: error)
        }
    }

    override func stopLoading() {}
}
