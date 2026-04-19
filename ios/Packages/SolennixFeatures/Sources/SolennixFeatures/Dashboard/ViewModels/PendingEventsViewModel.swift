import Foundation
import SolennixCore
import SolennixNetwork

// MARK: - Pending Event with Reason

public enum PendingEventReason: String, Sendable {
    case paymentDue        // confirmed in next 7 days, balance > 0
    case overdueEvent      // past date still quoted/confirmed
    case quoteUrgent       // quoted in next 14 days
}

public struct PendingEventWithReason: Identifiable {
    public let id: String
    public let event: Event
    public let reason: PendingEventReason
    public let reasonLabel: String
    public let pendingAmount: Double

    public var hasPendingPayment: Bool { pendingAmount > 0.01 }

    public init(event: Event, reason: PendingEventReason, reasonLabel: String, pendingAmount: Double) {
        self.id = event.id
        self.event = event
        self.reason = reason
        self.reasonLabel = reasonLabel
        self.pendingAmount = pendingAmount
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

    // Payment sheet state
    public var paymentSheetEvent: PendingEventWithReason? = nil
    public var paymentAmount: String = ""
    public var paymentMethod: String = "cash"
    public var paymentNotes: String = ""
    public var isSavingPayment: Bool = false
    public var transientMessage: String? = nil

    public init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    @MainActor
    public func loadPendingEvents() async {
        isLoading = true
        do {
            let allEvents: [Event] = try await apiClient.getAll(Endpoint.events)
            let allPayments: [Payment] = try await apiClient.getAll(Endpoint.payments)

            let calendar = Calendar.current
            let startOfToday = calendar.startOfDay(for: Date())
            let sevenDaysFromNow = calendar.date(byAdding: .day, value: 7, to: startOfToday)!
            let fourteenDaysFromNow = calendar.date(byAdding: .day, value: 14, to: startOfToday)!

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
                let pendingAmount = max(event.totalAmount - totalPaid, 0)
                let hasPending = pendingAmount > 0.01

                // 1) Confirmed in next 7 days with pending balance.
                if event.status == .confirmed
                    && eventDate >= startOfToday && eventDate <= sevenDaysFromNow
                    && hasPending
                {
                    pending.append(
                        PendingEventWithReason(
                            event: event,
                            reason: .paymentDue,
                            reasonLabel: "Cobro por cerrar",
                            pendingAmount: pendingAmount
                        )
                    )
                }
                // 2) Past date still quoted/confirmed.
                else if eventDate < startOfToday
                    && (event.status == .quoted || event.status == .confirmed)
                {
                    pending.append(
                        PendingEventWithReason(
                            event: event,
                            reason: .overdueEvent,
                            reasonLabel: "Evento vencido",
                            pendingAmount: pendingAmount
                        )
                    )
                }
                // 3) Quoted within 14 days (urgent quote, not yet confirmed).
                else if event.status == .quoted
                    && eventDate >= startOfToday && eventDate <= fourteenDaysFromNow
                {
                    pending.append(
                        PendingEventWithReason(
                            event: event,
                            reason: .quoteUrgent,
                            reasonLabel: "Cotización urgente",
                            pendingAmount: pendingAmount
                        )
                    )
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
            transientMessage = newStatus == .completed
                ? "Evento marcado como completado"
                : "Evento cancelado"
        } catch {
            transientMessage = "Error al actualizar el estado"
            print("Error updating event status: \(error)")
        }
        updatingEventId = nil
    }

    // MARK: - Payment flow

    @MainActor
    public func openPaymentSheet(for pendingEvent: PendingEventWithReason) {
        paymentSheetEvent = pendingEvent
        paymentAmount = pendingEvent.pendingAmount > 0
            ? String(format: "%.2f", pendingEvent.pendingAmount)
            : ""
        paymentMethod = "cash"
        paymentNotes = ""
    }

    @MainActor
    public func dismissPaymentSheet() {
        paymentSheetEvent = nil
        paymentAmount = ""
        paymentNotes = ""
        paymentMethod = "cash"
    }

    @MainActor
    public func consumeTransientMessage() {
        transientMessage = nil
    }

    @MainActor
    public func registerPayment() async {
        guard let pendingEvent = paymentSheetEvent else { return }
        guard let amount = Double(paymentAmount.replacingOccurrences(of: ",", with: ".")), amount > 0 else {
            transientMessage = "Monto inválido"
            return
        }

        // Auto-complete only when the entered amount actually settles the
        // pending balance (within an epsilon). Without this guard a partial
        // payment of an "overdue with balance" event would mark it as
        // completed while still leaving an outstanding balance.
        let paymentCompletionEpsilon = 0.01
        let shouldAutoComplete =
            pendingEvent.reason == .overdueEvent
            && pendingEvent.hasPendingPayment
            && amount >= (pendingEvent.pendingAmount - paymentCompletionEpsilon)

        isSavingPayment = true
        updatingEventId = pendingEvent.event.id

        do {
            let dateFormatter = DateFormatter()
            dateFormatter.dateFormat = "yyyy-MM-dd"
            let today = dateFormatter.string(from: Date())

            let body: [String: Any] = [
                "event_id": pendingEvent.event.id,
                "amount": amount,
                "payment_date": today,
                "payment_method": paymentMethod,
                "notes": paymentNotes
            ]

            let payment: Payment = try await apiClient.post(Endpoint.payments, body: AnyCodable(body))

            HapticsHelper.play(.success)
            // `client_name` is required by NotificationManager (the receipt
            // observer early-returns without it). We don't have client data
            // on the dashboard VM, so fall back to "Cliente" — same default
            // EventDetailViewModel.addPayment uses when client is nil.
            NotificationCenter.default.post(
                name: .solennixPaymentRegistered,
                object: nil,
                userInfo: [
                    "payment_id": payment.id,
                    "event_id": pendingEvent.event.id,
                    "client_name": "Cliente",
                    "amount": payment.amount
                ]
            )

            if shouldAutoComplete {
                do {
                    let statusBody = ["status": EventStatus.completed.rawValue]
                    let _: Event = try await apiClient.put(Endpoint.event(pendingEvent.event.id), body: statusBody)
                    pendingEvents.removeAll { $0.event.id == pendingEvent.event.id }
                    transientMessage = "Pago registrado y evento completado"
                } catch {
                    transientMessage = "Pago registrado. Marcá el evento como completado manualmente."
                }
            } else {
                transientMessage = "Pago registrado correctamente"
                // Reload to reflect the new balance: the affected pending
                // event may now be fully paid (and should drop off the list)
                // or simply show a smaller pendingAmount on the next open.
                await loadPendingEvents()
            }

            if pendingEvents.isEmpty {
                isPresented = false
            }
            dismissPaymentSheet()
        } catch {
            HapticsHelper.play(.error)
            transientMessage = "Error al registrar el pago"
        }

        isSavingPayment = false
        updatingEventId = nil
    }
}
