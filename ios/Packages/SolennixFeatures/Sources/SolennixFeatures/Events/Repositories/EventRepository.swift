import Foundation
import SolennixCore
import SolennixNetwork

// MARK: - EventRepository

/// The single event-mutation surface (ADR-2). Today there are 3 event-mutation
/// call-sites across 2 VM classes (`EventFormViewModel.save`,
/// `EventListViewModel.confirmDeleteEvent`, `EventListViewModel.updateEventStatus`).
/// Routing them through one repository means every create / edit / status-change /
/// delete mirrors to the system calendar consistently, regardless of UI path, with
/// exactly one test seam.
///
/// Each mutation hits `EventAPI` (the narrow seam over the concrete `APIClient`
/// actor — ADR-9) FIRST, then fans out to `SystemCalendarSyncing` (write-only
/// EventKit mirror — ADR-1) guarded by `syncEnabled`, rewriting the device-local
/// identity store (ADR-5). Sync is **implicit** on every CRUD: there is no explicit
/// "sync now" action.
///
/// > Note: `list()` and `changeDestination(to:progress:)` + `syncAuthorization` are
/// > added in subsequent Phase 2 tasks (2.3 / 2.4); `list()` itself is a Phase 3
/// > concern (the mutation surface is what the spec scenarios cover here).
public protocol EventRepository: AnyObject, Sendable {
    /// Creates an event (POST /events) + its items (PUT /events/{id}/items), then
    /// mirrors to the system calendar. Returns the API-persisted `Event`.
    func create(eventBody: AnyCodable, itemsBody: AnyCodable) async throws -> Event

    /// Updates an event (PUT /events/{id}); optionally re-PUTs its items. Mirrors.
    func update(_ id: String, body: AnyCodable, itemsBody: AnyCodable?) async throws -> Event

    /// Changes an event's status (PUT /events/{id} with `{"status": ...}`). Mirrors.
    func changeStatus(_ id: String, to: EventStatus) async throws -> Event

    /// Deletes an event (DELETE /events/{id}); best-effort removes its system mirror.
    func delete(_ id: String) async throws
}

// MARK: - DefaultEventRepository

/// Concrete `EventRepository`. Holds the three dependencies it fans mutations across
/// plus two `@Sendable` closures that read the live sync state (`@AppStorage`-backed
/// in the app): whether sync is ON and the current destination.
///
/// All stored properties are `Sendable` (existentials of `Sendable` protocols +
/// `@Sendable` closures) and the type is a `final class` of `let` properties, so it
/// is `Sendable` — safe to share across the actor boundaries the ViewModels use.
public final class DefaultEventRepository: EventRepository {

    private let eventAPI: any EventAPI
    private let syncService: any SystemCalendarSyncing
    private let identityStore: CalendarSyncIdentityStore
    private let syncEnabled: @Sendable () -> Bool
    private let destination: @Sendable () -> SyncDestination

    public init(
        eventAPI: any EventAPI,
        syncService: any SystemCalendarSyncing,
        identityStore: CalendarSyncIdentityStore,
        syncEnabled: @escaping @Sendable () -> Bool = { false },
        destination: @escaping @Sendable () -> SyncDestination = { .solennix }
    ) {
        self.eventAPI = eventAPI
        self.syncService = syncService
        self.identityStore = identityStore
        self.syncEnabled = syncEnabled
        self.destination = destination
    }

    // MARK: - CRUD

    public func create(eventBody: AnyCodable, itemsBody: AnyCodable) async throws -> Event {
        // API first — mirrors the existing EventFormViewModel+Save two-call sequence
        // (POST /events, then PUT /events/{id}/items) verbatim. No new EventDraft type.
        let event: Event = try await eventAPI.post(Endpoint.events, body: eventBody)
        let _: EmptyResponse = try await eventAPI.put(Endpoint.eventItems(event.id), body: itemsBody)
        await mirror(event)
        return event
    }

    public func update(_ id: String, body: AnyCodable, itemsBody: AnyCodable?) async throws -> Event {
        let event: Event = try await eventAPI.put(Endpoint.event(id), body: body)
        if let itemsBody {
            let _: EmptyResponse = try await eventAPI.put(Endpoint.eventItems(id), body: itemsBody)
        }
        await mirror(event)
        return event
    }

    public func changeStatus(_ id: String, to status: EventStatus) async throws -> Event {
        let event: Event = try await eventAPI.put(
            Endpoint.event(id),
            body: AnyCodable(["status": status.rawValue] as [String: Any?])
        )
        await mirror(event)
        return event
    }

    public func delete(_ id: String) async throws {
        try await eventAPI.delete(Endpoint.event(id))
        if syncEnabled() {
            await removeFromSystem(id)
        }
        // A deleted Solennix event must not retain a (now-meaningless) system mapping,
        // regardless of whether the mirror removal ran.
        await identityStore.clear(for: id)
    }

    // MARK: - Sync fan-out

    /// Mirrors `event` to the system calendar (write-only). Idempotent: an event with
    /// a stored identity is UPDATED (never re-created); one without is CREATED. The
    /// identity store is then rewritten with the resolved identifier, so a repeat
    /// mutation never produces a duplicate system item (ADR-2 / ADR-5).
    ///
    /// Sync errors are swallowed here (graceful degradation): the API mutation has
    /// already succeeded, so a mirror failure MUST NOT fail the CRUD. (Phase 2.4
    /// surfaces the specific `.personalCalendarUnavailable` config error so the UI can
    /// prompt the user to re-choose a destination.)
    private func mirror(_ event: Event) async {
        guard syncEnabled() else { return }
        do {
            let dest = try await resolveDestination(destination())
            let identifier: String
            if let existing = await identityStore.get(for: event.id) {
                try await syncService.update(event, identifier: existing.calendarItemIdentifier, in: dest)
                identifier = existing.calendarItemIdentifier
            } else {
                let created = try await syncService.create(event, in: dest)
                identifier = created.calendarItemIdentifier
            }
            await identityStore.set(
                eventID: event.id,
                calendarItemIdentifier: identifier,
                destination: destination()
            )
        } catch {
            // Write-only sync: never fail the API mutation because the mirror failed.
        }
    }

    /// Best-effort removal of `id`'s system mirror. Resolves the destination the item
    /// was written to (preferring its stored destination) and deletes it.
    private func removeFromSystem(_ id: String) async {
        guard let item = await identityStore.get(for: id) else { return }
        let kind = (await identityStore.destination(for: id)) ?? destination()
        do {
            let dest = try await resolveDestination(kind)
            try await syncService.delete(identifier: item.calendarItemIdentifier, in: dest)
        } catch {
            // Best-effort system cleanup (write-only); the API delete already succeeded.
        }
    }

    /// Resolves a destination kind to its identifier handle. (Phase 2.4 hardens this
    /// with `.solennix` recreate-on-missing and `.personal` error-surfacing, ADR-3.)
    private func resolveDestination(_ kind: SyncDestination) async throws -> SyncedDestination {
        try await syncService.resolveDestination(kind)
    }
}
