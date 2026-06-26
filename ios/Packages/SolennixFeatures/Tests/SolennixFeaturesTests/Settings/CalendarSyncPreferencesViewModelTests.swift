import XCTest
import SolennixCore
import SolennixNetwork
@testable import SolennixFeatures

/// Task 5.1 — `CalendarSyncPreferencesViewModel` (calendar-sync delta).
///
/// Covers the four calendar-sync scenarios assigned to the Settings preferences
/// screen (toggle/permission ×2, binary-destination default+warning ×2) plus the
/// `inFlightKeys` parity contract that `CalendarSyncPreferencesView` (Phase 5.2)
/// will rely on to mirror the `NotificationPreferencesView` pattern.
///
/// The ViewModel is the EventKit permission re-prompt surface (ADR-6) and the
/// binary destination selector (ADR-3/ADR-4). It persists opt-in state through
/// the SAME `UserDefaults` keys `DefaultEventRepository.makeDefault` reads
/// (`calendarSyncEnabled` / `calendarSyncDestination`), so a repository wired to
/// the same `UserDefaults` observes the live toggle/destination on every CRUD.
final class CalendarSyncPreferencesViewModelTests: XCTestCase {

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

    /// Repository double wired to a recording `SystemCalendarSyncing` mock + an
    /// in-memory identity store. The `destination`/`syncEnabled` closures are
    /// fixed (independent of the ViewModel's `UserDefaults`) so the VM tests
    /// assert VM behavior, not repo wiring.
    private func makeRepo(
        sync: MockSystemCalendarSyncing,
        identity: InMemoryCalendarSyncIdentityStore = InMemoryCalendarSyncIdentityStore()
    ) -> (repo: DefaultEventRepository, identity: InMemoryCalendarSyncIdentityStore) {
        let repo = DefaultEventRepository(
            eventAPI: MockEventAPI(cannedEvent: makeEvent()),
            syncService: sync,
            identityStore: identity,
            syncEnabled: { false },
            destination: { .solennix }
        )
        return (repo, identity)
    }

    /// Isolated `UserDefaults` suite so persistence assertions never touch
    /// `.standard` (and never leak between tests).
    private func freshDefaults() -> UserDefaults {
        let suite = "CalendarSyncPrefsVMTests-\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suite)!
        defaults.removePersistentDomain(forName: suite)
        return defaults
    }

    // MARK: - Master toggle + permission (ADR-6)

    @MainActor
    func testToggleOnWithAuthorizationEnablesSync() async throws {
        let sync = MockSystemCalendarSyncing()
        await sync.setAuthorization(.fullAccess)
        let (repo, _) = makeRepo(sync: sync)
        let defaults = freshDefaults()
        let vm = CalendarSyncPreferencesViewModel(
            eventRepository: repo, syncService: sync, defaults: defaults
        )

        XCTAssertFalse(vm.syncEnabled, "sync starts OFF by default")
        XCTAssertFalse(vm.shouldGuideToSettings)

        await vm.togglePreference(\.syncEnabled, id: "calendarSyncEnabled")

        XCTAssertTrue(vm.syncEnabled, "authorized → sync stays ON")
        XCTAssertFalse(vm.shouldGuideToSettings, "no Settings guidance when authorized")

        // Persisted through the SAME key the repository reads (ADR-6).
        let persisted = defaults.object(forKey: "calendarSyncEnabled") as? Bool
        XCTAssertEqual(persisted, true, "opt-in must persist so subsequent CRUD syncs")
    }

    @MainActor
    func testPermissionDeniedRevertsToggleSkipsSyncAndGuidesToSettings() async throws {
        let sync = MockSystemCalendarSyncing()
        await sync.setAuthorization(.denied)
        let (repo, _) = makeRepo(sync: sync)
        let defaults = freshDefaults()
        let vm = CalendarSyncPreferencesViewModel(
            eventRepository: repo, syncService: sync, defaults: defaults
        )

        XCTAssertFalse(vm.syncEnabled)

        await vm.togglePreference(\.syncEnabled, id: "calendarSyncEnabled")

        // Denied → toggle reverts (stays OFF).
        XCTAssertFalse(vm.syncEnabled, "denied → toggle must revert to OFF")
        // Graceful degradation: signal "open system Settings" + skip sync.
        XCTAssertTrue(vm.shouldGuideToSettings, "denied → must guide the user to system Settings")
        let persisted = defaults.object(forKey: "calendarSyncEnabled") as? Bool ?? true
        XCTAssertFalse(persisted, "denied → sync is skipped (persisted OFF, no system writes)")

        // A permission request actually happened (re-prompt surface).
        let calls = await sync.recordedCalls
        XCTAssertTrue(calls.contains(.requestAccess), "toggle ON must request EventKit access")
    }

    // MARK: - Binary destination (ADR-3)

    @MainActor
    func testDefaultDestinationIsSolennixAndPersonalShowsWarning() async throws {
        let sync = MockSystemCalendarSyncing()
        let (repo, _) = makeRepo(sync: sync)
        let defaults = freshDefaults()
        let vm = CalendarSyncPreferencesViewModel(
            eventRepository: repo, syncService: sync, defaults: defaults
        )

        XCTAssertEqual(vm.destination, .solennix, "default destination MUST be Solennix")
        XCTAssertFalse(vm.showsWriteOnlyWarning, "Solennix has no write-only warning")

        await vm.setDestination(.personal)

        XCTAssertEqual(vm.destination, .personal)
        XCTAssertTrue(vm.showsWriteOnlyWarning, "Personal MUST surface the write-only warning flag")
        XCTAssertEqual(
            defaults.string(forKey: "calendarSyncDestination"),
            "personal",
            "destination must persist through the SAME key the repository reads"
        )
    }

    @MainActor
    func testDestinationChangeCallsRepositoryChangeDestination() async throws {
        let sync = MockSystemCalendarSyncing()
        let identity = InMemoryCalendarSyncIdentityStore()
        let repo = DefaultEventRepository(
            eventAPI: MockEventAPI(cannedEvent: makeEvent()),
            syncService: sync,
            identityStore: identity,
            syncEnabled: { false },
            destination: { .solennix }
        )
        let defaults = freshDefaults()
        let vm = CalendarSyncPreferencesViewModel(
            eventRepository: repo, syncService: sync, defaults: defaults
        )

        // Seed one synced identity so the migration has work to do (otherwise
        // changeDestination is a no-op and would not invoke the sync service).
        await identity.set(eventID: "evt-1", calendarItemIdentifier: "ek-1", destination: .solennix)

        await vm.setDestination(.personal)

        // changeDestination ran through the repository boundary → the sync mock
        // recorded a migrate from Solennix (origin) to Personal (target).
        let calls = await sync.recordedCalls
        XCTAssertTrue(
            calls.contains(.migrate(eventIDs: ["evt-1"])),
            "destination change must migrate synced events via EventRepository.changeDestination"
        )
    }

    // MARK: - inFlightKeys parity (NotificationPreferencesViewModel contract)

    @MainActor
    func testInFlightKeyIsClearedAfterToggleCompletes() async throws {
        let sync = MockSystemCalendarSyncing()
        await sync.setAuthorization(.fullAccess)
        let (repo, _) = makeRepo(sync: sync)
        let vm = CalendarSyncPreferencesViewModel(
            eventRepository: repo, syncService: sync, defaults: freshDefaults()
        )

        XCTAssertFalse(vm.inFlightKeys.contains("calendarSyncEnabled"))

        await vm.togglePreference(\.syncEnabled, id: "calendarSyncEnabled")

        XCTAssertFalse(
            vm.inFlightKeys.contains("calendarSyncEnabled"),
            "inFlightKey must be removed once the toggle round-trip completes (parity)"
        )
    }
}
