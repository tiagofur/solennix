import XCTest
import Foundation
import SolennixCore
import SolennixNetwork
@testable import SolennixFeatures

/// Focused coverage for team-portal execution-state sync (#875):
/// legacy migration, load failure, load gating, sync local apply, optimistic rollback.
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
        XCTAssertEqual(
            viewModel.executionLoadStates[assignment.eventStaffId],
            .failed
        )
        XCTAssertNotNil(viewModel.executionErrorMessages[assignment.eventStaffId])
        XCTAssertNil(
            viewModel.errorMessage,
            "Execution load failure must not pollute list errorMessage"
        )

        await viewModel.loadExecutionState(for: assignment)

        XCTAssertEqual(getCount, 2, "reopen must retry GET when cache was left unset")
        let state = try XCTUnwrap(viewModel.executionStates[assignment.eventStaffId])
        XCTAssertTrue(state.checklist.arrival)
        XCTAssertEqual(state.quickNote, "from server")
        XCTAssertEqual(viewModel.executionLoadStates[assignment.eventStaffId], .ready)
        XCTAssertNil(
            viewModel.executionErrorMessages[assignment.eventStaffId],
            "successful load clears per-assignment execution error"
        )
    }

    // MARK: - Load gating (no default-based clobber)

    @MainActor
    func testLoadExecutionState_GatesEditsUntilReady_ServerSeedsCache() async throws {
        let assignment = try makeAssignment()
        let gate = Gate()
        var putCount = 0

        MockURLProtocol.requestHandler = { [self] request in
            let url = request.url!
            if request.httpMethod == "GET", url.path.contains("execution-state") {
                gate.waitSync()
                return okResponse(
                    url: url,
                    data: executionStateJSON(arrival: true, quickNote: "server seed")
                )
            }
            if request.httpMethod == "PUT", url.path.contains("execution-state") {
                putCount += 1
                return okResponse(url: url, data: request.httpBody ?? executionStateJSON())
            }
            return errorResponse(url: url)
        }

        let loadTask = Task { @MainActor in
            await viewModel.loadExecutionState(for: assignment)
        }

        // Yield so the GET is in flight behind the gate.
        try await Task.sleep(nanoseconds: 50_000_000)
        XCTAssertEqual(viewModel.executionLoadStates[assignment.eventStaffId], .loading)

        let local = AssignmentExecutionState(
            checklist: ExecutionChecklist(arrival: false, materials: true, closing: false),
            quickNote: "typed during load"
        )
        await viewModel.saveExecutionState(for: assignment, state: local, debounce: false)

        XCTAssertNil(
            viewModel.executionStates[assignment.eventStaffId],
            "Edits must not seed cache from defaults while load is in flight"
        )
        XCTAssertEqual(putCount, 0, "Gated edits must not PUT incomplete defaults")

        gate.open()
        await loadTask.value

        let state = try XCTUnwrap(viewModel.executionStates[assignment.eventStaffId])
        XCTAssertEqual(state.quickNote, "server seed")
        XCTAssertTrue(state.checklist.arrival)
        XCTAssertEqual(viewModel.executionLoadStates[assignment.eventStaffId], .ready)
        XCTAssertEqual(putCount, 0)
    }

    // MARK: - Sync local apply before await

    @MainActor
    func testApplyLocalExecutionState_MultiField_CacheHasBothBeforePutCompletes() async throws {
        let assignment = try makeAssignment()
        let putGate = Gate()
        var putBodies: [Data] = []

        MockURLProtocol.requestHandler = { [self] request in
            let url = request.url!
            if request.httpMethod == "GET", url.path.contains("execution-state") {
                return okResponse(url: url, data: executionStateJSON())
            }
            if request.httpMethod == "PUT", url.path.contains("execution-state") {
                putBodies.append(request.httpBody ?? Data())
                putGate.waitSync()
                return okResponse(url: url, data: request.httpBody ?? executionStateJSON())
            }
            return errorResponse(url: url)
        }

        await viewModel.loadExecutionState(for: assignment)

        var materials = AssignmentExecutionState.defaultState
        materials.checklist.materials = true
        viewModel.applyLocalExecutionState(materials, for: assignment)

        var both = materials
        both.quickNote = "note B"
        viewModel.applyLocalExecutionState(both, for: assignment)

        let cached = try XCTUnwrap(viewModel.executionStates[assignment.eventStaffId])
        XCTAssertTrue(cached.checklist.materials, "first field must remain after second apply")
        XCTAssertEqual(cached.quickNote, "note B", "second field must be present before any PUT completes")
        XCTAssertEqual(putBodies.count, 0, "applyLocal must not PUT")

        // Persist once with the coalesced cache.
        let persistTask = Task { @MainActor in
            await viewModel.persistExecutionState(for: assignment, debounce: false)
        }
        try await Task.sleep(nanoseconds: 50_000_000)
        putGate.open()
        await persistTask.value

        XCTAssertEqual(putBodies.count, 1)
        let final = try XCTUnwrap(viewModel.executionStates[assignment.eventStaffId])
        XCTAssertTrue(final.checklist.materials)
        XCTAssertEqual(final.quickNote, "note B")
    }

    // MARK: - lastSynced always advances on PUT success

    @MainActor
    func testPutSuccess_AlwaysAdvancesLastSynced_UnderConcurrentEdit() async throws {
        let assignment = try makeAssignment()
        let putGate = Gate()
        var putCount = 0

        MockURLProtocol.requestHandler = { [self] request in
            let url = request.url!
            if request.httpMethod == "GET", url.path.contains("execution-state") {
                return okResponse(url: url, data: executionStateJSON(arrival: true, quickNote: "synced"))
            }
            if request.httpMethod == "PUT", url.path.contains("execution-state") {
                putCount += 1
                if putCount == 1 {
                    // First PUT (materials) blocks so we can mutate cache mid-flight.
                    putGate.waitSync()
                }
                // Second PUT fails so rollback uses lastSynced from the first success.
                if putCount >= 2 {
                    return errorResponse(url: url, status: 422)
                }
                return okResponse(url: url, data: request.httpBody ?? executionStateJSON())
            }
            return errorResponse(url: url)
        }

        await viewModel.loadExecutionState(for: assignment)
        let id = assignment.eventStaffId
        XCTAssertEqual(viewModel.lastSyncedStates[id]?.quickNote, "synced")

        var midFlight = AssignmentExecutionState(
            checklist: ExecutionChecklist(arrival: true, materials: true, closing: false),
            quickNote: "synced"
        )
        let firstPut = Task { @MainActor in
            await viewModel.saveExecutionState(for: assignment, state: midFlight, debounce: false)
        }

        try await Task.sleep(nanoseconds: 50_000_000)

        // Concurrent local edit while first PUT is in flight.
        var concurrent = midFlight
        concurrent.quickNote = "newer local"
        viewModel.applyLocalExecutionState(concurrent, for: assignment)
        XCTAssertEqual(viewModel.executionStates[id]?.quickNote, "newer local")

        putGate.open()
        await firstPut.value

        XCTAssertEqual(
            viewModel.lastSyncedStates[id],
            midFlight,
            "Successful PUT must advance lastSynced even when cache already moved on"
        )
        XCTAssertEqual(viewModel.executionStates[id]?.quickNote, "newer local")

        // Persist the concurrent edit — PUT fails; rollback must use advanced lastSynced.
        await viewModel.persistExecutionState(for: assignment, debounce: false)
        let after = try XCTUnwrap(viewModel.executionStates[id])
        XCTAssertEqual(after, midFlight, "Rollback target must be the successful mid-flight payload")
        XCTAssertEqual(after.quickNote, "synced")
        XCTAssertTrue(after.checklist.materials)
    }

    // MARK: - Note debounce coalescing

    @MainActor
    func testNoteDebounce_CoalescesRapidEditsIntoSinglePut() async throws {
        let assignment = try makeAssignment()
        var putCount = 0

        MockURLProtocol.requestHandler = { [self] request in
            let url = request.url!
            if request.httpMethod == "GET", url.path.contains("execution-state") {
                return okResponse(url: url, data: executionStateJSON())
            }
            if request.httpMethod == "PUT", url.path.contains("execution-state") {
                putCount += 1
                // Echo final cached shape via lastSynced after success rather than
                // parsing httpBody (URLProtocol may surface body via stream only).
                return okResponse(
                    url: url,
                    data: executionStateJSON(quickNote: "abc")
                )
            }
            return errorResponse(url: url)
        }

        await viewModel.loadExecutionState(for: assignment)
        viewModel.noteSaveDebounceNanoseconds = 40_000_000

        for note in ["a", "ab", "abc"] {
            var state = viewModel.executionStates[assignment.eventStaffId] ?? .defaultState
            state.quickNote = note
            viewModel.applyLocalExecutionState(state, for: assignment)
            await viewModel.persistExecutionState(for: assignment, debounce: true)
        }

        // Wait past debounce window for the coalesced PUT.
        try await Task.sleep(nanoseconds: 120_000_000)

        XCTAssertEqual(putCount, 1, "rapid debounced notes must coalesce to one PUT")
        XCTAssertEqual(viewModel.executionStates[assignment.eventStaffId]?.quickNote, "abc")
        XCTAssertEqual(
            viewModel.lastSyncedStates[assignment.eventStaffId]?.quickNote,
            "abc",
            "Coalesced PUT must advance lastSynced to the final note"
        )
    }

    // MARK: - Offline queue treated as optimistic success

    @MainActor
    func testOfflineQueuedPut_KeepsLocalAndAdvancesLastSynced() async throws {
        let assignment = try makeAssignment()

        MockURLProtocol.requestHandler = { [self] request in
            let url = request.url!
            if request.httpMethod == "GET", url.path.contains("execution-state") {
                return okResponse(url: url, data: executionStateJSON(arrival: true))
            }
            if request.httpMethod == "PUT", url.path.contains("execution-state") {
                throw URLError(.notConnectedToInternet)
            }
            return errorResponse(url: url)
        }

        await viewModel.loadExecutionState(for: assignment)

        let offline = AssignmentExecutionState(
            checklist: ExecutionChecklist(arrival: true, materials: true, closing: false),
            quickNote: ""
        )
        await viewModel.saveExecutionState(for: assignment, state: offline, debounce: false)

        let cached = try XCTUnwrap(viewModel.executionStates[assignment.eventStaffId])
        XCTAssertEqual(cached, offline, "Offline-queued PUT must not roll back optimistic UI")
        XCTAssertEqual(
            viewModel.lastSyncedStates[assignment.eventStaffId],
            offline,
            "Offline-queued body is server-bound truth for rollback purposes"
        )
        XCTAssertNil(
            viewModel.executionErrorMessages[assignment.eventStaffId],
            "Queue acceptance must not surface as a hard save error"
        )
        XCTAssertNil(viewModel.errorMessage)
    }

    // MARK: - Quick note length cap

    @MainActor
    func testApplyLocalExecutionState_CapsQuickNoteAtMaxLength() async throws {
        let assignment = try makeAssignment()

        MockURLProtocol.requestHandler = { [self] request in
            let url = request.url!
            if request.httpMethod == "GET", url.path.contains("execution-state") {
                return okResponse(url: url, data: executionStateJSON())
            }
            return errorResponse(url: url)
        }

        await viewModel.loadExecutionState(for: assignment)

        let tooLong = String(repeating: "x", count: TeamMemberPortalViewModel.maxQuickNoteLength + 50)
        var state = AssignmentExecutionState.defaultState
        state.quickNote = tooLong
        viewModel.applyLocalExecutionState(state, for: assignment)

        let cached = try XCTUnwrap(viewModel.executionStates[assignment.eventStaffId])
        XCTAssertEqual(cached.quickNote.count, TeamMemberPortalViewModel.maxQuickNoteLength)
        XCTAssertNotNil(viewModel.executionErrorMessages[assignment.eventStaffId])
        XCTAssertNil(viewModel.errorMessage)

        // Trimming under the cap must clear the length error.
        var trimmed = cached
        trimmed.quickNote = "short"
        viewModel.applyLocalExecutionState(trimmed, for: assignment)
        XCTAssertNil(viewModel.executionErrorMessages[assignment.eventStaffId])
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
        XCTAssertNotNil(viewModel.executionErrorMessages[assignment.eventStaffId])
        XCTAssertNil(viewModel.errorMessage)
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
        XCTAssertNotNil(viewModel.executionErrorMessages[assignment.eventStaffId])
        XCTAssertNil(viewModel.errorMessage)
        XCTAssertNil(
            viewModel.executionStates[assignment.eventStaffId],
            "Failed migrate must clear cache so reopen retries GET+migrate"
        )
        XCTAssertEqual(
            viewModel.executionLoadStates[assignment.eventStaffId],
            .failed,
            "Failed migrate must leave load state failed so UI stays gated"
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

    // MARK: - Non-default server + richer legacy → union merge

    @MainActor
    func testLoadExecutionState_MergesRicherLegacy_WhenServerHasState() async throws {
        let eventId = "ev_legacy_merge"
        let assignment = try makeAssignment(eventStaffId: "es_legacy_merge", eventId: eventId)
        // Legacy has arrival + a longer note that server lacks.
        try seedLegacy(
            eventId: eventId,
            arrival: true,
            materials: false,
            closing: false,
            quickNote: "legacy field note that is longer"
        )
        defer { clearLegacy(eventId: eventId) }

        var putCount = 0
        var putBody: Data?
        MockURLProtocol.requestHandler = { [self] request in
            let url = request.url!
            if request.httpMethod == "GET", url.path.contains("execution-state") {
                return okResponse(
                    url: url,
                    data: executionStateJSON(
                        arrival: false,
                        materials: true,
                        closing: true,
                        quickNote: "server"
                    )
                )
            }
            if request.httpMethod == "PUT", url.path.contains("execution-state") {
                putCount += 1
                // URLProtocol often surfaces body via stream only — echo merged shape.
                let mergedEcho = executionStateJSON(
                    arrival: true,
                    materials: true,
                    closing: true,
                    quickNote: "legacy field note that is longer"
                )
                putBody = request.httpBody ?? mergedEcho
                return okResponse(url: url, data: mergedEcho)
            }
            return errorResponse(url: url)
        }

        await viewModel.loadExecutionState(for: assignment)

        XCTAssertEqual(putCount, 1, "merged state that differs from server must be PUT")
        let state = try XCTUnwrap(viewModel.executionStates[assignment.eventStaffId])
        XCTAssertTrue(state.checklist.arrival, "OR merge keeps legacy arrival")
        XCTAssertTrue(state.checklist.materials, "OR merge keeps server materials")
        XCTAssertTrue(state.checklist.closing, "OR merge keeps server closing")
        XCTAssertEqual(state.quickNote, "legacy field note that is longer")
        // Server-acked merge drops legacy.
        XCTAssertNil(
            UserDefaults.standard.data(forKey: TeamMemberPortalViewModel.legacyDefaultsKey(eventId: eventId))
        )
        XCTAssertEqual(viewModel.lastSyncedStates[assignment.eventStaffId], state)
        XCTAssertNotNil(putBody)
    }

    @MainActor
    func testLoadExecutionState_DropsLegacy_WhenServerAlreadyCoversIt() async throws {
        let eventId = "ev_legacy_covered"
        let assignment = try makeAssignment(eventStaffId: "es_legacy_covered", eventId: eventId)
        // Server has a superset of legacy (OR equals server; note equal/shorter).
        try seedLegacy(eventId: eventId, arrival: true, materials: false, quickNote: "short")
        defer { clearLegacy(eventId: eventId) }

        var putCount = 0
        MockURLProtocol.requestHandler = { [self] request in
            let url = request.url!
            if request.httpMethod == "GET", url.path.contains("execution-state") {
                return okResponse(
                    url: url,
                    data: executionStateJSON(
                        arrival: true,
                        materials: true,
                        closing: true,
                        quickNote: "server longer note"
                    )
                )
            }
            if request.httpMethod == "PUT", url.path.contains("execution-state") {
                putCount += 1
                return okResponse(url: url, data: request.httpBody ?? Data())
            }
            return errorResponse(url: url)
        }

        await viewModel.loadExecutionState(for: assignment)

        XCTAssertEqual(putCount, 0, "no PUT when merge equals server")
        let state = try XCTUnwrap(viewModel.executionStates[assignment.eventStaffId])
        XCTAssertEqual(state.quickNote, "server longer note")
        XCTAssertTrue(state.checklist.materials)
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
        XCTAssertEqual(viewModel.executionLoadStates[assignment.eventStaffId], .ready)
        XCTAssertNil(viewModel.executionErrorMessages[assignment.eventStaffId])
    }

    // MARK: - Cancellation mid-GET is not a hard failure

    @MainActor
    func testLoadExecutionState_CancellationDoesNotSetFailedOrError() async throws {
        let assignment = try makeAssignment(eventStaffId: "es_cancel", eventId: "ev_cancel")
        let gate = Gate()

        MockURLProtocol.requestHandler = { [self] request in
            let url = request.url!
            if request.httpMethod == "GET", url.path.contains("execution-state") {
                gate.waitSync()
                // Simulate task cancellation surface (sheet dismiss cancels .task).
                throw CancellationError()
            }
            return errorResponse(url: url)
        }

        let loadTask = Task { @MainActor in
            await viewModel.loadExecutionState(for: assignment)
        }

        try await Task.sleep(nanoseconds: 50_000_000)
        XCTAssertEqual(viewModel.executionLoadStates[assignment.eventStaffId], .loading)

        loadTask.cancel()
        gate.open()
        await loadTask.value

        XCTAssertEqual(
            viewModel.executionLoadStates[assignment.eventStaffId],
            .idle,
            "Cancellation must reset to idle so reopen can re-GET"
        )
        XCTAssertNil(viewModel.executionStates[assignment.eventStaffId])
        XCTAssertNil(
            viewModel.executionErrorMessages[assignment.eventStaffId],
            "Cancellation must not surface an execution error banner"
        )
        XCTAssertNil(viewModel.errorMessage)
        XCTAssertNotEqual(viewModel.executionLoadStates[assignment.eventStaffId], .failed)
    }

    // MARK: - Migrate fail + concurrent persist must not PUT defaultState

    @MainActor
    func testMigrateFail_ConcurrentPersist_DoesNotPutDefaultState() async throws {
        let eventId = "ev_migrate_race"
        let assignment = try makeAssignment(eventStaffId: "es_migrate_race", eventId: eventId)
        try seedLegacy(eventId: eventId, arrival: true, quickNote: "legacy")
        defer { clearLegacy(eventId: eventId) }

        let putGate = Gate()
        var putBodies: [Data] = []
        var putCount = 0

        MockURLProtocol.requestHandler = { [self] request in
            let url = request.url!
            if request.httpMethod == "GET", url.path.contains("execution-state") {
                return okResponse(url: url, data: executionStateJSON()) // server default
            }
            if request.httpMethod == "PUT", url.path.contains("execution-state") {
                putCount += 1
                putBodies.append(request.httpBody ?? Data())
                putGate.waitSync()
                return errorResponse(url: url, status: 422)
            }
            return errorResponse(url: url)
        }

        let loadTask = Task { @MainActor in
            await viewModel.loadExecutionState(for: assignment)
        }

        // Yield so migrate PUT is in flight (still .loading, not .ready).
        try await Task.sleep(nanoseconds: 50_000_000)
        XCTAssertEqual(viewModel.executionLoadStates[assignment.eventStaffId], .loading)

        // Concurrent user edit while migrate is mid-flight — must be gated.
        var concurrent = AssignmentExecutionState.defaultState
        concurrent.checklist.materials = true
        await viewModel.saveExecutionState(for: assignment, state: concurrent, debounce: false)

        putGate.open()
        await loadTask.value

        XCTAssertEqual(putCount, 1, "only the migrate PUT should fire")
        // Decode migrate body if available — must not be empty defaults from concurrent edit.
        if let body = putBodies.first, !body.isEmpty,
           let decoded = try? JSONDecoder().decode(AssignmentExecutionState.self, from: body) {
            XCTAssertTrue(decoded.checklist.arrival, "migrate PUT must send legacy, not defaults")
            XCTAssertEqual(decoded.quickNote, "legacy")
            XCTAssertFalse(decoded.checklist.materials)
        }

        XCTAssertEqual(viewModel.executionLoadStates[assignment.eventStaffId], .failed)
        XCTAssertNil(viewModel.executionStates[assignment.eventStaffId])
        XCTAssertNotNil(
            UserDefaults.standard.data(
                forKey: TeamMemberPortalViewModel.legacyDefaultsKey(eventId: eventId)
            )
        )
    }

    // MARK: - Failed drain with re-armed pending still attempts newer state

    @MainActor
    func testFailedDrain_ReArmedPending_AttemptsNewerState() async throws {
        let assignment = try makeAssignment(eventStaffId: "es_drain", eventId: "ev_drain")
        let firstPutGate = Gate()
        var putCount = 0

        MockURLProtocol.requestHandler = { [self] request in
            let url = request.url!
            if request.httpMethod == "GET", url.path.contains("execution-state") {
                return okResponse(url: url, data: executionStateJSON(arrival: true, quickNote: "base"))
            }
            if request.httpMethod == "PUT", url.path.contains("execution-state") {
                putCount += 1
                if putCount == 1 {
                    firstPutGate.waitSync()
                    return errorResponse(url: url, status: 422)
                }
                // Second attempt (re-armed newer state) succeeds.
                return okResponse(
                    url: url,
                    data: executionStateJSON(arrival: true, materials: true, quickNote: "newer")
                )
            }
            return errorResponse(url: url)
        }

        await viewModel.loadExecutionState(for: assignment)
        let id = assignment.eventStaffId

        let first = AssignmentExecutionState(
            checklist: ExecutionChecklist(arrival: true, materials: true, closing: false),
            quickNote: "first"
        )
        let firstPut = Task { @MainActor in
            await viewModel.saveExecutionState(for: assignment, state: first, debounce: false)
        }

        try await Task.sleep(nanoseconds: 50_000_000)

        // Re-arm pending with a newer snapshot while first PUT is failing.
        let newer = AssignmentExecutionState(
            checklist: ExecutionChecklist(arrival: true, materials: true, closing: false),
            quickNote: "newer"
        )
        viewModel.applyLocalExecutionState(newer, for: assignment)
        let secondPut = Task { @MainActor in
            await viewModel.persistExecutionState(for: assignment, debounce: false)
        }

        firstPutGate.open()
        await firstPut.value
        await secondPut.value

        // Drain must attempt the re-armed newer state after the first hard failure.
        XCTAssertGreaterThanOrEqual(putCount, 2, "re-armed pending must trigger another PUT")
        XCTAssertEqual(viewModel.executionStates[id]?.quickNote, "newer")
        XCTAssertEqual(
            viewModel.lastSyncedStates[id]?.quickNote,
            "newer",
            "Successful retry of newer state must advance lastSynced"
        )
        XCTAssertNil(viewModel.executionErrorMessages[id])
    }

    // MARK: - Offline migrate keeps legacy until server ack

    @MainActor
    func testLoadExecutionState_KeepsLegacy_OnOfflineQueuedMigrate() async throws {
        let eventId = "ev_legacy_offline"
        let assignment = try makeAssignment(eventStaffId: "es_legacy_offline", eventId: eventId)
        try seedLegacy(eventId: eventId, arrival: true, materials: true, quickNote: "offline migrate")
        defer { clearLegacy(eventId: eventId) }

        MockURLProtocol.requestHandler = { [self] request in
            let url = request.url!
            if request.httpMethod == "GET", url.path.contains("execution-state") {
                return okResponse(url: url, data: executionStateJSON()) // server default
            }
            if request.httpMethod == "PUT", url.path.contains("execution-state") {
                throw URLError(.notConnectedToInternet)
            }
            return errorResponse(url: url)
        }

        await viewModel.loadExecutionState(for: assignment)

        let key = TeamMemberPortalViewModel.legacyDefaultsKey(eventId: eventId)
        XCTAssertNotNil(
            UserDefaults.standard.data(forKey: key),
            "Offline-queued migrate must NOT delete legacy UserDefaults"
        )
        XCTAssertEqual(viewModel.executionLoadStates[assignment.eventStaffId], .ready)
        let state = try XCTUnwrap(viewModel.executionStates[assignment.eventStaffId])
        XCTAssertTrue(state.checklist.arrival)
        XCTAssertEqual(state.quickNote, "offline migrate")
        XCTAssertNil(viewModel.executionErrorMessages[assignment.eventStaffId])
    }

    // MARK: - Offline success clears prior execution error

    @MainActor
    func testOfflineQueuedPut_ClearsPriorExecutionError() async throws {
        let assignment = try makeAssignment(eventStaffId: "es_offline_clear", eventId: "ev_offline_clear")
        var putCount = 0

        MockURLProtocol.requestHandler = { [self] request in
            let url = request.url!
            if request.httpMethod == "GET", url.path.contains("execution-state") {
                return okResponse(url: url, data: executionStateJSON(arrival: true))
            }
            if request.httpMethod == "PUT", url.path.contains("execution-state") {
                putCount += 1
                if putCount == 1 {
                    return errorResponse(url: url, status: 422)
                }
                throw URLError(.notConnectedToInternet)
            }
            return errorResponse(url: url)
        }

        await viewModel.loadExecutionState(for: assignment)

        let failing = AssignmentExecutionState(
            checklist: ExecutionChecklist(arrival: true, materials: true, closing: false),
            quickNote: ""
        )
        await viewModel.saveExecutionState(for: assignment, state: failing, debounce: false)
        XCTAssertNotNil(
            viewModel.executionErrorMessages[assignment.eventStaffId],
            "hard PUT failure must set execution error"
        )

        let offline = AssignmentExecutionState(
            checklist: ExecutionChecklist(arrival: true, materials: true, closing: true),
            quickNote: "queued"
        )
        await viewModel.saveExecutionState(for: assignment, state: offline, debounce: false)

        XCTAssertNil(
            viewModel.executionErrorMessages[assignment.eventStaffId],
            "Offline-queue acceptance must clear prior execution error like HTTP success"
        )
        XCTAssertEqual(viewModel.executionStates[assignment.eventStaffId], offline)
        XCTAssertEqual(viewModel.lastSyncedStates[assignment.eventStaffId], offline)
    }

    // MARK: - Cross-assignment error isolation

    @MainActor
    func testExecutionError_IsScopedPerAssignment() async throws {
        let assignmentA = try makeAssignment(eventStaffId: "es_err_a", eventId: "ev_err_a")
        let assignmentB = try makeAssignment(eventStaffId: "es_err_b", eventId: "ev_err_b")

        MockURLProtocol.requestHandler = { [self] request in
            let url = request.url!
            if request.httpMethod == "GET", url.path.contains("execution-state") {
                return okResponse(url: url, data: executionStateJSON(arrival: true))
            }
            if request.httpMethod == "PUT", url.path.contains("execution-state") {
                // Fail only assignment A's PUT.
                if url.path.contains("es_err_a") {
                    return errorResponse(url: url, status: 422)
                }
                return okResponse(url: url, data: request.httpBody ?? executionStateJSON())
            }
            return errorResponse(url: url)
        }

        await viewModel.loadExecutionState(for: assignmentA)
        await viewModel.loadExecutionState(for: assignmentB)

        var failA = AssignmentExecutionState(
            checklist: ExecutionChecklist(arrival: true, materials: true, closing: false),
            quickNote: ""
        )
        await viewModel.saveExecutionState(for: assignmentA, state: failA, debounce: false)

        XCTAssertNotNil(viewModel.executionErrorMessages[assignmentA.eventStaffId])
        XCTAssertNil(
            viewModel.executionErrorMessages[assignmentB.eventStaffId],
            "Error for A must not leak into B's sheet"
        )

        // B can still save cleanly while A's error remains keyed to A.
        var okB = AssignmentExecutionState(
            checklist: ExecutionChecklist(arrival: true, materials: true, closing: false),
            quickNote: "b ok"
        )
        await viewModel.saveExecutionState(for: assignmentB, state: okB, debounce: false)
        XCTAssertNil(viewModel.executionErrorMessages[assignmentB.eventStaffId])
        XCTAssertNotNil(viewModel.executionErrorMessages[assignmentA.eventStaffId])
        XCTAssertEqual(viewModel.executionStates[assignmentB.eventStaffId]?.quickNote, "b ok")
    }

    // MARK: - GET fail + non-default legacy → offline ready

    @MainActor
    func testLoadExecutionState_GETFail_SeedsLegacyOfflineReady() async throws {
        let eventId = "ev_cold_offline"
        let assignment = try makeAssignment(eventStaffId: "es_cold_offline", eventId: eventId)
        try seedLegacy(eventId: eventId, arrival: true, materials: true, quickNote: "offline progress")
        defer { clearLegacy(eventId: eventId) }

        var putCount = 0
        MockURLProtocol.requestHandler = { [self] request in
            let url = request.url!
            if request.httpMethod == "GET", url.path.contains("execution-state") {
                // Prefer 4xx so APIClient does not retry transient network/5xx.
                return errorResponse(url: url, status: 422)
            }
            if request.httpMethod == "PUT", url.path.contains("execution-state") {
                putCount += 1
                return errorResponse(url: url, status: 422)
            }
            return errorResponse(url: url)
        }

        await viewModel.loadExecutionState(for: assignment)

        XCTAssertEqual(viewModel.executionLoadStates[assignment.eventStaffId], .ready)
        let state = try XCTUnwrap(viewModel.executionStates[assignment.eventStaffId])
        XCTAssertTrue(state.checklist.arrival)
        XCTAssertTrue(state.checklist.materials)
        XCTAssertEqual(state.quickNote, "offline progress")
        XCTAssertEqual(
            viewModel.lastSyncedStates[assignment.eventStaffId],
            state,
            "Seeded legacy is the rollback baseline until a later PUT"
        )
        XCTAssertNil(
            viewModel.executionErrorMessages[assignment.eventStaffId],
            "Legacy seed must not surface as hard load error"
        )
        XCTAssertEqual(putCount, 0, "GET-fail seed must not auto-PUT (avoids clobber on hard fail)")
        // Legacy kept until server-acked PUT.
        XCTAssertNotNil(
            UserDefaults.standard.data(forKey: TeamMemberPortalViewModel.legacyDefaultsKey(eventId: eventId))
        )
    }

    // MARK: - Local edit after offline migrate rewrites legacy

    @MainActor
    func testApplyLocal_AfterOfflineMigrate_RewritesLegacyBlob() async throws {
        let eventId = "ev_legacy_rewrite"
        let assignment = try makeAssignment(eventStaffId: "es_legacy_rewrite", eventId: eventId)
        try seedLegacy(eventId: eventId, arrival: true, materials: false, quickNote: "original")
        defer { clearLegacy(eventId: eventId) }

        MockURLProtocol.requestHandler = { [self] request in
            let url = request.url!
            if request.httpMethod == "GET", url.path.contains("execution-state") {
                return okResponse(url: url, data: executionStateJSON()) // server default
            }
            if request.httpMethod == "PUT", url.path.contains("execution-state") {
                throw URLError(.notConnectedToInternet)
            }
            return errorResponse(url: url)
        }

        await viewModel.loadExecutionState(for: assignment)
        XCTAssertEqual(viewModel.executionLoadStates[assignment.eventStaffId], .ready)

        var edited = try XCTUnwrap(viewModel.executionStates[assignment.eventStaffId])
        edited.checklist.materials = true
        edited.quickNote = "edited offline"
        viewModel.applyLocalExecutionState(edited, for: assignment)

        let key = TeamMemberPortalViewModel.legacyDefaultsKey(eventId: eventId)
        let data = try XCTUnwrap(UserDefaults.standard.data(forKey: key))
        // Decode legacy shape and assert rewrite matches cache (not stale original).
        struct LegacyBlob: Codable {
            var arrivalReady: Bool
            var materialsReady: Bool
            var closingDone: Bool
            var quickNote: String
        }
        let blob = try JSONDecoder().decode(LegacyBlob.self, from: data)
        XCTAssertTrue(blob.arrivalReady)
        XCTAssertTrue(blob.materialsReady, "legacy rewrite must include offline edit")
        XCTAssertEqual(blob.quickNote, "edited offline")
    }

    // MARK: - Server-acked PUT clears leftover legacy after offline migrate

    @MainActor
    func testServerAckedPut_ClearsLegacy_AfterOfflineMigrate() async throws {
        let eventId = "ev_legacy_ack_clear"
        let assignment = try makeAssignment(eventStaffId: "es_legacy_ack_clear", eventId: eventId)
        try seedLegacy(eventId: eventId, arrival: true, quickNote: "pending")
        defer { clearLegacy(eventId: eventId) }

        var putCount = 0
        MockURLProtocol.requestHandler = { [self] request in
            let url = request.url!
            if request.httpMethod == "GET", url.path.contains("execution-state") {
                return okResponse(url: url, data: executionStateJSON())
            }
            if request.httpMethod == "PUT", url.path.contains("execution-state") {
                putCount += 1
                if putCount == 1 {
                    // First migrate PUT is offline-queued.
                    throw URLError(.notConnectedToInternet)
                }
                // Later edit succeeds on the wire.
                return okResponse(url: url, data: request.httpBody ?? executionStateJSON(arrival: true))
            }
            return errorResponse(url: url)
        }

        await viewModel.loadExecutionState(for: assignment)
        let key = TeamMemberPortalViewModel.legacyDefaultsKey(eventId: eventId)
        XCTAssertNotNil(UserDefaults.standard.data(forKey: key), "legacy survives offline migrate")

        var next = try XCTUnwrap(viewModel.executionStates[assignment.eventStaffId])
        next.checklist.materials = true
        await viewModel.saveExecutionState(for: assignment, state: next, debounce: false)

        XCTAssertNil(
            UserDefaults.standard.data(forKey: key),
            "Any server-acked PUT must drop leftover legacy"
        )
        XCTAssertTrue(viewModel.executionStates[assignment.eventStaffId]?.checklist.materials == true)
    }

    // MARK: - Offline-queue error detector

    func testIsOfflineQueuedError_PrefersTypedQueuedOffline() {
        XCTAssertTrue(TeamMemberPortalViewModel.isOfflineQueuedError(APIError.queuedOffline))
        // Legacy substring fallback for pre-typed networkError copy.
        let legacyQueued = APIError.networkError(
            "Sin conexión: guardamos tu cambio y se enviará automáticamente al reconectarte."
        )
        let plain = APIError.networkError("Sin conexión a internet.")
        XCTAssertTrue(TeamMemberPortalViewModel.isOfflineQueuedError(legacyQueued))
        XCTAssertFalse(TeamMemberPortalViewModel.isOfflineQueuedError(plain))
        XCTAssertFalse(TeamMemberPortalViewModel.isOfflineQueuedError(APIError.decodingError))
    }

    func testIsCancellationError_MatchesCancellationSurfaces() {
        XCTAssertTrue(TeamMemberPortalViewModel.isCancellationError(CancellationError()))
        XCTAssertTrue(TeamMemberPortalViewModel.isCancellationError(URLError(.cancelled)))
        XCTAssertFalse(TeamMemberPortalViewModel.isCancellationError(URLError(.notConnectedToInternet)))
        XCTAssertFalse(TeamMemberPortalViewModel.isCancellationError(APIError.decodingError))
    }

    func testMergeExecutionStates_ORsChecklistAndPrefersRicherNote() {
        let server = AssignmentExecutionState(
            checklist: ExecutionChecklist(arrival: false, materials: true, closing: false),
            quickNote: "short"
        )
        let legacy = AssignmentExecutionState(
            checklist: ExecutionChecklist(arrival: true, materials: false, closing: true),
            quickNote: "a much longer legacy note"
        )
        let merged = TeamMemberPortalViewModel.mergeExecutionStates(server: server, legacy: legacy)
        XCTAssertTrue(merged.checklist.arrival)
        XCTAssertTrue(merged.checklist.materials)
        XCTAssertTrue(merged.checklist.closing)
        XCTAssertEqual(merged.quickNote, "a much longer legacy note")
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
