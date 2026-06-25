import Foundation
import SolennixCore
@testable import SolennixFeatures

/// A recording test double for `SystemCalendarSyncing` (ADR-1).
///
/// `EventRepository` (Phase 2) is injected with an `any SystemCalendarSyncing`.
/// In tests it receives this mock instead of the prod `EventKitSyncService`, so the
/// CRUD → sync fan-out (create/update/delete/migrate) is assertable with no
/// `EKEventStore` and no EventKit permission prompt.
///
/// It is an `actor` (hence `@Sendable`): serializing all access means there is no
/// data race when Phase 2's `EventRepository.changeDestination` runs migration on a
/// detached `Task` while other CRUD occurs. Every method records a `RecordedCall`
/// capturing the verb and its key arguments, then returns a canned domain value (or
/// throws a configured `SyncError`). Migration supports per-item failure simulation
/// (ADR-4 partial-failure recovery).
public actor MockSystemCalendarSyncing: SystemCalendarSyncing {

    /// One recorded `SystemCalendarSyncing` invocation, for assertion.
    public enum RecordedCall: Sendable, Equatable {
        case authorizationStatus
        case requestAccess
        case resolveDestination(SyncDestination)
        case create(eventID: String)
        case update(eventID: String, identifier: String)
        case delete(identifier: String)
        case migrate(eventIDs: [String])
        case ensureSolennixCalendarExists
    }

    /// Every call made through this double, in call order.
    public private(set) var recordedCalls: [RecordedCall] = []

    // MARK: - Canned configuration

    /// Value returned by `authorizationStatus()` / `requestAccess()` (default `.fullAccess`).
    public var authorization: SyncAuthorization = .fullAccess

    /// Destination returned by `resolveDestination(.solennix)` and
    /// `ensureSolennixCalendarExists()`. `nil` forces `.calendarResolutionFailed`.
    public var solennixDestination: SyncedDestination? =
        SyncedDestination(calendarIdentifier: "solennix-cal", sourceIdentifier: "solennix-src")

    /// Destination returned by `resolveDestination(.personal)`. `nil` simulates the
    /// user having no default calendar for new events → throws
    /// `.personalCalendarUnavailable` (ADR-3).
    public var personalDestination: SyncedDestination? =
        SyncedDestination(calendarIdentifier: "personal-cal", sourceIdentifier: "personal-src")

    /// Identifier handed back by `create()` and used as the migration suffix.
    public var createdIdentifier: String = "ek-created"

    /// Event IDs whose migration should fail (they retain their old identifier).
    public var migrateFailures: Set<String> = []

    /// Thrown by create/update/delete/migrate/ensure when non-nil (in addition to
    /// the personal-calendar rule).
    public var errorToThrow: SyncError?

    // MARK: - Isolated configuration setters

    public func setAuthorization(_ authorization: SyncAuthorization) {
        self.authorization = authorization
    }

    public func setSolennixDestination(_ dest: SyncedDestination?) {
        self.solennixDestination = dest
    }

    public func setPersonalDestination(_ dest: SyncedDestination?) {
        self.personalDestination = dest
    }

    public func setMigrateFailures(_ eventIDs: Set<String>) {
        self.migrateFailures = eventIDs
    }

    public func setError(_ error: SyncError?) {
        self.errorToThrow = error
    }

    // MARK: - SystemCalendarSyncing

    public func authorizationStatus() async -> SyncAuthorization {
        recordedCalls.append(.authorizationStatus)
        return authorization
    }

    public func requestAccess() async -> SyncAuthorization {
        recordedCalls.append(.requestAccess)
        return authorization
    }

    public func resolveDestination(_ kind: SyncDestination) async throws -> SyncedDestination {
        recordedCalls.append(.resolveDestination(kind))
        switch kind {
        case .solennix:
            if let errorToThrow { throw errorToThrow }
            guard let solennixDestination else { throw SyncError.calendarResolutionFailed }
            return solennixDestination
        case .personal:
            if let errorToThrow { throw errorToThrow }
            guard let personalDestination else { throw SyncError.personalCalendarUnavailable }
            return personalDestination
        }
    }

    public func create(_ event: Event, in dest: SyncedDestination) async throws -> SyncedItem {
        recordedCalls.append(.create(eventID: event.id))
        if let errorToThrow { throw errorToThrow }
        return SyncedItem(eventID: event.id, calendarItemIdentifier: createdIdentifier)
    }

    public func update(_ event: Event, identifier: String, in dest: SyncedDestination) async throws {
        recordedCalls.append(.update(eventID: event.id, identifier: identifier))
        if let errorToThrow { throw errorToThrow }
    }

    public func delete(identifier: String, in dest: SyncedDestination) async throws {
        recordedCalls.append(.delete(identifier: identifier))
        if let errorToThrow { throw errorToThrow }
    }

    public func migrate(
        _ items: [SyncedItem],
        from origin: SyncedDestination,
        to destination: SyncedDestination,
        progress: @Sendable (Double) -> Void
    ) async throws -> [SyncedItem] {
        recordedCalls.append(.migrate(eventIDs: items.map(\.eventID)))
        if let errorToThrow { throw errorToThrow }

        var migrated: [SyncedItem] = []
        let total = max(items.count, 1)
        for (index, item) in items.enumerated() {
            if migrateFailures.contains(item.eventID) {
                // ADR-4: failed item keeps its old identifier, re-runnable.
                migrated.append(item)
            } else {
                migrated.append(
                    SyncedItem(eventID: item.eventID, calendarItemIdentifier: "\(item.calendarItemIdentifier)-migrated")
                )
            }
            progress(Double(index + 1) / Double(total))
        }
        return migrated
    }

    public func ensureSolennixCalendarExists() async throws -> SyncedDestination {
        recordedCalls.append(.ensureSolennixCalendarExists)
        if let errorToThrow { throw errorToThrow }
        guard let solennixDestination else { throw SyncError.calendarResolutionFailed }
        return solennixDestination
    }
}
