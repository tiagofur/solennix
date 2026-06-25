import XCTest
import SolennixCore
import SolennixNetwork
@testable import SolennixFeatures

/// Task 3.2 — `EventListViewModel` must inject `EventRepository` and route its
/// two mutation sites (`confirmDeleteEvent`, `updateEventStatus`) through it
/// instead of calling `APIClient` directly (ADR-2/ADR-9).
///
/// Same proof strategy as the form test: a REAL `APIClient` (never reached for
/// mutations once rewired) + a repository wired to `MockEventAPI` +
/// `MockSystemCalendarSyncing` + in-memory identity store. Only the doubles
/// reachable through the repository may record calls — so recorded API+sync+
/// identity fan-out proves the list path now crosses the repository boundary.
final class EventListViewModelRepositoryTests: XCTestCase {

    // MARK: - Helpers

    private func makeEvent(id: String = "evt-1", status: EventStatus = .confirmed) -> Event {
        Event(
            id: id, userId: "u", clientId: "c", eventDate: "2026-07-01",
            startTime: "10:00", endTime: "12:00", serviceType: "Boda", numPeople: 50,
            status: status, discount: 0, discountType: .percent, requiresInvoice: false,
            taxRate: 0, taxAmount: 0, totalAmount: 1000,
            createdAt: "2026-06-24T00:00:00Z", updatedAt: "2026-06-24T00:00:00Z"
        )
    }

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

    // MARK: - confirmDeleteEvent → repository.delete

    @MainActor
    func testConfirmDeleteEventRoutesThroughRepository() async throws {
        let (repo, api, sync, identity) = makeRepo(cannedEvent: makeEvent())
        let vm = EventListViewModel(apiClient: APIClient(), eventRepository: repo)

        let event = makeEvent(id: "evt-1")
        // A prior mirror exists — the delete must fan out to remove it.
        await identity.set(eventID: "evt-1", calendarItemIdentifier: "ek-1", destination: .solennix)

        await vm.confirmDeleteEvent(event)

        // API delete crossed the repository boundary.
        let apiCalls = await api.recordedCalls
        XCTAssertEqual(apiCalls.map(\.verb), ["DELETE"])
        XCTAssertEqual(apiCalls.map(\.endpoint), [Endpoint.event("evt-1")])

        // Sync fan-out + identity cleared (implicit on CRUD, ADR-2).
        let syncCalls = await sync.recordedCalls
        XCTAssertEqual(syncCalls, [.resolveDestination(.solennix), .delete(identifier: "ek-1")])
        let stored = await identity.get(for: "evt-1")
        XCTAssertNil(stored, "delete must clear the system identity via the repository")
    }

    @MainActor
    func testConfirmDeleteEventSetsErrorMessageOnRepositoryFailure() async throws {
        // Sync is OFF so the only failure path is the API delete. Inject a
        // throwing double to exercise the list's error-recovery branch.
        let api = MockEventAPI(cannedEvent: makeEvent())
        await api.setError(APIError.serverError(statusCode: 500, message: "boom"))
        let repo = DefaultEventRepository(
            eventAPI: api,
            syncService: MockSystemCalendarSyncing(),
            identityStore: InMemoryCalendarSyncIdentityStore(),
            syncEnabled: { false },
            destination: { .solennix }
        )
        let vm = EventListViewModel(apiClient: APIClient(), eventRepository: repo)

        let event = makeEvent(id: "evt-2")
        await vm.confirmDeleteEvent(event)

        // The delete failed through the repository; the list surfaces the error.
        XCTAssertNotNil(vm.errorMessage, "a repository delete failure must surface a list error")
    }

    // MARK: - updateEventStatus → repository.changeStatus

    @MainActor
    func testUpdateEventStatusRoutesThroughRepositoryAndPatchesLocalEvent() async throws {
        // Canned return carries the NEW status so the local patch is verifiable.
        let (repo, api, sync, identity) = makeRepo(cannedEvent: makeEvent(id: "evt-1", status: .cancelled))
        let vm = EventListViewModel(apiClient: APIClient(), eventRepository: repo)
        vm.events = [makeEvent(id: "evt-1", status: .confirmed)]
        await identity.set(eventID: "evt-1", calendarItemIdentifier: "ek-1", destination: .solennix)

        await vm.updateEventStatus(vm.events[0], to: .cancelled)

        // Status PUT carries exactly {"status":"cancelled"} through the repository.
        let apiCalls = await api.recordedCalls
        XCTAssertEqual(apiCalls.map(\.verb), ["PUT"])
        XCTAssertEqual(apiCalls.first?.endpoint, Endpoint.event("evt-1"))
        let bodyData = try XCTUnwrap(apiCalls.first?.bodyData)
        let decoded = try JSONDecoder().decode([String: String].self, from: bodyData)
        XCTAssertEqual(decoded["status"], "cancelled")

        // Sync UPDATEs the existing mirror (implicit on CRUD).
        let syncCalls = await sync.recordedCalls
        XCTAssertEqual(syncCalls, [.resolveDestination(.solennix), .update(eventID: "evt-1", identifier: "ek-1")])

        // Local event patched in place from the repository's returned event.
        XCTAssertEqual(vm.events.first?.status, .cancelled, "the row must reflect the repository's returned status")
    }
}
