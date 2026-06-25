import XCTest
@testable import SolennixFeatures

/// Tests for `CalendarSyncIdentityStore` (ADR-5): the device-local side-store that
/// maps a Solennix `event.id` → the system calendar's `calendarItemIdentifier` (and
/// the `SyncDestination` it was written to). Enables idempotent create/update/delete
/// and migration lookups with ZERO backend change (Event has no calendarItemIdentifier;
/// adding one would require a 3-platform schema change, out of scope for iOS-only).
final class CalendarSyncIdentityStoreTests: XCTestCase {

    // MARK: - In-memory impl: the protocol contract (set/get/all/clear)

    func testInMemorySetAndGetRoundTripsIdentifier() async {
        let store = InMemoryCalendarSyncIdentityStore()

        await store.set(eventID: "evt-1", calendarItemIdentifier: "ek-1", destination: .solennix)

        let item = await store.get(for: "evt-1")
        XCTAssertEqual(item, SyncedItem(eventID: "evt-1", calendarItemIdentifier: "ek-1"))
    }

    func testInMemoryGetReturnsNilForUnknownEvent() async {
        let store = InMemoryCalendarSyncIdentityStore()

        let item = await store.get(for: "missing")

        XCTAssertNil(item)
    }

    func testInMemoryAllReturnsEveryStoredItem() async {
        let store = InMemoryCalendarSyncIdentityStore()
        await store.set(eventID: "evt-1", calendarItemIdentifier: "ek-1", destination: .solennix)
        await store.set(eventID: "evt-2", calendarItemIdentifier: "ek-2", destination: .personal)

        let all = await store.all()

        XCTAssertEqual(all.count, 2)
        XCTAssertTrue(all.contains(SyncedItem(eventID: "evt-1", calendarItemIdentifier: "ek-1")))
        XCTAssertTrue(all.contains(SyncedItem(eventID: "evt-2", calendarItemIdentifier: "ek-2")))
    }

    func testInMemoryOverwriteUpdatesIdentifier() async {
        let store = InMemoryCalendarSyncIdentityStore()
        await store.set(eventID: "evt-1", calendarItemIdentifier: "ek-old", destination: .solennix)

        // Re-set with a new identifier (migration / update path).
        await store.set(eventID: "evt-1", calendarItemIdentifier: "ek-new", destination: .personal)

        let item = await store.get(for: "evt-1")
        XCTAssertEqual(item?.calendarItemIdentifier, "ek-new")
        let dest = await store.destination(for: "evt-1")
        XCTAssertEqual(dest, .personal)
    }

    func testInMemoryClearRemovesSingleEntry() async {
        let store = InMemoryCalendarSyncIdentityStore()
        await store.set(eventID: "evt-1", calendarItemIdentifier: "ek-1", destination: .solennix)
        await store.set(eventID: "evt-2", calendarItemIdentifier: "ek-2", destination: .solennix)

        await store.clear(for: "evt-1")

        let cleared = await store.get(for: "evt-1")
        let remainingCount = await store.all().count
        XCTAssertNil(cleared)
        XCTAssertEqual(remainingCount, 1)
    }

    func testInMemoryClearAllWipesEverything() async {
        let store = InMemoryCalendarSyncIdentityStore()
        await store.set(eventID: "evt-1", calendarItemIdentifier: "ek-1", destination: .solennix)
        await store.set(eventID: "evt-2", calendarItemIdentifier: "ek-2", destination: .personal)

        await store.clearAll()

        let allAfterClear = await store.all()
        let destinationAfterClear = await store.destination(for: "evt-1")
        XCTAssertTrue(allAfterClear.isEmpty)
        XCTAssertNil(destinationAfterClear)
    }

    // MARK: - UserDefaults impl: device-local persistence (ADR-5)

    func testUserDefaultsStorePersistsAcrossInstances() async {
        let suite = "com.solennix.tests.identityStore.\(UUID().uuidString)"
        defer { UserDefaults().removePersistentDomain(forName: suite) }
        let defaults = UserDefaults(suiteName: suite)!

        let writer = UserDefaultsCalendarSyncIdentityStore(defaults: defaults)
        await writer.set(eventID: "evt-1", calendarItemIdentifier: "ek-1", destination: .solennix)

        // A brand-new instance backed by the same UserDefaults must see the write —
        // proving the identity survives an app relaunch (device-local persistence).
        let reader = UserDefaultsCalendarSyncIdentityStore(defaults: defaults)
        let item = await reader.get(for: "evt-1")
        let destination = await reader.destination(for: "evt-1")

        XCTAssertEqual(item, SyncedItem(eventID: "evt-1", calendarItemIdentifier: "ek-1"))
        XCTAssertEqual(destination, .solennix)
    }

    func testUserDefaultsStoreClearAllRemovesPersistedData() async {
        let suite = "com.solennix.tests.identityStore.\(UUID().uuidString)"
        defer { UserDefaults().removePersistentDomain(forName: suite) }
        let defaults = UserDefaults(suiteName: suite)!

        let store = UserDefaultsCalendarSyncIdentityStore(defaults: defaults)
        await store.set(eventID: "evt-1", calendarItemIdentifier: "ek-1", destination: .solennix)

        await store.clearAll()

        // New instance observes the cleared state.
        let reader = UserDefaultsCalendarSyncIdentityStore(defaults: defaults)
        let all = await reader.all()
        XCTAssertTrue(all.isEmpty)
    }
}
