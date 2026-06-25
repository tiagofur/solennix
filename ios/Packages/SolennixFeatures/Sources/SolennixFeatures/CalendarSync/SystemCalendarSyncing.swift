import Foundation
import SolennixCore

// MARK: - SyncAuthorization

/// EventKit authorization status expressed in domain terms so no `EK*` type
/// crosses the `SystemCalendarSyncing` boundary (ADR-1).
public enum SyncAuthorization: Sendable, Equatable {
    /// Permission has not yet been requested.
    case notDetermined
    /// The user explicitly denied access.
    case denied
    /// Access is restricted (e.g. parental controls / MDM).
    case restricted
    /// The user granted full read/write access to events.
    case fullAccess
}

// MARK: - SyncDestination

/// The binary destination a synced event is written to. `.solennix` is the
/// app-managed calendar (default); `.personal` is the user's default system
/// calendar (write-only, surfaced with a warning).
public enum SyncDestination: String, Sendable, Equatable, CaseIterable {
    case solennix
    case personal
}

// MARK: - SyncedItem

/// A persisted link between a Solennix `event.id` and the system calendar's
/// `calendarItemIdentifier` for the mirrored `EKEvent`. Enables idempotent
/// create/update/delete and migration lookups (ADR-5).
public struct SyncedItem: Sendable, Equatable {
    public let eventID: String
    public let calendarItemIdentifier: String

    public init(eventID: String, calendarItemIdentifier: String) {
        self.eventID = eventID
        self.calendarItemIdentifier = calendarItemIdentifier
    }
}

// MARK: - SyncedDestination

/// Identifier-based handle to a system calendar — NOT a wrapper around `EKCalendar`
/// (which is a non-Sendable `NSObject` and cannot cross the protocol boundary).
/// The prod `EventKitSyncService` actor resolves these identifiers back to the live
/// `EKCalendar` / `EKSource` via `EKEventStore` on each call (they are stable across
/// launches). Carrying only `String`s keeps the type `Sendable` + `Equatable` so
/// test doubles and repository logic compare destinations trivially (ADR-1).
public struct SyncedDestination: Sendable, Equatable {
    /// `EKCalendar.calendarIdentifier` — stable across launches.
    public let calendarIdentifier: String
    /// `EKSource.sourceIdentifier` of the calendar owning the above calendar.
    public let sourceIdentifier: String

    public init(calendarIdentifier: String, sourceIdentifier: String) {
        self.calendarIdentifier = calendarIdentifier
        self.sourceIdentifier = sourceIdentifier
    }
}

// MARK: - SyncError

/// Failures surfaced by the system-calendar sync layer, in domain terms (no `EK*`).
public enum SyncError: Error, Sendable, Equatable {
    /// The user's default calendar for new events is unavailable (`.personal`
    /// destination). Per spec, the UI must show an error and ask to re-choose.
    case personalCalendarUnavailable
    /// The requested destination calendar could not be found or created.
    case calendarResolutionFailed
    /// The underlying EventKit store could not be initialized.
    case eventStoreUnavailable
}

// MARK: - SystemCalendarSyncing

/// Write-only EventKit abstraction seam. The prod implementation
/// (`EventKitSyncService`, Phase 2) owns the only `EKEventStore` reference and
/// serializes all access through its actor isolation. Every parameter and return
/// type is a domain type, so a recording `MockSystemCalendarSyncing` (test target)
/// can stand in with zero EventKit coupling (ADR-1).
public protocol SystemCalendarSyncing: AnyObject, Sendable {

    /// Current authorization status (does not prompt).
    func authorizationStatus() -> SyncAuthorization

    /// Requests full access to events (iOS 17 `requestFullAccessToEvents`).
    /// Returns the resulting status; never throws.
    func requestAccess() async -> SyncAuthorization

    /// Resolves a `SyncDestination` to its identifier-based handle, creating the
    /// Solennix calendar on demand when needed (ADR-3).
    func resolveDestination(_ kind: SyncDestination) async throws -> SyncedDestination

    /// Creates a mirrored `EKEvent` for `event` in `dest`; returns its identity.
    func create(_ event: Event, in dest: SyncedDestination) async throws -> SyncedItem

    /// Updates the mirrored event identified by `identifier` to match `event`.
    func update(_ event: Event, identifier: String, in dest: SyncedDestination) async throws

    /// Deletes the mirrored event identified by `identifier` from `dest`.
    func delete(identifier: String, in dest: SyncedDestination) async throws

    /// Moves `items` from one destination to another (delete-old + create-new),
    /// reporting progress 0…1 and returning the new identities (ADR-4).
    func migrate(
        _ items: [SyncedItem],
        from origin: SyncedDestination,
        to destination: SyncedDestination,
        progress: @Sendable (Double) -> Void
    ) async throws -> [SyncedItem]

    /// Ensures the app-managed "Solennix" calendar exists (creates it on the
    /// default source if missing) and returns its handle (ADR-3).
    func ensureSolennixCalendarExists() async throws -> SyncedDestination
}
