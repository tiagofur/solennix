import Foundation
import SolennixCore
import SolennixNetwork

// MARK: - Pending Event with Reason

public struct PendingEventWithReason: Identifiable {
    public let id: String
    public let event: Event
    public let reason: String

    public init(event: Event, reason: String) {
        self.id = event.id
        self.event = event
        self.reason = reason
    }
}

// MARK: - Pending Events View Model

@Observable
public final class PendingEventsViewModel {
    let apiClient: APIClient

    public var pendingEvents: [PendingEventWithReason] = []
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
            async let eventsResult: [Event] = apiClient.getAll(Endpoint.events)
            async let paymentsResult: [Payment] = apiClient.getAll(Endpoint.payments)

            let allEvents = try await eventsResult
            let allPayments = try await paymentsResult

            let calendar = Calendar.current
            let startOfToday = calendar.startOfDay(for: Date())
            let sevenDaysFromNow = calendar.date(byAdding: .day, value: 7, to: startOfToday)!

            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM-dd"

            var pending: [PendingEventWithReason] = []

            for event in allEvents {
                guard let eventDate = formatter.date(from: String(event.eventDate.prefix(10))) else {
                    continue
                }

                let totalPaid = allPayments
                    .filter { $0.eventId == event.id }
                    .reduce(0) { $0 + $1.amount }
                let isFullyPaid = totalPaid >= event.totalAmount

                // Upcoming within 7 days but not fully paid
                if eventDate >= startOfToday && eventDate <= sevenDaysFromNow
                    && !isFullyPaid
                    && event.status != .completed && event.status != .cancelled
                {
                    pending.append(PendingEventWithReason(event: event, reason: "Pago pendiente"))
                }
                // Past date but still quoted or confirmed
                else if eventDate < startOfToday
                    && (event.status == .quoted || event.status == .confirmed)
                {
                    pending.append(PendingEventWithReason(event: event, reason: "Evento vencido"))
                }
            }

            self.pendingEvents = pending
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

            pendingEvents.removeAll { $0.event.id == eventId }
            if pendingEvents.isEmpty {
                isPresented = false
            }
        } catch {
            print("Error updating event status: \(error)")
        }
        updatingEventId = nil
    }
}
