import XCTest
import SolennixCore
import SolennixNetwork
@testable import SolennixFeatures

/// Tests for `EventRepository` missing-calendar resilience (ADR-3) + the
/// `syncAuthorization` accessor.
///
/// Two scenarios (spec delta calendar-sync "Missing Calendar Resilience"):
/// - `.solennix` calendar deleted while sync is ON → the service recreates it and the
///   write still succeeds (no error surfaced).
/// - `.personal` (default system calendar) unavailable → a typed
///   `SyncError.personalCalendarUnavailable` is surfaced so the UI can ask the user
///   to re-choose a destination.
final class EventRepositoryResilienceTests: XCTestCase {

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

    private func makeRepo(
        destination: @escaping @Sendable () -> SyncDestination = { .solennix },
        sync: MockSystemCalendarSyncing = MockSystemCalendarSyncing(),
        identity: InMemoryCalendarSyncIdentityStore = InMemoryCalendarSyncIdentityStore()
    ) -> (repo: DefaultEventRepository, api: MockEventAPI, sync: MockSystemCalendarSyncing, identity: InMemoryCalendarSyncIdentityStore) {
        let api = MockEventAPI(cannedEvent: makeEvent())
        let repo = DefaultEventRepository(
            eventAPI: api,
            syncService: sync,
            identityStore: identity,
            syncEnabled: { true },
            destination: destination
        )
        return (repo, api, sync, identity)
    }

    // MARK: - syncAuthorization accessor

    func testSyncAuthorizationDelegatesToSyncService() async {
        let (repo, _, sync, _) = makeRepo()
        await sync.setAuthorization(.restricted)

        let status = await repo.syncAuthorization

        XCTAssertEqual(status, .restricted)
        let calls = await sync.recordedCalls
        XCTAssertEqual(calls, [.authorizationStatus])
    }

    // MARK: - .solennix missing → recreate, write succeeds

    func testSolennixMissingRecreatesCalendarAndWriteSucceeds() async throws {
        let (repo, api, sync, identity) = makeRepo(destination: { .solennix })
        // resolveDestination(.solennix) reports the calendar as missing → recreate.
        await sync.setSolennixDestination(nil)
        let recreated = SyncedDestination(calendarIdentifier: "solennix-recreated", sourceIdentifier: "solennix-src")
        await sync.setEnsuredSolennixDestination(recreated)

        // The create MUST succeed — the Solennix calendar is recreated on the fly.
        let event = try await repo.create(
            eventBody: AnyCodable(["service_type": "Boda"] as [String: Any?]),
            itemsBody: AnyCodable(["products": []] as [String: Any?])
        )
        XCTAssertEqual(event, makeEvent())

        // API persisted first (POST + PUT items), as always.
        let apiCalls = await api.recordedCalls
        XCTAssertEqual(apiCalls.map(\.verb), ["POST", "PUT"])

        // Fan-out: resolve said missing → ensure recreated → create in the new calendar.
        let syncCalls = await sync.recordedCalls
        XCTAssertEqual(syncCalls, [
            .resolveDestination(.solennix),
            .ensureSolennixCalendarExists,
            .create(eventID: "evt-1")
        ])

        // Identity recorded against the recreated write.
        let stored = await identity.get(for: "evt-1")
        XCTAssertEqual(stored, SyncedItem(eventID: "evt-1", calendarItemIdentifier: "ek-created"))
    }

    // MARK: - .personal missing → surface typed error

    func testPersonalMissingSurfacesPersonalCalendarUnavailable() async throws {
        let (repo, api, sync, identity) = makeRepo(destination: { .personal })
        // No default system calendar → resolveDestination(.personal) throws.
        await sync.setPersonalDestination(nil)

        // API create succeeds first; the sync fan-out then surfaces the config error.
        do {
            _ = try await repo.create(
                eventBody: AnyCodable(["service_type": "Boda"] as [String: Any?]),
                itemsBody: AnyCodable(["products": []] as [String: Any?])
            )
            XCTFail("Expected personalCalendarUnavailable to be surfaced")
        } catch let error as SyncError {
            XCTAssertEqual(error, .personalCalendarUnavailable)
        } catch {
            XCTFail("Expected SyncError.personalCalendarUnavailable, got \(error)")
        }

        // The event WAS persisted server-side before the sync error surfaced.
        let apiCalls = await api.recordedCalls
        XCTAssertEqual(apiCalls.map(\.verb), ["POST", "PUT"])

        // Nothing was mirrored (no identity recorded).
        let stored = await identity.get(for: "evt-1")
        XCTAssertNil(stored)
    }

    // MARK: - resilience also applies to destination-change migration

    func testChangeDestinationToMissingPersonalSurfacesError() async throws {
        let (repo, _, sync, identity) = makeRepo(destination: { .solennix })
        await identity.set(eventID: "evt-1", calendarItemIdentifier: "ek-1", destination: .solennix)
        // Target (.personal) unavailable.
        await sync.setPersonalDestination(nil)

        do {
            try await repo.changeDestination(to: .personal) { _ in }
            XCTFail("Expected personalCalendarUnavailable before migration could start")
        } catch let error as SyncError {
            XCTAssertEqual(error, .personalCalendarUnavailable)
        } catch {
            XCTFail("Expected SyncError.personalCalendarUnavailable, got \(error)")
        }

        // Nothing migrated; identity untouched.
        let stored = await identity.get(for: "evt-1")
        XCTAssertEqual(stored?.calendarItemIdentifier, "ek-1")
    }
}
