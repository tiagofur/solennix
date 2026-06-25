import Foundation
@testable import SolennixFeatures

/// In-memory implementation of `CalendarSyncIdentityStore` for tests and SwiftUI
/// previews (ADR-5 test double). Backed by a plain dictionary; no persistence.
public actor InMemoryCalendarSyncIdentityStore: CalendarSyncIdentityStore {

    private struct Entry {
        let calendarItemIdentifier: String
        let destination: SyncDestination
    }

    private var entries: [String: Entry] = [:]

    public init() {}

    public func set(eventID: String, calendarItemIdentifier: String, destination: SyncDestination) async {
        entries[eventID] = Entry(calendarItemIdentifier: calendarItemIdentifier, destination: destination)
    }

    public func get(for eventID: String) async -> SyncedItem? {
        guard let entry = entries[eventID] else { return nil }
        return SyncedItem(eventID: eventID, calendarItemIdentifier: entry.calendarItemIdentifier)
    }

    public func destination(for eventID: String) async -> SyncDestination? {
        entries[eventID]?.destination
    }

    public func all() async -> [SyncedItem] {
        entries.map { SyncedItem(eventID: $0.key, calendarItemIdentifier: $0.value.calendarItemIdentifier) }
    }

    public func clear(for eventID: String) async {
        entries.removeValue(forKey: eventID)
    }

    public func clearAll() async {
        entries.removeAll()
    }
}
