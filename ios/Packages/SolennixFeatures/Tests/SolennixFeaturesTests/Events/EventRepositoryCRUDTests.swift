import XCTest
import SolennixCore
import SolennixNetwork
@testable import SolennixFeatures

/// Tests for `EventRepository` CRUD → system-calendar sync fan-out (ADR-2).
///
/// `DefaultEventRepository` is the single event-mutation surface: every create /
/// update / changeStatus / delete hits the API FIRST, then (when sync is ON) mirrors
/// to the system calendar via `SystemCalendarSyncing`, rewriting the identity store
/// keyed on the `calendarItemIdentifier` (ADR-5). These tests inject `MockEventAPI`
/// (ADR-9) + `MockSystemCalendarSyncing` + an in-memory identity store so the full
/// fan-out is assertable with no `URLSession` and no `EKEventStore`.
///
/// Covers calendar-sync scenarios (spec delta calendar-sync):
/// - create/edit/delete reflect to system + idempotent on repeat (no duplicate items)
/// - write-only (system edits never flow back — the repo never reads from system)
/// - implicit on every CRUD (no explicit "sync now" step)
final class EventRepositoryCRUDTests: XCTestCase {

    // MARK: - Helpers

    private func makeEvent(id: String = "evt-1") -> Event {
        Event(
            id: id, userId: "u", clientId: "c", eventDate: "2026-07-01",
            startTime: "10:00", endTime: "12:00", serviceType: "Boda", numPeople: 50,
            status: .confirmed, discount: 0, discountType: .percent, requiresInvoice: false,
            taxRate: 0, taxAmount: 0, totalAmount: 1000,
            createdAt: "2026-06-24T00:00:00Z", updatedAt: "2026-06-24T00:00:00Z"
        )
    }

    /// Builds a repository wired to fresh mocks. Sync is ON and destination is
    /// `.solennix` by default; override via the parameters.
    private func makeRepo(
        cannedEvent: Event,
        syncEnabled: Bool = true,
        destination: @escaping @Sendable () -> SyncDestination = { .solennix },
        sync: MockSystemCalendarSyncing = MockSystemCalendarSyncing(),
        identity: InMemoryCalendarSyncIdentityStore = InMemoryCalendarSyncIdentityStore()
    ) -> (repo: DefaultEventRepository, api: MockEventAPI, sync: MockSystemCalendarSyncing, identity: InMemoryCalendarSyncIdentityStore) {
        let api = MockEventAPI(cannedEvent: cannedEvent)
        let repo = DefaultEventRepository(
            eventAPI: api,
            syncService: sync,
            identityStore: identity,
            syncEnabled: { syncEnabled },
            destination: destination
        )
        return (repo, api, sync, identity)
    }

    // MARK: - create

    func testCreateCallsAPIThenSyncsAndStoresIdentity() async throws {
        let canned = makeEvent(id: "evt-1")
        let (repo, api, sync, identity) = makeRepo(cannedEvent: canned)

        let event = try await repo.create(
            eventBody: AnyCodable(["service_type": "Boda"] as [String: Any?]),
            itemsBody: AnyCodable(["products": []] as [String: Any?])
        )

        XCTAssertEqual(event, canned, "create must return the API-persisted Event")

        // API order: POST /events, then PUT /events/{id}/items (matches EventFormViewModel+Save).
        let apiCalls = await api.recordedCalls
        XCTAssertEqual(apiCalls.map(\.verb), ["POST", "PUT"])
        XCTAssertEqual(apiCalls.map(\.endpoint), [Endpoint.events, Endpoint.eventItems("evt-1")])

        // Sync fan-out: resolve destination, then CREATE in system.
        let syncCalls = await sync.recordedCalls
        XCTAssertEqual(syncCalls, [.resolveDestination(.solennix), .create(eventID: "evt-1")])

        // Identity store recorded the new mirror (idempotent key: event.id).
        let stored = await identity.get(for: "evt-1")
        XCTAssertEqual(stored, SyncedItem(eventID: "evt-1", calendarItemIdentifier: "ek-created"))
    }

    func testCreateWithSyncOffPersistsAPIButSkipsMirror() async throws {
        let canned = makeEvent(id: "evt-2")
        let (repo, api, sync, identity) = makeRepo(cannedEvent: canned, syncEnabled: false)

        let event = try await repo.create(
            eventBody: AnyCodable(["service_type": "Boda"] as [String: Any?]),
            itemsBody: AnyCodable(["products": []] as [String: Any?])
        )

        XCTAssertEqual(event, canned, "API persistence is independent of sync")

        // API still hit; sync entirely skipped.
        let apiCalls = await api.recordedCalls
        XCTAssertEqual(apiCalls.count, 2, "API create+items must run even with sync off")
        let syncCalls = await sync.recordedCalls
        XCTAssertTrue(syncCalls.isEmpty, "No sync fan-out when sync is off")
        let stored = await identity.get(for: "evt-2")
        XCTAssertNil(stored, "No identity recorded when sync is off")
    }

    // MARK: - update (idempotency: existing mirror is UPDATED, never duplicated)

    func testUpdateUpdatesExistingMirrorWithoutDuplicate() async throws {
        let canned = makeEvent(id: "evt-1")
        let (repo, api, sync, identity) = makeRepo(cannedEvent: canned)
        // Pre-existing mirror from a prior create — update must reuse its identifier.
        await identity.set(eventID: "evt-1", calendarItemIdentifier: "ek-old", destination: .solennix)

        _ = try await repo.update(
            "evt-1",
            body: AnyCodable(["location": "Salón"] as [String: Any?]),
            itemsBody: nil
        )

        let apiCalls = await api.recordedCalls
        XCTAssertEqual(apiCalls.map(\.verb), ["PUT"], "update with no items body issues a single PUT")

        // Sync UPDATEs the existing item (identifier ek-old) — never CREATEs a second one.
        let syncCalls = await sync.recordedCalls
        XCTAssertEqual(syncCalls, [.resolveDestination(.solennix), .update(eventID: "evt-1", identifier: "ek-old")])

        // Identity rewrite is idempotent: same key, single entry, identifier preserved.
        let all = await identity.all()
        XCTAssertEqual(all.count, 1, "No duplicate identity entry on repeat update")
        let stored = await identity.get(for: "evt-1")
        XCTAssertEqual(stored?.calendarItemIdentifier, "ek-old")
    }

    func testUpdateWithoutPriorIdentityCreatesMirror() async throws {
        let canned = makeEvent(id: "evt-3")
        let (repo, _, sync, identity) = makeRepo(cannedEvent: canned)
        // No prior identity (e.g. sync was off at create time) → first sync CREATEs.

        _ = try await repo.update(
            "evt-3",
            body: AnyCodable(["notes": "ok"] as [String: Any?]),
            itemsBody: nil
        )

        let syncCalls = await sync.recordedCalls
        XCTAssertEqual(syncCalls, [.resolveDestination(.solennix), .create(eventID: "evt-3")])
        let stored = await identity.get(for: "evt-3")
        XCTAssertEqual(stored, SyncedItem(eventID: "evt-3", calendarItemIdentifier: "ek-created"))
    }

    // MARK: - changeStatus

    func testChangeStatusPutsStatusBodyAndMirrorsUpdate() async throws {
        let canned = makeEvent(id: "evt-1")
        let (repo, api, sync, identity) = makeRepo(cannedEvent: canned)
        await identity.set(eventID: "evt-1", calendarItemIdentifier: "ek-1", destination: .solennix)

        let returned = try await repo.changeStatus("evt-1", to: .cancelled)

        XCTAssertEqual(returned, canned)

        // The status PUT carries exactly {"status":"cancelled"}.
        let apiCalls = await api.recordedCalls
        XCTAssertEqual(apiCalls.map(\.verb), ["PUT"])
        XCTAssertEqual(apiCalls.first?.endpoint, Endpoint.event("evt-1"))
        let bodyData = try XCTUnwrap(apiCalls.first?.bodyData)
        let decoded = try JSONDecoder().decode([String: String].self, from: bodyData)
        XCTAssertEqual(decoded["status"], "cancelled")

        // Sync UPDATEs the existing mirror (implicit on CRUD).
        let syncCalls = await sync.recordedCalls
        XCTAssertEqual(syncCalls, [.resolveDestination(.solennix), .update(eventID: "evt-1", identifier: "ek-1")])
    }

    // MARK: - delete

    func testDeleteCallsAPIDeleteThenSyncDeleteAndClearsIdentity() async throws {
        let canned = makeEvent(id: "evt-1")
        let (repo, api, sync, identity) = makeRepo(cannedEvent: canned)
        await identity.set(eventID: "evt-1", calendarItemIdentifier: "ek-1", destination: .solennix)

        try await repo.delete("evt-1")

        let apiCalls = await api.recordedCalls
        XCTAssertEqual(apiCalls.map(\.verb), ["DELETE"])
        XCTAssertEqual(apiCalls.first?.endpoint, Endpoint.event("evt-1"))

        let syncCalls = await sync.recordedCalls
        XCTAssertEqual(syncCalls, [.resolveDestination(.solennix), .delete(identifier: "ek-1")])

        let stored = await identity.get(for: "evt-1")
        XCTAssertNil(stored, "Identity must be cleared once the event is deleted")
    }

    func testDeleteWithSyncOffStillClearsIdentity() async throws {
        let canned = makeEvent(id: "evt-1")
        let (repo, api, sync, identity) = makeRepo(cannedEvent: canned, syncEnabled: false)
        await identity.set(eventID: "evt-1", calendarItemIdentifier: "ek-1", destination: .solennix)

        try await repo.delete("evt-1")

        // API delete ran; sync was skipped; the stale mapping is dropped regardless.
        let apiCalls = await api.recordedCalls
        XCTAssertEqual(apiCalls.count, 1)
        let syncCalls = await sync.recordedCalls
        XCTAssertTrue(syncCalls.isEmpty)
        let stored = await identity.get(for: "evt-1")
        XCTAssertNil(stored, "A deleted Solennix event must not retain a system mapping")
    }

    func testDeleteIsIdempotentWhenNoMirrorExists() async throws {
        let canned = makeEvent(id: "evt-9")
        let (repo, api, sync, _) = makeRepo(cannedEvent: canned)

        try await repo.delete("evt-9")

        // API delete fires once; with no identity there is no system delete (no duplicate).
        let apiCalls = await api.recordedCalls
        XCTAssertEqual(apiCalls.count, 1)
        let syncCalls = await sync.recordedCalls
        XCTAssertTrue(syncCalls.isEmpty, "No system delete when nothing was ever mirrored")
    }

    // MARK: - write-only + implicit-on-CRUD

    func testCreateSyncFanOutIsWriteOnly() async throws {
        let canned = makeEvent(id: "evt-1")
        let (repo, _, sync, _) = makeRepo(cannedEvent: canned)

        _ = try await repo.create(
            eventBody: AnyCodable(["service_type": "Boda"] as [String: Any?]),
            itemsBody: AnyCodable(["products": []] as [String: Any?])
        )

        // The mirror is strictly write-only: every recorded sync call is a resolve
        // (write target) or a create (write). `SystemCalendarSyncing` exposes NO read
        // verb, so a system-side edit can never flow back into Solennix.
        let syncCalls = await sync.recordedCalls
        for call in syncCalls {
            switch call {
            case .resolveDestination, .create, .update, .delete, .ensureSolennixCalendarExists, .migrate:
                continue // all write-side
            case .authorizationStatus, .requestAccess:
                XCTFail("Mirror fan-out must not read authorization during CRUD; got \(call)")
            }
        }
        XCTAssertEqual(syncCalls, [.resolveDestination(.solennix), .create(eventID: "evt-1")])
    }
}
