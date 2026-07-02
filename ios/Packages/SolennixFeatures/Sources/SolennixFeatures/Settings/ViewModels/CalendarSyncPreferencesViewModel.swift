import Foundation
import Observation
import SolennixNetwork

// MARK: - CalendarSyncPreferencesViewModel

/// Settings ViewModel for the write-only EventKit system-calendar sync (ADR-6).
///
/// It replicates the `NotificationPreferencesViewModel` contract — a
/// `togglePreference(_:id:)` entry point + an `inFlightKeys` set the View uses to
/// disable a control while its round-trip is in flight — so
/// `CalendarSyncPreferencesView` (Phase 5.2) can reuse the `preferenceToggle`
/// row builder.
///
/// Responsibilities:
/// - **Master toggle** is both the opt-in/out switch AND the EventKit permission
///   re-prompt surface. Turning it ON requests full access via the injected
///   `SystemCalendarSyncing`; if denied/restricted it reverts, signals the View to
///   guide the user to system Settings, and skips sync while the visual
///   `.calendario` mode stays fully usable (graceful degradation).
/// - **Binary destination** selector (`.solennix` default / `.personal`). Selecting
///   `.personal` exposes `showsWriteOnlyWarning` so the View renders the
///   unidirectional transparency warning. A destination change runs the migration
///   through `EventRepository.changeDestination(to:progress:)` (ADR-4).
///
/// Persistence: opt-in state is written to the SAME `UserDefaults` keys
/// `DefaultEventRepository.makeDefault` reads (`calendarSyncEnabled` /
/// `calendarSyncDestination`), so a repository bound to the same `UserDefaults`
/// observes the live toggle/destination on every CRUD without the package
/// depending on SwiftUI's property wrapper.
@Observable
public final class CalendarSyncPreferencesViewModel {

    private func tr(_ key: String, _ value: String) -> String {
        FeatureL10n.text(key, value)
    }

    // MARK: - State

    /// Master sync toggle (opt-in/out). Persisted under `calendarSyncEnabled`.
    public var syncEnabled: Bool = false

    /// Active destination calendar. Persisted under `calendarSyncDestination`.
    public var destination: SyncDestination = .solennix

    /// Keys of in-flight toggle round-trips. Mirrors
    /// `NotificationPreferencesViewModel`: the View disables the matching row
    /// while its `togglePreference` call has not returned.
    public private(set) var inFlightKeys: Set<String> = []

    /// Set when EventKit permission is denied/restricted so the View can surface
    /// a "open system Settings" deep-link. Cleared on a successful opt-in or on
    /// an explicit opt-out (ADR-6).
    public private(set) var shouldGuideToSettings: Bool = false

    /// True while a destination migration is running (ADR-4).
    public private(set) var isMigrating: Bool = false

    /// 0…1 progress of the in-flight destination migration.
    public private(set) var migrationProgress: Double = 0

    /// Surfaced when a destination switch fails (e.g. `.personal` calendar
    /// unavailable). The View asks the user to re-choose (ADR-3).
    public var migrationError: String?

    /// `true` when the active destination is `.personal`, so the View renders the
    /// write-only unidirectional transparency warning (calendar-sync delta).
    public var showsWriteOnlyWarning: Bool { destination == .personal }

    // MARK: - Dependencies

    private let eventRepository: any EventRepository
    private let syncService: any SystemCalendarSyncing
    private let defaults: UserDefaults

    /// `UserDefaults` keys mirrored by `DefaultEventRepository.makeDefault`
    /// (ADR-6). Kept literal-for-literal in sync so the repository's
    /// `syncEnabled` / `destination` closures observe what this ViewModel persists.
    fileprivate static let syncEnabledKey = "calendarSyncEnabled"
    fileprivate static let syncDestinationKey = "calendarSyncDestination"

    // MARK: - Init (full-control — used by tests + previews)

    /// - Parameters:
    ///   - eventRepository: the mutation boundary; only `changeDestination` is
    ///     driven from here (CRUD sync is fanned out from the repository itself).
    ///   - syncService: the EventKit seam used to (re-)request access on toggle.
    ///   - defaults: backing store for the opt-in state. Defaults to `.standard`.
    public init(
        eventRepository: any EventRepository,
        syncService: any SystemCalendarSyncing,
        defaults: UserDefaults = .standard
    ) {
        self.eventRepository = eventRepository
        self.syncService = syncService
        self.defaults = defaults
        self.syncEnabled = (defaults.object(forKey: Self.syncEnabledKey) as? Bool) ?? false
        let raw = defaults.string(forKey: Self.syncDestinationKey) ?? ""
        self.destination = SyncDestination(rawValue: raw) ?? .solennix
    }

    // MARK: - Init (production)

    /// Production wiring from an `APIClient`. Builds ONE shared
    /// `EventKitSyncService` used both for permission requests and as the
    /// repository's sync seam, and binds the repository + this ViewModel to the
    /// SAME `defaults` so opt-in state is observed live on every CRUD.
    public convenience init(apiClient: APIClient, defaults: UserDefaults = .standard) {
        let syncService = EventKitSyncService()
        let syncEnabledKey = Self.syncEnabledKey
        let syncDestinationKey = Self.syncDestinationKey
        // Read values before creating closures to avoid capturing non-Sendable defaults
        let initialSyncEnabled = (defaults.object(forKey: syncEnabledKey) as? Bool) ?? false
        let initialDestination: SyncDestination = {
            let raw = defaults.string(forKey: syncDestinationKey) ?? ""
            return SyncDestination(rawValue: raw) ?? .solennix
        }()
        let repository = DefaultEventRepository(
            eventAPI: apiClient,
            syncService: syncService,
            identityStore: UserDefaultsCalendarSyncIdentityStore(defaults: defaults),
            syncEnabled: { initialSyncEnabled },
            destination: { initialDestination }
        )
        self.init(eventRepository: repository, syncService: syncService, defaults: defaults)
    }

    // MARK: - Toggle (preferenceToggle parity + permission surface)

    /// Entry point for the master toggle row, signature-compatible with
    /// `NotificationPreferencesViewModel.togglePreference`. Guards against a
    /// duplicate in-flight toggle for the same `id`, flips optimistically, then
    /// runs the master-sync permission flow when the toggled property is
    /// `syncEnabled` (ADR-6).
    @MainActor
    public func togglePreference(
        _ keyPath: ReferenceWritableKeyPath<CalendarSyncPreferencesViewModel, Bool>,
        id: String
    ) async {
        guard !inFlightKeys.contains(id) else { return }
        inFlightKeys.insert(id)
        defer { inFlightKeys.remove(id) }

        let oldValue = self[keyPath: keyPath]
        self[keyPath: keyPath] = !oldValue

        // The master sync toggle doubles as the EventKit permission re-prompt
        // surface. Any future Bool toggle would persist its own state here.
        if keyPath == \.syncEnabled {
            await applySyncToggle(previousValue: oldValue)
        } else {
            persistSyncEnabled()
        }
    }

    /// Resolves the master-toggle round-trip (ADR-6). An opt-in requests full
    /// access; denied/restricted reverts the toggle, flags Settings guidance, and
    /// skips sync. An opt-out just persists OFF.
    private func applySyncToggle(previousValue: Bool) async {
        if syncEnabled {
            let status = await syncService.requestAccess()
            if status == .fullAccess {
                shouldGuideToSettings = false
                persistSyncEnabled()
            } else {
                // Graceful degradation: revert, guide to Settings, skip sync.
                syncEnabled = previousValue
                shouldGuideToSettings = true
                persistSyncEnabled()
            }
        } else {
            shouldGuideToSettings = false
            persistSyncEnabled()
        }
    }

    // MARK: - Destination selection (ADR-3 / ADR-4)

    /// Switches the binary destination. Persists the choice immediately (so it
    /// survives even if the migration fails partway) and migrates every
    /// previously-synced event through the repository boundary, surfacing
    /// progress. A failure (e.g. `.personal` unavailable) reverts the persisted
    /// destination and surfaces an error so the user can re-choose.
    @MainActor
    public func setDestination(_ newDestination: SyncDestination) async {
        guard destination != newDestination else { return }
        let previous = destination
        destination = newDestination
        persistDestination()

        isMigrating = true
        migrationProgress = 0
        migrationError = nil
        do {
            try await eventRepository.changeDestination(to: newDestination) { [weak self] progress in
                // The progress closure is `@Sendable` and fires off the main
                // actor; hop back to update the observable state.
                Task { @MainActor [weak self] in
                    self?.migrationProgress = progress
                }
            }
            migrationProgress = 1
        } catch {
            // Revert the persisted destination: the switch did not land, so the
            // UI must not claim a destination it could not move to (ADR-3).
            destination = previous
            persistDestination()
            migrationError = mapMigrationError(error)
        }
        isMigrating = false
    }

    // MARK: - Persistence (mirrors DefaultEventRepository.makeDefault keys)

    private func persistSyncEnabled() {
        defaults.set(syncEnabled, forKey: Self.syncEnabledKey)
    }

    private func persistDestination() {
        defaults.set(destination.rawValue, forKey: Self.syncDestinationKey)
    }

    // MARK: - Error Mapping

    private func mapMigrationError(_ error: Error) -> String {
        // Localized keys are registered by Phase 6.3; the Spanish fallbacks here
        // carry the user-visible text until then (same `tr(key, fallback)` shape
        // every other Settings ViewModel uses).
        if let syncError = error as? SyncError, syncError == .personalCalendarUnavailable {
            return tr(
                "settings.calendar_sync.error.personal_unavailable",
                "No hay un calendario personal predeterminado. Elige otro destino."
            )
        }
        return tr(
            "settings.calendar_sync.error.generic",
            "No se pudo cambiar el calendario de destino."
        )
    }
}
