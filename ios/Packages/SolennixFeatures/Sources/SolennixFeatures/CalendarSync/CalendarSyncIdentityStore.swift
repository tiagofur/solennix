import Foundation

// MARK: - CalendarSyncIdentityStore

/// Device-local side-store mapping a Solennix `event.id` to the system calendar's
/// `calendarItemIdentifier` (and the `SyncDestination` it was written to).
///
/// **ADR-5 — Identity persistence.** `EKEvent.calendarItemIdentifier` must persist
/// so create/update/delete are idempotent and migration can find every synced event.
/// Adding `calendarItemIdentifier` to the `Event` model would require a backend
/// schema change + 3-platform parity — out of scope for this iOS-only change — so
/// identity lives in a local side-store instead. Identity is per-device and retained
/// even while sync is OFF (enables a clean re-enable; a full purge is available via
/// `clearAll()`). The repository (Phase 2) is the only writer; ViewModels never touch it.
public protocol CalendarSyncIdentityStore: Sendable {

    /// Records (or overwrites) the system-calendar identity for `eventID`.
    func set(eventID: String, calendarItemIdentifier: String, destination: SyncDestination) async

    /// Returns the stored `SyncedItem` for `eventID`, or `nil` if it was never synced.
    func get(for eventID: String) async -> SyncedItem?

    /// Returns the destination `eventID` was last written to, or `nil` if unknown.
    func destination(for eventID: String) async -> SyncDestination?

    /// Every stored identity (used by destination-change migration, ADR-4).
    func all() async -> [SyncedItem]

    /// Removes the identity for a single `eventID` (e.g. after a delete).
    func clear(for eventID: String) async

    /// Removes every stored identity.
    func clearAll() async
}

// MARK: - UserDefaultsCalendarSyncIdentityStore

/// `UserDefaults`-backed implementation of `CalendarSyncIdentityStore` (ADR-5).
///
/// Persists the identity map as a JSON-encoded `[eventID: Entry]` blob under a single
/// UserDefaults key. It is an `actor` so all read/write access is serialized (UserDefaults
/// is not safe under concurrent mutation). The blob is small (one entry per synced event),
/// so full read/encode/rewrite per mutation is acceptable.
public actor UserDefaultsCalendarSyncIdentityStore: CalendarSyncIdentityStore {

    private let defaults: UserDefaults
    private let key: String

    /// Codable shape persisted to UserDefaults. `destination` is stored as the raw
    /// value of `SyncDestination` so the stored blob is plain JSON (no enum-tag noise).
    private struct StoredEntry: Codable {
        let calendarItemIdentifier: String
        let destination: String
    }

    /// Creates a store backed by the given `UserDefaults`.
    /// - Parameter defaults: Defaults to `.standard` (the app's device-local store).
    public init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
        self.key = "com.solennix.calendarSync.identities"
    }

    public func set(eventID: String, calendarItemIdentifier: String, destination: SyncDestination) async {
        var entries = readEntries()
        entries[eventID] = StoredEntry(
            calendarItemIdentifier: calendarItemIdentifier,
            destination: destination.rawValue
        )
        writeEntries(entries)
    }

    public func get(for eventID: String) async -> SyncedItem? {
        guard let entry = readEntries()[eventID] else { return nil }
        return SyncedItem(eventID: eventID, calendarItemIdentifier: entry.calendarItemIdentifier)
    }

    public func destination(for eventID: String) async -> SyncDestination? {
        guard let raw = readEntries()[eventID]?.destination else { return nil }
        return SyncDestination(rawValue: raw)
    }

    public func all() async -> [SyncedItem] {
        readEntries().map { SyncedItem(eventID: $0.key, calendarItemIdentifier: $0.value.calendarItemIdentifier) }
    }

    public func clear(for eventID: String) async {
        var entries = readEntries()
        entries.removeValue(forKey: eventID)
        writeEntries(entries)
    }

    public func clearAll() async {
        defaults.removeObject(forKey: key)
    }

    // MARK: - Persistence helpers

    private func readEntries() -> [String: StoredEntry] {
        guard let data = defaults.data(forKey: key),
              let decoded = try? JSONDecoder().decode([String: StoredEntry].self, from: data) else {
            return [:]
        }
        return decoded
    }

    private func writeEntries(_ entries: [String: StoredEntry]) {
        guard let data = try? JSONEncoder().encode(entries) else { return }
        defaults.set(data, forKey: key)
    }
}
