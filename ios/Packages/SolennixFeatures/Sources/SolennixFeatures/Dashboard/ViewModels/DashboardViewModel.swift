import Foundation
import Observation
import SolennixCore
import SolennixNetwork

// MARK: - Dashboard Attention Events

public enum DashboardAttentionEventKind: String, Sendable, Hashable {
    case overdueEvent
    case pendingPayment
    case unconfirmedEvent

    public var title: String {
        switch self {
        case .pendingPayment:
            return "Pago pendiente"
        case .overdueEvent:
            return "Evento vencido"
        case .unconfirmedEvent:
            return "Sin confirmar"
        }
    }

    fileprivate var sortPriority: Int {
        switch self {
        case .overdueEvent:
            return 0
        case .pendingPayment:
            return 1
        case .unconfirmedEvent:
            return 2
        }
    }
}

public struct DashboardAttentionEvent: Identifiable, Sendable, Hashable {
    public let id: String
    public let event: Event
    public let kind: DashboardAttentionEventKind
    public let clientName: String
    public let totalPaid: Double
    public let outstandingAmount: Double
    public let daysFromToday: Int

    public init(
        event: Event,
        kind: DashboardAttentionEventKind,
        clientName: String,
        totalPaid: Double,
        outstandingAmount: Double,
        daysFromToday: Int
    ) {
        self.id = "\(kind.rawValue)-\(event.id)"
        self.event = event
        self.kind = kind
        self.clientName = clientName
        self.totalPaid = totalPaid
        self.outstandingAmount = outstandingAmount
        self.daysFromToday = daysFromToday
    }
}

// MARK: - Dashboard View Model

@Observable
public final class DashboardViewModel {

    // MARK: - Properties

    public var eventsThisMonth: [Event] = []
    public var upcomingEvents: [Event] = []
    public var lowStockItems: [InventoryItem] = []
    public var netSalesThisMonth: Double = 0
    public var cashCollectedThisMonth: Double = 0
    public var vatCollectedThisMonth: Double = 0
    public var vatOutstandingThisMonth: Double = 0
    public var lowStockCount: Int = 0
    public var totalProducts: Int = 0
    public var totalEvents: Int = 0
    public var isLoading: Bool = false
    public var errorMessage: String?
    public var attentionEvents: [DashboardAttentionEvent] = []

    /// Map of client ID -> Client for joining event data with client names.
    public var clientMap: [String: Client] = [:]

    // MARK: - Dependencies

    private let apiClient: APIClient

    // MARK: - Init

    public init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    // MARK: - Computed

    /// Group events by status and return counts.
    public var eventStatusCounts: [EventStatus: Int] {
        var counts: [EventStatus: Int] = [:]
        for event in eventsThisMonth {
            counts[event.status, default: 0] += 1
        }
        return counts
    }

    public var totalClients: Int {
        clientMap.count
    }

    public var pendingQuotes: Int {
        eventsThisMonth.filter { $0.status == .quoted }.count
    }

    /// Resolve a client name from the client map.
    public func clientName(for clientId: String) -> String {
        clientMap[clientId]?.name ?? "Cliente"
    }

    // MARK: - Data Loading

    @MainActor
    public func loadDashboard() async {
        isLoading = true
        errorMessage = nil

        do {
            // Build date range for current month
            let now = Date()
            let calendar = Calendar.current
            let components = calendar.dateComponents([.year, .month], from: now)
            guard let startOfMonth = calendar.date(from: components),
                  let endOfMonth = calendar.date(byAdding: DateComponents(month: 1, day: -1), to: startOfMonth)
            else {
                errorMessage = "Error calculando rango de fechas"
                isLoading = false
                return
            }

            let dateFormatter = DateFormatter()
            dateFormatter.dateFormat = "yyyy-MM-dd"
            let startStr = dateFormatter.string(from: startOfMonth)
            let endStr = dateFormatter.string(from: endOfMonth)

            // Fetch all data concurrently
            async let clientsResult: [Client] = apiClient.get(Endpoint.clients)
            async let monthEventsResult: [Event] = apiClient.get(
                Endpoint.events,
                params: ["start_date": startStr, "end_date": endStr]
            )
            async let upcomingResult: [Event] = apiClient.get(
                Endpoint.upcomingEvents,
                params: ["limit": "5"]
            )
            async let allEventsResult: [Event] = apiClient.get(Endpoint.events)
            async let inventoryResult: [InventoryItem] = apiClient.get(Endpoint.inventory)
            async let productsResult: [Product] = apiClient.get(Endpoint.products)
            async let monthPaymentsResult: [Payment] = apiClient.get(
                Endpoint.payments,
                params: ["start_date": startStr, "end_date": endStr]
            )
            async let allPaymentsResult: [Payment] = apiClient.get(Endpoint.payments)

            let clients = try await clientsResult
            let monthEvents = try await monthEventsResult
            let upcoming = try await upcomingResult
            let allEvents = try await allEventsResult
            let inventory = try await inventoryResult
            let products = try await productsResult
            let monthPayments = try await monthPaymentsResult
            let allPayments = try await allPaymentsResult

            // Build client map
            clientMap = Dictionary(uniqueKeysWithValues: clients.map { ($0.id, $0) })

            // Events this month
            eventsThisMonth = monthEvents

            // Upcoming events
            upcomingEvents = upcoming

            // Net sales = sum of total_amount for confirmed/completed events
            netSalesThisMonth = monthEvents
                .filter { $0.status == .confirmed || $0.status == .completed }
                .reduce(0) { $0 + $1.totalAmount }

            // Low stock items = inventory where current_stock < minimum_stock AND minimum_stock > 0
            lowStockItems = inventory.filter { $0.minimumStock > 0 && $0.currentStock < $0.minimumStock }
            lowStockCount = lowStockItems.count

            // Counts for onboarding checklist
            totalProducts = products.count
            totalEvents = allEvents.count

            // Attention events for dashboard alerts/cards.
            attentionEvents = Self.makeAttentionEvents(
                events: allEvents,
                payments: allPayments,
                clientMap: clientMap,
                now: now
            )

            // Cash collected = sum of payment amounts in current month
            cashCollectedThisMonth = monthPayments.reduce(0) { $0 + $1.amount }

            // VAT calculation based on payment ratio
            let totalEventAmount = monthEvents
                .filter { $0.status == .confirmed || $0.status == .completed }
                .reduce(0) { $0 + $1.totalAmount }
            let totalTaxAmount = monthEvents
                .filter { $0.status == .confirmed || $0.status == .completed }
                .reduce(0) { $0 + $1.taxAmount }

            if totalEventAmount > 0 {
                let paymentRatio = cashCollectedThisMonth / totalEventAmount
                vatCollectedThisMonth = totalTaxAmount * paymentRatio
                vatOutstandingThisMonth = totalTaxAmount - vatCollectedThisMonth
            } else {
                vatCollectedThisMonth = 0
                vatOutstandingThisMonth = 0
            }

        } catch {
            if let apiError = error as? APIError {
                errorMessage = apiError.errorDescription ?? "Error cargando el dashboard"
            } else {
                errorMessage = "Error cargando el dashboard"
            }
        }

        isLoading = false
    }

    @MainActor
    public func refresh() async {
        await loadDashboard()
    }

    private static func makeAttentionEvents(
        events: [Event],
        payments: [Payment],
        clientMap: [String: Client],
        now: Date,
        calendar: Calendar = .current
    ) -> [DashboardAttentionEvent] {
        let startOfToday = calendar.startOfDay(for: now)
        guard let next7Days = calendar.date(byAdding: .day, value: 7, to: startOfToday),
              let next14Days = calendar.date(byAdding: .day, value: 14, to: startOfToday)
        else {
            return []
        }

        let paymentsByEventId = Dictionary(grouping: payments, by: \.eventId)

        return events.compactMap { event in
            guard let eventDate = Self.dashboardDateFormatter.date(from: String(event.eventDate.prefix(10))) else {
                return nil
            }

            let normalizedEventDate = calendar.startOfDay(for: eventDate)
            let daysFromToday = calendar.dateComponents([.day], from: startOfToday, to: normalizedEventDate).day ?? 0
            let totalPaid = paymentsByEventId[event.id, default: []].reduce(0) { $0 + $1.amount }
            let outstandingAmount = max(event.totalAmount - totalPaid, 0)

            let kind: DashboardAttentionEventKind?

            if normalizedEventDate < startOfToday,
               (event.status == .quoted || event.status == .confirmed) {
                kind = .overdueEvent
            } else if event.status == .confirmed,
                      normalizedEventDate >= startOfToday,
                      normalizedEventDate <= next7Days,
                      outstandingAmount > 0.01 {
                kind = .pendingPayment
            } else if event.status == .quoted,
                      normalizedEventDate >= startOfToday,
                      normalizedEventDate <= next14Days {
                kind = .unconfirmedEvent
            } else {
                kind = nil
            }

            guard let kind else {
                return nil
            }

            return DashboardAttentionEvent(
                event: event,
                kind: kind,
                clientName: clientMap[event.clientId]?.name ?? "Cliente",
                totalPaid: totalPaid,
                outstandingAmount: outstandingAmount,
                daysFromToday: daysFromToday
            )
        }
        .sorted(by: Self.compareAttentionEvents)
    }

    private static func compareAttentionEvents(
        lhs: DashboardAttentionEvent,
        rhs: DashboardAttentionEvent
    ) -> Bool {
        if lhs.kind.sortPriority != rhs.kind.sortPriority {
            return lhs.kind.sortPriority < rhs.kind.sortPriority
        }

        if lhs.daysFromToday != rhs.daysFromToday {
            return lhs.daysFromToday < rhs.daysFromToday
        }

        let lhsDate = dashboardDateFormatter.date(from: String(lhs.event.eventDate.prefix(10))) ?? .distantFuture
        let rhsDate = dashboardDateFormatter.date(from: String(rhs.event.eventDate.prefix(10))) ?? .distantFuture

        if lhsDate != rhsDate {
            return lhsDate < rhsDate
        }

        let clientComparison = lhs.clientName.localizedCaseInsensitiveCompare(rhs.clientName)
        if clientComparison != .orderedSame {
            return clientComparison == .orderedAscending
        }

        let serviceComparison = lhs.event.serviceType.localizedCaseInsensitiveCompare(rhs.event.serviceType)
        if serviceComparison != .orderedSame {
            return serviceComparison == .orderedAscending
        }

        return lhs.event.id < rhs.event.id
    }

    private static let dashboardDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()
}

// MARK: - Currency Formatting

public extension Double {
    /// Format as Mexican Peso currency string.
    var asMXN: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "MXN"
        formatter.currencySymbol = "$"
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: self)) ?? "$0"
    }
}
