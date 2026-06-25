import XCTest
import SolennixCore
import SolennixNetwork
@testable import SolennixFeatures

/// Tests for `EventRepository.changeDestination(to:progress:)` — the destination
/// auto-migration (ADR-4).
///
/// Switching the destination MUST move every previously-synced event: delete from the
/// old destination and create in the new one, run as a background task, surface
/// progress 0…1, and remain re-runnable on partial failure (failed items keep their
/// old identifier so a second run retries just those).
final class EventRepositoryMigrationTests: XCTestCase {

    // MARK: - Helpers

    private func makeEvent(id: String) -> Event {
        Event(
            id: id, userId: "u", clientId: "c", eventDate: "2026-07-01",
            startTime: "10:00", endTime: "12:00", serviceType: "Boda", numPeople: 50,
            status: .confirmed, discount: 0, discountType: .percent, requiresInvoice: false,
            taxRate: 0, taxAmount: 0, totalAmount: 1000,
            createdAt: "2026-06-24T00:00:00Z", updatedAt: "2026-06-24T00:00:00Z"
        )
    }

    private func makeRepo(
        currentDestination: @escaping @Sendable () -> SyncDestination = { .solennix }
    ) -> (repo: DefaultEventRepository, api: MockEventAPI, sync: MockSystemCalendarSyncing, identity: InMemoryCalendarSyncIdentityStore) {
        let api = MockEventAPI(cannedEvent: makeEvent(id: "evt-1"))
        let sync = MockSystemCalendarSyncing()
        let identity = InMemoryCalendarSyncIdentityStore()
        let repo = DefaultEventRepository(
            eventAPI: api,
            syncService: sync,
            identityStore: identity,
            syncEnabled: { true },
            destination: currentDestination
        )
        return (repo, api, sync, identity)
    }

    // MARK: - Happy path: every synced event is moved

    func testChangeDestinationMigratesAllItemsRewritesIdentitiesAndSurfacesProgress() async throws {
        let (repo, _, sync, identity) = makeRepo(currentDestination: { .solennix })
        await identity.set(eventID: "evt-1", calendarItemIdentifier: "ek-1", destination: .solennix)
        await identity.set(eventID: "evt-2", calendarItemIdentifier: "ek-2", destination: .solennix)

        let recorder = ProgressRecorder()
        try await repo.changeDestination(to: .personal) { recorder.append($0) }

        // migrate() received both items, from the Solennix destination to Personal.
        // (Identity-store iteration order is non-deterministic, so the migrate
        // eventIDs are compared as a set, not a sequence.)
        let syncCalls = await sync.recordedCalls
        XCTAssertEqual(syncCalls.count, 3)
        XCTAssertEqual(syncCalls[0], .resolveDestination(.solennix), "Origin resolved first")
        XCTAssertEqual(syncCalls[1], .resolveDestination(.personal), "Target resolved second")
        guard case .migrate(let ids) = syncCalls[2] else {
            XCTFail("Expected a migrate call third, got \(syncCalls[2])")
            return
        }
        XCTAssertEqual(Set(ids), ["evt-1", "evt-2"])

        // Both identities rewritten with the migrated identifier + new destination.
        let evt1 = await identity.get(for: "evt-1")
        let evt2 = await identity.get(for: "evt-2")
        XCTAssertEqual(evt1?.calendarItemIdentifier, "ek-1-migrated")
        XCTAssertEqual(evt2?.calendarItemIdentifier, "ek-2-migrated")
        let dest1 = await identity.destination(for: "evt-1")
        let dest2 = await identity.destination(for: "evt-2")
        XCTAssertEqual(dest1, .personal)
        XCTAssertEqual(dest2, .personal)

        // Progress spanned the full 0…1 range, one tick per item.
        XCTAssertEqual(recorder.values.count, 2)
        XCTAssertEqual(try XCTUnwrap(recorder.values.first), 0.5, accuracy: 0.0001)
        XCTAssertEqual(try XCTUnwrap(recorder.values.last), 1.0, accuracy: 0.0001)
    }

    // MARK: - Partial failure: failed items keep old id + old destination; re-runnable

    func testChangeDestinationPartialFailureKeepsOldIdentifierAndDoesNotThrow() async throws {
        let (repo, _, sync, identity) = makeRepo(currentDestination: { .solennix })
        await identity.set(eventID: "evt-1", calendarItemIdentifier: "ek-1", destination: .solennix)
        await identity.set(eventID: "evt-2", calendarItemIdentifier: "ek-2", destination: .solennix)
        await sync.setMigrateFailures(["evt-2"]) // evt-2 fails to migrate (ADR-4)

        let recorder = ProgressRecorder()
        // Must NOT throw on partial failure — a half-done switch is recoverable.
        try await repo.changeDestination(to: .personal) { recorder.append($0) }

        // evt-1 migrated (new id + .personal); evt-2 RETAINED its old id + old destination.
        let evt1 = await identity.get(for: "evt-1")
        let evt2 = await identity.get(for: "evt-2")
        XCTAssertEqual(evt1?.calendarItemIdentifier, "ek-1-migrated")
        XCTAssertEqual(evt2?.calendarItemIdentifier, "ek-2", "Failed item keeps its old identifier")
        let dest1 = await identity.destination(for: "evt-1")
        let dest2 = await identity.destination(for: "evt-2")
        XCTAssertEqual(dest1, .personal)
        XCTAssertEqual(dest2, .solennix, "Failed item stays in the old destination")

        // Migration still reported progress for every item (including the failed one).
        XCTAssertEqual(recorder.values.count, 2)
    }

    func testChangeDestinationIsReRunnableAfterPartialFailure() async throws {
        let (repo, _, sync, identity) = makeRepo(currentDestination: { .solennix })
        await identity.set(eventID: "evt-1", calendarItemIdentifier: "ek-1", destination: .solennix)
        await identity.set(eventID: "evt-2", calendarItemIdentifier: "ek-2", destination: .solennix)

        // First run: evt-2 fails.
        await sync.setMigrateFailures(["evt-2"])
        try await repo.changeDestination(to: .personal) { _ in }

        // Second run: clear the failure — evt-2 must now migrate (re-runnable, ADR-4).
        await sync.setMigrateFailures([])
        // Origin is now .personal for evt-1 but evt-2 is still .solennix; re-running
        // re-migrates everything still pointing at an old destination.
        try await repo.changeDestination(to: .personal) { _ in }

        let evt2 = await identity.get(for: "evt-2")
        XCTAssertEqual(evt2?.calendarItemIdentifier, "ek-2-migrated", "Re-run migrates the previously-failed item")
        let dest2 = await identity.destination(for: "evt-2")
        XCTAssertEqual(dest2, .personal)
    }

    // MARK: - Empty migration is a no-op with completed progress

    func testChangeDestinationWithNoSyncedItemsCompletesWithoutMigrating() async throws {
        let (repo, _, sync, _) = makeRepo(currentDestination: { .solennix })

        let recorder = ProgressRecorder()
        try await repo.changeDestination(to: .personal) { recorder.append($0) }

        let syncCalls = await sync.recordedCalls
        // Nothing to migrate: no resolve, no migrate call.
        XCTAssertTrue(syncCalls.isEmpty || syncCalls.allSatisfy({ if case .migrate = $0 { return false }; return true }),
                      "No migration when there is nothing synced")
        XCTAssertEqual(try XCTUnwrap(recorder.values.last), 1.0, accuracy: 0.0001,
                       "Progress must report completion even when there is nothing to move")
    }
}

/// Sendable accumulator for the `@Sendable` migration-progress closure.
private final class ProgressRecorder: @unchecked Sendable {
    private var storage: [Double] = []
    func append(_ value: Double) { storage.append(value) }
    var values: [Double] { storage }
}
