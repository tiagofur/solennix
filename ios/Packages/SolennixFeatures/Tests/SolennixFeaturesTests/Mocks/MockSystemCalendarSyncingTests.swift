import XCTest
@testable import SolennixFeatures
import SolennixCore

/// Behavioral tests for `MockSystemCalendarSyncing` — the `SystemCalendarSyncing`
/// test double (ADR-1). `EventRepository` (Phase 2) is injected with this mock so
/// its sync fan-out is assertable with no `EKEventStore`. These tests verify the
/// double records every method and returns the canned domain values the repository
/// tests will rely on.
final class MockSystemCalendarSyncingTests: XCTestCase {

    private func makeEvent(id: String = "evt-1") -> Event {
        Event(
            id: id, userId: "u", clientId: "c", eventDate: "2026-07-01",
            startTime: "10:00", endTime: "12:00", serviceType: "Boda", numPeople: 50,
            status: .confirmed, discount: 0, discountType: .percent, requiresInvoice: false,
            taxRate: 0, taxAmount: 0, totalAmount: 1000,
            createdAt: "2026-06-24T00:00:00Z", updatedAt: "2026-06-24T00:00:00Z"
        )
    }

    // MARK: - authorization / request

    func testAuthorizationStatusReturnsCannedAndRecords() async {
        let mock = MockSystemCalendarSyncing()
        await mock.setAuthorization(.denied)

        let status = await mock.authorizationStatus()

        XCTAssertEqual(status, .denied)
        let calls = await mock.recordedCalls
        XCTAssertEqual(calls, [.authorizationStatus])
    }

    func testRequestAccessReturnsCannedAndRecords() async {
        let mock = MockSystemCalendarSyncing()

        let status = await mock.requestAccess()

        XCTAssertEqual(status, .fullAccess)
        let calls = await mock.recordedCalls
        XCTAssertEqual(calls, [.requestAccess])
    }

    // MARK: - resolveDestination

    func testResolveSolennixReturnsConfiguredDestination() async throws {
        let mock = MockSystemCalendarSyncing()
        let configured = SyncedDestination(calendarIdentifier: "sol-cal", sourceIdentifier: "sol-src")
        await mock.setSolennixDestination(configured)

        let resolved = try await mock.resolveDestination(.solennix)

        XCTAssertEqual(resolved, configured)
        let calls = await mock.recordedCalls
        XCTAssertEqual(calls, [.resolveDestination(.solennix)])
    }

    func testResolvePersonalReturnsConfiguredDestination() async throws {
        let mock = MockSystemCalendarSyncing()
        let configured = SyncedDestination(calendarIdentifier: "pers-cal", sourceIdentifier: "pers-src")
        await mock.setPersonalDestination(configured)

        let resolved = try await mock.resolveDestination(.personal)

        XCTAssertEqual(resolved, configured)
        let calls = await mock.recordedCalls
        XCTAssertEqual(calls, [.resolveDestination(.personal)])
    }

    func testResolvePersonalThrowsPersonalCalendarUnavailableWhenConfigured() async {
        let mock = MockSystemCalendarSyncing()
        await mock.setPersonalDestination(nil) // simulates missing default calendar

        do {
            _ = try await mock.resolveDestination(.personal)
            XCTFail("Expected personalCalendarUnavailable")
        } catch let err as SyncError {
            XCTAssertEqual(err, .personalCalendarUnavailable)
        } catch {
            XCTFail("Expected SyncError, got \(error)")
        }
    }

    // MARK: - create / update / delete

    func testCreateReturnsSyncedItemAndRecords() async throws {
        let mock = MockSystemCalendarSyncing()
        let dest = SyncedDestination(calendarIdentifier: "cal", sourceIdentifier: "src")

        let item = try await mock.create(makeEvent(id: "evt-1"), in: dest)

        XCTAssertEqual(item.eventID, "evt-1")
        XCTAssertEqual(item.calendarItemIdentifier, "ek-created")
        let calls = await mock.recordedCalls
        XCTAssertEqual(calls, [.create(eventID: "evt-1")])
    }

    func testUpdateRecordsEventAndIdentifier() async throws {
        let mock = MockSystemCalendarSyncing()
        let dest = SyncedDestination(calendarIdentifier: "cal", sourceIdentifier: "src")

        try await mock.update(makeEvent(id: "evt-2"), identifier: "ek-9", in: dest)

        let calls = await mock.recordedCalls
        XCTAssertEqual(calls, [.update(eventID: "evt-2", identifier: "ek-9")])
    }

    func testDeleteRecordsIdentifier() async throws {
        let mock = MockSystemCalendarSyncing()
        let dest = SyncedDestination(calendarIdentifier: "cal", sourceIdentifier: "src")

        try await mock.delete(identifier: "ek-9", in: dest)

        let calls = await mock.recordedCalls
        XCTAssertEqual(calls, [.delete(identifier: "ek-9")])
    }

    // MARK: - migrate

    func testMigrateReturnsNewItemsInvokesProgressAndRecords() async throws {
        let mock = MockSystemCalendarSyncing()
        let from = SyncedDestination(calendarIdentifier: "old-cal", sourceIdentifier: "src")
        let to = SyncedDestination(calendarIdentifier: "new-cal", sourceIdentifier: "src")
        let items = [
            SyncedItem(eventID: "evt-1", calendarItemIdentifier: "ek-1"),
            SyncedItem(eventID: "evt-2", calendarItemIdentifier: "ek-2")
        ]

        var progressValues: [Double] = []
        let recorder = ProgressRecorder()
        let migrated = try await mock.migrate(items, from: from, to: to) { recorder.append($0) }
        progressValues = recorder.values

        XCTAssertEqual(migrated.count, 2)
        XCTAssertEqual(migrated.map(\.eventID), ["evt-1", "evt-2"])
        // Progress must span the full 0…1 range with one tick per item.
        XCTAssertEqual(progressValues.count, 2)
        XCTAssertEqual(try XCTUnwrap(progressValues.first), 0.5, accuracy: 0.0001)
        XCTAssertEqual(try XCTUnwrap(progressValues.last), 1.0, accuracy: 0.0001)

        let calls = await mock.recordedCalls
        XCTAssertEqual(calls, [.migrate(eventIDs: ["evt-1", "evt-2"])])
    }

    func testMigrateSimulatesPartialFailureKeepingOldIdentifiers() async throws {
        let mock = MockSystemCalendarSyncing()
        let from = SyncedDestination(calendarIdentifier: "old-cal", sourceIdentifier: "src")
        let to = SyncedDestination(calendarIdentifier: "new-cal", sourceIdentifier: "src")
        let items = [
            SyncedItem(eventID: "evt-1", calendarItemIdentifier: "ek-1"),
            SyncedItem(eventID: "evt-2", calendarItemIdentifier: "ek-2")
        ]
        // evt-2 fails to migrate and keeps its old identifier (ADR-4).
        await mock.setMigrateFailures(["evt-2"])

        let recorder = ProgressRecorder()
        let migrated = try await mock.migrate(items, from: from, to: to) { recorder.append($0) }

        // Successful item gets a new identifier; failed item retains the old one.
        XCTAssertEqual(migrated[0].calendarItemIdentifier, "ek-1-migrated")
        XCTAssertEqual(migrated[1].calendarItemIdentifier, "ek-2", "Failed item keeps old identifier")
    }

    // MARK: - ensureSolennixCalendarExists

    func testEnsureSolennixReturnsDestinationAndRecords() async throws {
        let mock = MockSystemCalendarSyncing()
        let configured = SyncedDestination(calendarIdentifier: "sol-new", sourceIdentifier: "sol-src")
        await mock.setSolennixDestination(configured)

        let resolved = try await mock.ensureSolennixCalendarExists()

        XCTAssertEqual(resolved, configured)
        let calls = await mock.recordedCalls
        XCTAssertEqual(calls, [.ensureSolennixCalendarExists])
    }

    // MARK: - ensureSolennixCalendarExists: the recreate path (ADR-3)

    func testEnsureSolennixReturnsEnsuredDestinationWhenConfigured() async throws {
        // Models "resolve says the Solennix calendar is missing, then ensure recreates
        // it": resolveDestination(.solennix) fails (solennixDestination = nil), but
        // ensure returns the recreated handle (distinct from the missing one).
        let mock = MockSystemCalendarSyncing()
        await mock.setSolennixDestination(nil)
        let recreated = SyncedDestination(calendarIdentifier: "sol-recreated", sourceIdentifier: "sol-src")
        await mock.setEnsuredSolennixDestination(recreated)

        // resolve reports missing...
        do {
            _ = try await mock.resolveDestination(.solennix)
            XCTFail("Expected resolve to report the Solennix calendar as missing")
        } catch let err as SyncError {
            XCTAssertEqual(err, .calendarResolutionFailed)
        }

        // ...but ensure recreates it.
        let ensured = try await mock.ensureSolennixCalendarExists()
        XCTAssertEqual(ensured, recreated)
    }
}

/// Sendable accumulator for the `@Sendable` migration-progress closure. A captured
/// mutable `var` array is not permitted inside a `@Sendable` closure, so progress
/// values are accumulated here instead.
private final class ProgressRecorder: @unchecked Sendable {
    private var storage: [Double] = []
    func append(_ value: Double) { storage.append(value) }
    var values: [Double] { storage }
}
