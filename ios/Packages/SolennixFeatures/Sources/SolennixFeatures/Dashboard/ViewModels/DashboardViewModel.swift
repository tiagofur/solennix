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
    public var updatingEventId: String?

    /// Map of client ID -> Client for joining event data with client names.
    public var clientMap: [String: Client] = [:]

    // MARK: - Dependencies

    private let apiClient: APIClient
    private var allEvents: [Event] = []
    private var allPayments: [Payment] = []

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

        var encounteredError = false

        func loadOrEmpty<T: Decodable>(
            _ endpoint: String,
            params: [String: String]? = nil,
            label: String
        ) async -> [T] {
            let paramsDesc = params?.map { "\($0.key)=\($0.value)" }.joined(separator: "&") ?? "none"
            NSLog("[Dashboard] 🔄 Loading %@ -> %@ params: %@", label, endpoint, paramsDesc)
            do {
                let result: [T] = try await apiClient.getAll(endpoint, params: params)
                NSLog("[Dashboard] ✅ %@ loaded %d items", label, result.count)
                return result
            } catch {
                NSLog("[Dashboard] ❌ %@ FAILED: %@", label, String(describing: error))
                encounteredError = true
                return []
            }
        }

        // Fetch sequentially instead of in parallel.
        // Some nginx HTTP/2 deployments choke on many concurrent streams over a
        // single connection (the dashboard previously fired 8 GETs in parallel
        // and they all hung waiting for response frames). Sequential issues one
        // request at a time over the multiplexed connection, sidestepping the bug.
        // TODO: collapse most of these into the server-side aggregated endpoints
        // /api/v1/dashboard/kpis and friends (already implemented in backend).
        let clients: [Client] = await loadOrEmpty(
            Endpoint.clients,
            label: "clients"
        )
        let monthEvents: [Event] = await loadOrEmpty(
            Endpoint.events,
            params: ["start": startStr, "end": endStr],
            label: "month events"
        )
        let upcoming: [Event] = await loadOrEmpty(
            Endpoint.upcomingEvents,
            params: ["limit": "5"],
            label: "upcoming events"
        )
        let loadedAllEvents: [Event] = await loadOrEmpty(
            Endpoint.events,
            label: "all events"
        )
        let inventory: [InventoryItem] = await loadOrEmpty(
            Endpoint.inventory,
            label: "inventory"
        )
        let products: [Product] = await loadOrEmpty(
            Endpoint.products,
            label: "products"
        )
        let monthPayments: [Payment] = await loadOrEmpty(
            Endpoint.payments,
            params: ["start": startStr, "end": endStr],
            label: "month payments"
        )
        let loadedAllPayments: [Payment] = await loadOrEmpty(
            Endpoint.payments,
            label: "all payments"
        )

        // Build client map
        clientMap = Dictionary(uniqueKeysWithValues: clients.map { ($0.id, $0) })

        // Events this month
        eventsThisMonth = monthEvents
        allEvents = loadedAllEvents
        allPayments = loadedAllPayments

        // Upcoming events
        upcomingEvents = upcoming

        // Low stock items = inventory where current_stock < minimum_stock AND minimum_stock > 0
        lowStockItems = inventory.filter { $0.minimumStock > 0 && $0.currentStock < $0.minimumStock }
        lowStockCount = lowStockItems.count

        // Counts for onboarding checklist
        totalProducts = products.count
        totalEvents = loadedAllEvents.count

        // Attention events for dashboard alerts/cards.
        attentionEvents = Self.makeAttentionEvents(
            events: loadedAllEvents,
            payments: loadedAllPayments,
            clientMap: clientMap,
            now: now
        )

        // Cash collected = sum of payment amounts in current month
        cashCollectedThisMonth = monthPayments.reduce(0) { $0 + $1.amount }
        recalculateMonthlyMetrics()

        NSLog("[Dashboard] 📊 Summary: clients=%d, monthEvents=%d, upcoming=%d, allEvents=%d, inventory=%d, products=%d, monthPayments=%d, allPayments=%d, encounteredError=%@",
              clients.count, monthEvents.count, upcoming.count, loadedAllEvents.count,
              inventory.count, products.count, monthPayments.count, loadedAllPayments.count,
              encounteredError ? "YES" : "NO")

        if encounteredError {
            if clients.isEmpty && loadedAllEvents.isEmpty && products.isEmpty {
                errorMessage = "No se pudo cargar el dashboard"
            } else {
                errorMessage = "Algunos datos no se pudieron cargar"
            }
        }

        isLoading = false
    }

    @MainActor
    public func refresh() async {
        await loadDashboard()
    }

    @MainActor
    public func updateEventStatus(eventId: String, newStatus: EventStatus) async {
        guard updatingEventId == nil else { return }

        updatingEventId = eventId
        defer { updatingEventId = nil }

        do {
            let body = ["status": newStatus.rawValue]
            let updatedEvent: Event = try await apiClient.put(Endpoint.event(eventId), body: body)

            applyUpdatedEvent(updatedEvent)
            HapticsHelper.play(.success)
        } catch {
            HapticsHelper.play(.error)

            if let apiError = error as? APIError {
                errorMessage = apiError.errorDescription ?? "Error al cambiar el estado"
            } else {
                errorMessage = "Error al cambiar el estado"
            }
        }
    }

    private func applyUpdatedEvent(_ updatedEvent: Event, now: Date = Date()) {
        allEvents = replacing(event: updatedEvent, in: allEvents, allowInsert: true)
        eventsThisMonth = replacing(event: updatedEvent, in: eventsThisMonth)

        if shouldDisplayInUpcoming(updatedEvent, now: now) {
            upcomingEvents = replacing(event: updatedEvent, in: upcomingEvents)
                .sorted(by: Self.compareDashboardEvents)
            if upcomingEvents.count > 5 {
                upcomingEvents = Array(upcomingEvents.prefix(5))
            }
        } else {
            upcomingEvents.removeAll { $0.id == updatedEvent.id }
        }

        attentionEvents = Self.makeAttentionEvents(
            events: allEvents,
            payments: allPayments,
            clientMap: clientMap,
            now: now
        )
        recalculateMonthlyMetrics()
    }

    private func recalculateMonthlyMetrics() {
        let realizedEvents = eventsThisMonth
            .filter { $0.status == .confirmed || $0.status == .completed }

        netSalesThisMonth = realizedEvents.reduce(0) { $0 + $1.totalAmount }

        let totalEventAmount = realizedEvents.reduce(0) { $0 + $1.totalAmount }
        let totalTaxAmount = realizedEvents.reduce(0) { $0 + $1.taxAmount }

        if totalEventAmount > 0 {
            let paymentRatio = cashCollectedThisMonth / totalEventAmount
            vatCollectedThisMonth = totalTaxAmount * paymentRatio
            vatOutstandingThisMonth = totalTaxAmount - vatCollectedThisMonth
        } else {
            vatCollectedThisMonth = 0
            vatOutstandingThisMonth = 0
        }
    }

    private func shouldDisplayInUpcoming(_ event: Event, now: Date) -> Bool {
        guard event.status == .confirmed,
              let eventDate = Self.dashboardDateFormatter.date(from: String(event.eventDate.prefix(10)))
        else {
            return false
        }

        return eventDate >= Calendar.current.startOfDay(for: now)
    }

    private func replacing(event updatedEvent: Event, in events: [Event], allowInsert: Bool = false) -> [Event] {
        guard let index = events.firstIndex(where: { $0.id == updatedEvent.id }) else {
            if allowInsert {
                return events + [updatedEvent]
            }
            return events
        }

        var events = events
        events[index] = updatedEvent
        return events
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

    private static func compareDashboardEvents(lhs: Event, rhs: Event) -> Bool {
        let lhsDate = dashboardDateFormatter.date(from: String(lhs.eventDate.prefix(10))) ?? .distantFuture
        let rhsDate = dashboardDateFormatter.date(from: String(rhs.eventDate.prefix(10))) ?? .distantFuture

        if lhsDate != rhsDate {
            return lhsDate < rhsDate
        }

        return lhs.id < rhs.id
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
