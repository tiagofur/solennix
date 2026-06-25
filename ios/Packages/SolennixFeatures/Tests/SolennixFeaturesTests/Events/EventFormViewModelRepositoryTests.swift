import XCTest
import SolennixCore
import SolennixNetwork
@testable import SolennixFeatures

/// Task 3.1 — `EventFormViewModel.save()` must route its event-mutation
/// call-sites through `EventRepository` instead of calling `APIClient`
/// directly (ADR-2 / ADR-9 rewire).
///
/// Proof strategy: the VM is given a REAL `APIClient` (never reached for
/// mutations once rewired) and an `EventRepository` wired to a `MockEventAPI`
/// (ADR-9 double) + `MockSystemCalendarSyncing` + in-memory identity store.
/// After `save()`, only the `MockEventAPI` (reachable solely through the
/// repository) may have recorded calls — if the form had bypassed the repo and
/// called `apiClient` directly, `MockEventAPI.recordedCalls` would be empty and
/// the assertions would fail. The two-call body shape (POST /events, then PUT
/// /events/{id}/items) is asserted verbatim (ADR-9: no `EventDraft` type).
final class EventFormViewModelRepositoryTests: XCTestCase {

    // MARK: - Helpers

    private func makeEvent(id: String = "new-1") -> Event {
        Event(
            id: id, userId: "u", clientId: "c", eventDate: "2026-07-01",
            startTime: "10:00", endTime: "12:00", serviceType: "Boda", numPeople: 50,
            status: .confirmed, discount: 0, discountType: .percent, requiresInvoice: false,
            taxRate: 0, taxAmount: 0, totalAmount: 1000,
            createdAt: "2026-06-24T00:00:00Z", updatedAt: "2026-06-24T00:00:00Z"
        )
    }

    /// Builds a repository wired to fresh recording mocks (sync ON, `.solennix`).
    private func makeRepo(cannedEvent: Event) -> (repo: DefaultEventRepository, api: MockEventAPI, sync: MockSystemCalendarSyncing, identity: InMemoryCalendarSyncIdentityStore) {
        let api = MockEventAPI(cannedEvent: cannedEvent)
        let sync = MockSystemCalendarSyncing()
        let identity = InMemoryCalendarSyncIdentityStore()
        let repo = DefaultEventRepository(
            eventAPI: api,
            syncService: sync,
            identityStore: identity,
            syncEnabled: { true },
            destination: { .solennix }
        )
        return (repo, api, sync, identity)
    }

    // MARK: - Create path (POST /events → PUT /events/{id}/items)

    @MainActor
    func testSaveCreateRoutesThroughRepositoryNotAPIClient() async throws {
        let canned = makeEvent(id: "new-1")
        let (repo, api, sync, identity) = makeRepo(cannedEvent: canned)

        // REAL apiClient — must NOT be reached for the mutation once rewired.
        let vm = EventFormViewModel(apiClient: APIClient(), eventRepository: repo)
        vm.clientId = "c1"
        vm.serviceType = "Boda"

        try await vm.save()

        // The mutation reached the repository's EventAPI double (POST /events,
        // then PUT /events/{id}/items) — the two-call body shape, verbatim.
        let apiCalls = await api.recordedCalls
        XCTAssertEqual(apiCalls.map(\.verb), ["POST", "PUT"], "create must POST /events then PUT items via the repository")
        XCTAssertEqual(apiCalls.map(\.endpoint), [Endpoint.events, Endpoint.eventItems("new-1")])

        // Sync fanned out implicitly (write-only create) — proving the repo path.
        let syncCalls = await sync.recordedCalls
        XCTAssertEqual(syncCalls, [.resolveDestination(.solennix), .create(eventID: "new-1")])

        // Identity recorded so a repeat mutation is idempotent (ADR-5).
        let stored = await identity.get(for: "new-1")
        XCTAssertEqual(stored, SyncedItem(eventID: "new-1", calendarItemIdentifier: "ek-created"))
    }

    // MARK: - Edit path (PUT /events/{id} → PUT /events/{id}/items)

    @MainActor
    func testSaveEditRoutesThroughRepositoryUpdate() async throws {
        let canned = makeEvent(id: "edit-1")
        let (repo, api, sync, identity) = makeRepo(cannedEvent: canned)

        let vm = EventFormViewModel(apiClient: APIClient(), eventRepository: repo)
        vm.isEdit = true
        vm.editId = "edit-1"
        vm.clientId = "c1"
        vm.serviceType = "Boda Editado"

        try await vm.save()

        // Edit path: PUT /events/{editId} then PUT /events/{editId}/items.
        let apiCalls = await api.recordedCalls
        XCTAssertEqual(apiCalls.map(\.verb), ["PUT", "PUT"])
        XCTAssertEqual(apiCalls.map(\.endpoint), [Endpoint.event("edit-1"), Endpoint.eventItems("edit-1")])

        // Update fans out to a system mirror UPDATE (or CREATE if no prior identity).
        let syncCalls = await sync.recordedCalls
        XCTAssertEqual(syncCalls, [.resolveDestination(.solennix), .create(eventID: "edit-1")])

        let stored = await identity.get(for: "edit-1")
        XCTAssertNotNil(stored, "edit must record/refresh the system identity")
    }
}
