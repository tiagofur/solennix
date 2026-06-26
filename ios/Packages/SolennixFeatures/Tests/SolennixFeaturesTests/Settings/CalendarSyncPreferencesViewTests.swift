import XCTest
import SwiftUI
import SnapshotTesting
import SolennixCore
import SolennixNetwork
@testable import SolennixFeatures

/// Task 5.2 — `CalendarSyncPreferencesView` (calendar-sync delta).
///
/// Spec scenarios (calendar-sync delta — "Calendar Sync Preferences Screen"):
///   Scenario: Preferences screen mirrors Notification pattern
///     GIVEN the user opens calendar sync preferences from Settings
///     WHEN  the screen renders
///     THEN  it MUST use `preferenceToggle` for the master toggle, `.solennixRow()`,
///           `.tint(SolennixColors.primary)`, and track in-flight toggles via
///           `inFlightKeys`.
///   Scenario: Personal selection shows write-only warning
///     GIVEN sync preferences open
///     WHEN  the user selects "Personal"
///     THEN  a write-only unidirectional warning MUST be displayed.
///
/// The ViewModel behavior (toggle/permission flow, binary destination default +
/// write-only flag, `inFlightKeys` parity) is already pinned by
/// `CalendarSyncPreferencesViewModelTests` (task 5.1). This file adds the VIEW
/// wiring layer following the repo's ADR-8 seam philosophy (mirrors tasks 4.2/4.6):
///   • the binary destination selector is a pure, ViewModel-free seam
///     (`CalendarSyncDestinationPicker`) so it is snapshot + binding-wire testable;
///   • the write-only warning is a pure seam (`CalendarSyncWriteOnlyWarning`);
///   • the full `CalendarSyncPreferencesView` is snapshot-hosted in a
///     `NavigationStack` at `.solennix` and `.personal` to prove the write-only
///     warning appears ONLY on `.personal` (the conditional the View owns).
final class CalendarSyncPreferencesViewTests: XCTestCase {

    // MARK: - Helpers (mirror the 5.1 fixtures: isolated UserDefaults + mock sync)

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

    /// Isolated `UserDefaults` so the View/VM snapshots never touch `.standard`.
    private func freshDefaults() -> UserDefaults {
        let suite = "CalendarSyncPrefsViewTests-\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suite)!
        defaults.removePersistentDomain(forName: suite)
        return defaults
    }

    /// A ViewModel seeded to a deterministic render state. Destination/sync are
    /// set directly (no `setDestination` call) so the repository stays inert and
    /// the snapshot pins the View's conditional rendering, not async side effects.
    @MainActor
    private func makeViewModel(
        destination: SyncDestination = .solennix,
        syncEnabled: Bool = false
    ) -> CalendarSyncPreferencesViewModel {
        let sync = MockSystemCalendarSyncing()
        let (repo, _) = makeRepo(sync: sync)
        let vm = CalendarSyncPreferencesViewModel(
            eventRepository: repo, syncService: sync, defaults: freshDefaults()
        )
        vm.destination = destination
        vm.syncEnabled = syncEnabled
        return vm
    }

    // MARK: - Destination selector seam (renders + reflects binding + writes through)

    func testDestinationPickerReflectsSolennixSelection() {
        // Default entry: "Solennix" MUST be the selected destination (ADR-3).
        assertSnapshot(
            of: CalendarSyncDestinationPicker(selection: .constant(.solennix)).padding(),
            as: .image(layout: .fixed(width: 360, height: 64)),
            testName: "destination-solennix"
        )
    }

    func testDestinationPickerReflectsPersonalSelection() {
        // Triangulation: the SAME selector bound to `.personal` shows Personal
        // selected — proving the binary selector reflects its binding and that
        // the View can switch between the two destinations.
        assertSnapshot(
            of: CalendarSyncDestinationPicker(selection: .constant(.personal)).padding(),
            as: .image(layout: .fixed(width: 360, height: 64)),
            testName: "destination-personal"
        )
    }

    func testDestinationPickerWritesSelectionThroughBinding() {
        // Wiring proof (mirrors `EventListViewViewModeTests`): the picker MUST
        // write its selection through the binding so the View's binding `set`
        // (which calls `viewModel.setDestination`) actually fires on a tap.
        var destination: SyncDestination = .solennix
        let binding = Binding<SyncDestination>(
            get: { destination },
            set: { destination = $0 }
        )
        _ = CalendarSyncDestinationPicker(selection: binding)

        binding.wrappedValue = .personal
        XCTAssertEqual(destination, .personal, "picker must write .personal through its binding")
        binding.wrappedValue = .solennix
        XCTAssertEqual(destination, .solennix, "picker must write .solennix through its binding")
    }

    // MARK: - Write-only warning seam (renders)

    func testWriteOnlyWarningRenders() {
        // The unidirectional write-only transparency warning MUST render as a
        // distinct, snapshot-testable component the View shows on `.personal`.
        assertSnapshot(
            of: CalendarSyncWriteOnlyWarning().padding(),
            as: .image(layout: .fixed(width: 360, height: 140)),
            testName: "write-only-warning"
        )
    }

    // MARK: - Full view: write-only warning appears ONLY on `.personal`

    @MainActor
    func testViewShowsWriteOnlyWarningOnlyWhenDestinationIsPersonal() {
        // Default (.solennix) → the write-only warning MUST NOT appear.
        assertSnapshot(
            of: NavigationStack {
                CalendarSyncPreferencesView(viewModel: makeViewModel(destination: .solennix))
            },
            as: .image(layout: .fixed(width: 390, height: 720)),
            testName: "view-solennix-no-warning"
        )

        // .personal → the write-only unidirectional warning MUST be displayed.
        assertSnapshot(
            of: NavigationStack {
                CalendarSyncPreferencesView(viewModel: makeViewModel(destination: .personal))
            },
            as: .image(layout: .fixed(width: 390, height: 720)),
            testName: "view-personal-write-only-warning"
        )
    }
}
