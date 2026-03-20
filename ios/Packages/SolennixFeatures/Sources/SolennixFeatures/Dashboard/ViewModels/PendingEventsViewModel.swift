import Foundation
import SolennixCore
import SolennixNetwork

@Observable
public final class PendingEventsViewModel {
    let apiClient: APIClient

    public var pendingEvents: [Event] = []
    public var isLoading: Bool = true
    public var isPresented: Bool = false
    public var updatingEventId: String? = nil

    public init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    @MainActor
    public func loadPendingEvents() async {
        isLoading = true
        do {
            let allEvents: [Event] = try await apiClient.get(Endpoint.events)

            let calendar = Calendar.current
            let startOfToday = calendar.startOfDay(for: Date())

            let pastConfirmed = allEvents.filter { event in
                if event.status != .confirmed { return false }
                let formatter = DateFormatter()
                formatter.dateFormat = "yyyy-MM-dd"
                guard let eventDate = formatter.date(from: String(event.eventDate.prefix(10))) else { return false }

                return eventDate < startOfToday
            }

            self.pendingEvents = pastConfirmed
            if !self.pendingEvents.isEmpty {
                self.isPresented = true
            }
        } catch {
            print("Error loading pending events: \(error)")
        }
        isLoading = false
    }

    @MainActor
    public func updateEventStatus(eventId: String, newStatus: EventStatus) async {
        updatingEventId = eventId
        do {
            let body = ["status": newStatus.rawValue]
            let _: Event = try await apiClient.put(Endpoint.event(eventId), body: body)

            pendingEvents.removeAll { $0.id == eventId }
            if pendingEvents.isEmpty {
                isPresented = false
            }
        } catch {
            print("Error updating event status: \(error)")
        }
        updatingEventId = nil
    }
}
