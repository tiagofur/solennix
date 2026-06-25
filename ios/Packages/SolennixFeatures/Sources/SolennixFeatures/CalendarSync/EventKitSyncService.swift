import Foundation
import EventKit
import SolennixCore
#if canImport(UIKit)
import UIKit
#endif

// MARK: - Pure authorization-status mapping

/// Maps EventKit's `EKAuthorizationStatus` into the domain `SyncAuthorization` (ADR-1).
///
/// This is the single piece of pure, side-effect-free logic in `EventKitSyncService`,
/// extracted as a free function so it is unit-testable without an `EKEventStore`
/// instance or an EventKit permission prompt (Strict-TDD: extract-before-mock). The
/// actor's `authorizationStatus()` is a thin wrapper around this transformation.
@usableFromInline
func mapEKAuthorizationStatus(_ status: EKAuthorizationStatus) -> SyncAuthorization {
    switch status {
    case .notDetermined:
        return .notDetermined
    case .restricted:
        return .restricted
    case .denied:
        return .denied
    // iOS 17 `requestFullAccessToEvents` grants `.fullAccess`; a device that granted
    // access under the legacy API reports `.authorized` (deprecated). Both mean "we
    // may write" and collapse to `.fullAccess`.
    case .fullAccess, .authorized, .writeOnly:
        return .fullAccess
    @unknown default:
        // Conservative default for any future case: treat as no access.
        return .denied
    }
}

// MARK: - EventKitSyncService

/// Production `SystemCalendarSyncing` implementation backed by the sole `EKEventStore`
/// (ADR-1). It is an `actor` so every `EKEventStore` access is serialized (EventKit is
/// not safe under concurrent access from multiple threads — see Risks in design.md).
///
/// **Not unit-tested end-to-end**: exercising a real `EKEventStore` requires an
/// EventKit permission prompt and a configured simulator calendar, which is flaky and
/// non-hermetic. Its observable behavior (authorize/resolve/create/update/delete/
/// migrate/ensure) is instead proven through `EventRepository` (Phase 2.2–2.4) using
/// `MockSystemCalendarSyncing`. The pure status mapping above is the only directly
/// unit-tested piece. Compiles + links via the iOS `xcodebuild` scheme.
public actor EventKitSyncService: SystemCalendarSyncing {

    /// The single owned EventKit store; never accessed off-actor.
    private let store: EKEventStore

    /// Title used to identify the app-managed "Solennix" calendar (ADR-3).
    private let solennixCalendarTitle = "Solennix"

    public init(store: EKEventStore = EKEventStore()) {
        self.store = store
    }

    // MARK: - Authorization

    public func authorizationStatus() async -> SyncAuthorization {
        mapEKAuthorizationStatus(EKEventStore.authorizationStatus(for: .event))
    }

    public func requestAccess() async -> SyncAuthorization {
        // iOS 17 full-access request. Never throws out of the protocol: a failure
        // (denied dialog, restriction, store error) collapses to `.denied` so the
        // toggle flow can revert + guide to Settings (ADR-6).
        do {
            let granted = try await store.requestFullAccessToEvents()
            return granted ? .fullAccess : .denied
        } catch {
            return .denied
        }
    }

    // MARK: - Destination resolution (ADR-3)

    public func resolveDestination(_ kind: SyncDestination) async throws -> SyncedDestination {
        switch kind {
        case .solennix:
            // Look up the app-managed calendar by title. If absent, throw and let the
            // repository recover via `ensureSolennixCalendarExists()` (ADR-3 recreate).
            if let calendar = solennixCalendar() {
                return SyncedDestination(
                    calendarIdentifier: calendar.calendarIdentifier,
                    sourceIdentifier: calendar.source.sourceIdentifier
                )
            }
            throw SyncError.calendarResolutionFailed
        case .personal:
            // The user's default calendar for new events. Unavailable (nil) → typed
            // error the repository surfaces so the UI asks the user to re-choose.
            guard let calendar = store.defaultCalendarForNewEvents else {
                throw SyncError.personalCalendarUnavailable
            }
            return SyncedDestination(
                calendarIdentifier: calendar.calendarIdentifier,
                sourceIdentifier: calendar.source.sourceIdentifier
            )
        }
    }

    public func ensureSolennixCalendarExists() async throws -> SyncedDestination {
        // Idempotent: return the existing one if present.
        if let existing = solennixCalendar() {
            return SyncedDestination(
                calendarIdentifier: existing.calendarIdentifier,
                sourceIdentifier: existing.source.sourceIdentifier
            )
        }
        // Create on the best available source: prefer the default calendar's source
        // (usually the user's iCloud/calDA), else the first available source.
        let source =
            store.defaultCalendarForNewEvents?.source
            ?? store.sources.first(where: { $0.sourceType == .calDAV })
            ?? store.sources.first
        guard let source else { throw SyncError.calendarResolutionFailed }

        let calendar = EKCalendar(for: .event, eventStore: store)
        calendar.title = solennixCalendarTitle
        calendar.source = source
        #if canImport(UIKit)
        calendar.cgColor = UIColor.systemBlue.cgColor
        #endif

        do {
            try store.saveCalendar(calendar, commit: true)
        } catch {
            throw SyncError.calendarResolutionFailed
        }
        return SyncedDestination(
            calendarIdentifier: calendar.calendarIdentifier,
            sourceIdentifier: source.sourceIdentifier
        )
    }

    // MARK: - Create / Update / Delete

    public func create(_ event: Event, in dest: SyncedDestination) async throws -> SyncedItem {
        let ekEvent = EKEvent(eventStore: store)
        apply(event, to: ekEvent)
        ekEvent.calendar = try resolveCalendar(dest)
        do {
            try store.save(ekEvent, span: .thisEvent, commit: true)
        } catch {
            throw SyncError.calendarResolutionFailed
        }
        return SyncedItem(eventID: event.id, calendarItemIdentifier: ekEvent.calendarItemIdentifier)
    }

    public func update(_ event: Event, identifier: String, in dest: SyncedDestination) async throws {
        // Find the existing mirrored event by its stable identifier; fall back to a
        // fresh EKEvent if missing (treated as a create — keeps sync idempotent).
        // (`findEvent`, not `event`, avoids shadowing by the `event` parameter.)
        let ekEvent = findEvent(matchingIdentifier: identifier) ?? EKEvent(eventStore: store)
        apply(event, to: ekEvent)
        ekEvent.calendar = try resolveCalendar(dest)
        do {
            try store.save(ekEvent, span: .thisEvent, commit: true)
        } catch {
            throw SyncError.calendarResolutionFailed
        }
    }

    public func delete(identifier: String, in dest: SyncedDestination) async throws {
        // Idempotent: a missing item is already deleted — no-op, no error.
        guard let ekEvent = findEvent(matchingIdentifier: identifier) else { return }
        do {
            try store.remove(ekEvent, span: .thisEvent, commit: true)
        } catch {
            throw SyncError.calendarResolutionFailed
        }
    }

    // MARK: - Migration (ADR-4)

    public func migrate(
        _ items: [SyncedItem],
        from origin: SyncedDestination,
        to destination: SyncedDestination,
        progress: @Sendable (Double) -> Void
    ) async throws -> [SyncedItem] {
        let target = try resolveCalendar(destination)
        let total = max(items.count, 1)
        var migrated: [SyncedItem] = []

        for (index, item) in items.enumerated() {
            // Read the existing EKEvent from the old destination to capture its data.
            guard let existing = findEvent(matchingIdentifier: item.calendarItemIdentifier) else {
                // Cannot find the source item — keep its old identifier (re-runnable).
                migrated.append(item)
                progress(Double(index + 1) / Double(total))
                continue
            }
            // Create the copy in the new destination, then remove the original.
            let copy = EKEvent(eventStore: store)
            copyAll(from: existing, to: copy)
            copy.calendar = target
            do {
                try store.save(copy, span: .thisEvent, commit: true)
                try store.remove(existing, span: .thisEvent, commit: true)
            } catch {
                // Per-item isolation (ADR-4): keep the old identifier so this item is
                // recoverable by re-running the migration.
                migrated.append(item)
                progress(Double(index + 1) / Double(total))
                continue
            }
            migrated.append(
                SyncedItem(eventID: item.eventID, calendarItemIdentifier: copy.calendarItemIdentifier)
            )
            progress(Double(index + 1) / Double(total))
        }
        return migrated
    }

    // MARK: - EK helpers (actor-isolated)

    private func solennixCalendar() -> EKCalendar? {
        store.calendars(for: .event).first(where: { $0.title == solennixCalendarTitle })
    }

    /// Resolves an identifier-based `SyncedDestination` back to the live `EKCalendar`.
    /// Stable across launches (identifiers persist), so per-call lookup is correct.
    private func resolveCalendar(_ dest: SyncedDestination) throws -> EKCalendar {
        if let calendar = store.calendars(for: .event).first(where: {
            $0.calendarIdentifier == dest.calendarIdentifier
        }) {
            return calendar
        }
        throw SyncError.calendarResolutionFailed
    }

    /// Finds a mirrored `EKEvent` by its `calendarItemIdentifier` across all events.
    private func findEvent(matchingIdentifier identifier: String) -> EKEvent? {
        let predicate = store.predicateForEvents(
            withStart: Date.distantPast,
            end: Date.distantFuture,
            calendars: nil
        )
        return store.events(matching: predicate).first(where: {
            $0.calendarItemIdentifier == identifier
        })
    }

    /// Maps the Solennix `Event` domain model onto an `EKEvent` (write-only mirror).
    private func apply(_ event: Event, to ekEvent: EKEvent) {
        ekEvent.title = event.serviceType
        ekEvent.startDate = EventKitDateParsing.start(event) ?? Date()
        ekEvent.endDate = EventKitDateParsing.end(event) ?? (ekEvent.startDate.addingTimeInterval(3600))
        ekEvent.location = [event.location, event.city]
            .compactMap { $0?.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
            .joined(separator: ", ")
            .nilIfEmpty
        ekEvent.notes = EventKitDateParsing.notes(for: event)
    }

    /// Copies all user-visible fields between two EKEvents (migration copy).
    private func copyAll(from source: EKEvent, to target: EKEvent) {
        target.title = source.title
        target.startDate = source.startDate
        target.endDate = source.endDate
        target.location = source.location
        target.notes = source.notes
        target.isAllDay = source.isAllDay
        target.alarms = source.alarms
        target.recurrenceRules = source.recurrenceRules
        target.timeZone = source.timeZone
        target.url = source.url
    }
}

// MARK: - Event → EKEvent field parsing

/// Pure date/notes parsing for the `Event` → `EKEvent` mapping. Kept free of
/// `EKEventStore` so the helpers are deterministic and side-effect-free.
@usableFromInline
enum EventKitDateParsing {

    /// Parses `eventDate` ("yyyy-MM-dd", UTC-pinned) and optional `startTime` ("HH:mm").
    @usableFromInline
    static func start(_ event: Event) -> Date? {
        let day = Self.dayFormatter.date(from: event.eventDate) ?? midnightToday()
        guard let startTime = event.startTime,
              let time = Self.timeFormatter.date(from: startTime) else {
            return day
        }
        return combine(day: day, time: time)
    }

    /// Parses `eventDate` + optional `endTime`; defaults to start + 1h.
    @usableFromInline
    static func end(_ event: Event) -> Date? {
        let start = Self.start(event) ?? Date()
        guard let endTime = event.endTime,
              let time = Self.timeFormatter.date(from: endTime) else {
            return nil
        }
        let combined = combine(day: start, time: time)
        return combined > start ? combined : combined.addingTimeInterval(3600)
    }

    /// Builds a short human-readable note carrying status/people (write-only mirror).
    @usableFromInline
    static func notes(for event: Event) -> String {
        var parts = ["Solennix · \(event.status.rawValue) · \(event.numPeople) personas"]
        if let notes = event.notes?.trimmingCharacters(in: .whitespacesAndNewlines), !notes.isEmpty {
            parts.append(notes)
        }
        return parts.joined(separator: "\n")
    }

    // MARK: - Formatting helpers

    private static let dayFormatter: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        // Pin to UTC so the calendar day round-trips for negative-offset users (MX).
        f.timeZone = TimeZone(secondsFromGMT: 0)
        return f
    }()

    private static let timeFormatter: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "HH:mm"
        return f
    }()

    private static func midnightToday() -> Date {
        Calendar.current.startOfDay(for: Date())
    }

    /// Merges the calendar-day of `day` with the time-of-day of `time`.
    private static func combine(day: Date, time: Date) -> Date {
        let calendar = Calendar(identifier: .gregorian)
        let dayComponents = calendar.dateComponents([.year, .month, .day], from: day)
        let timeComponents = calendar.dateComponents([.hour, .minute, .second], from: time)
        var combined = DateComponents()
        combined.year = dayComponents.year
        combined.month = dayComponents.month
        combined.day = dayComponents.day
        combined.hour = timeComponents.hour
        combined.minute = timeComponents.minute
        combined.second = timeComponents.second
        combined.timeZone = TimeZone(secondsFromGMT: 0)
        return calendar.date(from: combined) ?? day
    }
}

private extension String {
    /// Returns `nil` when empty (avoids writing blank strings to EventKit).
    var nilIfEmpty: String? { isEmpty ? nil : self }
}
