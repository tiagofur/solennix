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

// MARK: - Monthly Revenue Trend Point

public struct MonthlyRevenueTrendPoint: Identifiable {
    public let id = UUID()
    public let month: String
    public let monthDate: Date
    public let revenue: Double
    public let eventCount: Int
}

// MARK: - Dashboard View Model

@Observable
public final class DashboardViewModel {

    // MARK: - Properties

    public var eventsThisMonth: [Event] = []
    public var upcomingEvents: [Event] = []
    public var lowStockItems: [InventoryItem] = []
    public var lowStockCount: Int = 0
    public var totalProducts: Int = 0
    public var totalEvents: Int = 0
    public var isLoading: Bool = false
    public var errorMessage: String?
    public var attentionEvents: [DashboardAttentionEvent] = []
    public var updatingEventId: String?

    /// Last 6 months of revenue, fetched from
    /// `GET /api/dashboard/revenue-chart?period=year` (backend returns only
    /// months with data; we slice the tail and pad missing months with zero
    /// revenue so the chart always shows 6 bars).
    public var monthlyRevenueTrend: [MonthlyRevenueTrendPoint] = []

    /// Status → count for the current month's events, fetched from
    /// `GET /api/dashboard/events-by-status?scope=month`. Backend is the
    /// source of truth — the dashboard no longer derives this from the
    /// local event list so iOS / Android / Web always show identical numbers.
    public var eventStatusCounts: [EventStatus: Int] = [:]

    /// Server-aggregated counts. Populated by the first /dashboard/kpis call
    /// so header cards paint in <200ms while the list endpoints continue
    /// loading. Views that render totals (events/clients/low stock) should
    /// prefer `kpis?.*` over computing from the full lists when available.
    public var kpis: DashboardKPIs?

    /// Top clients by total spent, fetched from `GET /api/dashboard/top-clients`.
    public var topClients: [TopClient] = []

    /// Products by demand (times used), fetched from `GET /api/dashboard/product-demand`.
    public var productDemand: [ProductDemandItem] = []

    /// Revenue forecast by month, fetched from `GET /api/dashboard/forecast`.
    public var forecast: [ForecastDataPoint] = []

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

    /// Backend is the single source of truth for these counts — fall back to
    /// 0 only while the preload is in flight. Once `kpis` is populated by
    /// `/api/dashboard/kpis`, every header card reads from it.
    public var totalClients: Int { kpis?.totalClients ?? 0 }
    public var pendingQuotes: Int { kpis?.pendingQuotes ?? 0 }
    public var eventsThisMonthCount: Int { kpis?.eventsThisMonth ?? 0 }

    /// Monetary KPIs — all computed server-side and fetched as a block from
    /// `/api/dashboard/kpis`. No client-side aggregation.
    public var netSalesThisMonth: Double { kpis?.netSalesThisMonth ?? 0 }
    public var cashCollectedThisMonth: Double { kpis?.cashCollectedThisMonth ?? 0 }
    public var vatCollectedThisMonth: Double { kpis?.vatCollectedThisMonth ?? 0 }
    public var vatOutstandingThisMonth: Double { kpis?.vatOutstandingThisMonth ?? 0 }

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

        // Paint header counts IMMEDIATELY from the server-aggregated endpoint.
        // A single /dashboard/kpis call returns revenue, event/client/inventory
        // counts in <200ms. The 8 list calls below still populate the body
        // (events, payments, inventory details) but the user no longer stares
        // at an empty dashboard for ~1.6s while those fire sequentially.
        do {
            let aggregated: DashboardKPIs = try await apiClient.get(Endpoint.dashboardKpis)
            kpis = aggregated
            // Mirror low stock count for views that read `lowStockCount`
            // directly. The list (`lowStockItems`) still comes from the
            // inventory loader below. Other counts (totalEvents, totalProducts)
            // are derived from the full lists and are not a clean 1:1 with
            // kpis fields, so we leave those to the sequential loaders.
            lowStockCount = aggregated.lowStockItems
        } catch {
            NSLog("[Dashboard] ⚠️ kpis preload failed: %@", String(describing: error))
            // Non-fatal — the sequential loaders below will still populate
            // everything; we just lose the progressive-paint advantage.
        }

        func loadOrEmpty<T: Decodable>(
            _ endpoint: String,
            params: [String: String]? = nil,
            label: String
        ) async -> [T] {
            let paramsDesc = params?.map { "\($0.key)=\($0.value)" }.joined(separator: "&") ?? "none"
            // Log the ACTUAL resolved URL to diagnose 404s
            let resolvedURL = await apiClient.resolveURL(endpoint)?.absoluteString ?? "nil"
            NSLog("[Dashboard] 🔄 Loading %@ -> %@ params: %@ | FULL URL: %@", label, endpoint, paramsDesc, resolvedURL)
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
        // /api/dashboard/kpis and related endpoints (already implemented in backend).
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

        NSLog("[Dashboard] 📊 Summary: clients=%d, monthEvents=%d, upcoming=%d, allEvents=%d, inventory=%d, products=%d, allPayments=%d, encounteredError=%@",
              clients.count, monthEvents.count, upcoming.count, loadedAllEvents.count,
              inventory.count, products.count, loadedAllPayments.count,
              encounteredError ? "YES" : "NO")

        // Premium 6-month chart: backend-aggregated revenue by month. Loaded
        // regardless of plan — the View gates the card on `isPremium`, so a
        // non-premium user just pays for one extra GET and never sees it.
        await loadMonthlyRevenueTrend()

        // Month-scoped status distribution for the "Estado de Eventos" chart.
        // Kept in parallel with the same-named iOS/Android/Web card so all
        // three platforms show identical confirmed / completed / quoted counts.
        await loadEventStatusCounts()

        // Analytics widgets: top clients, product demand, forecast
        await loadTopClients()
        await loadProductDemand()
        await loadForecast()

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
            // Refresh server-aggregated KPIs + status distribution so the
            // monetary cards and the "Estado de Eventos" chart reflect the
            // new status without requiring a full pull-to-refresh.
            if let refreshed: DashboardKPIs = try? await apiClient.get(Endpoint.dashboardKpis) {
                kpis = refreshed
                lowStockCount = refreshed.lowStockItems
            }
            await loadEventStatusCounts()
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

    // MARK: - Premium: Monthly Revenue Trend

    /// Fetch the last 6 months of revenue from the backend and map to the
    /// chart-friendly `MonthlyRevenueTrendPoint` shape with a ZERO-PADDED
    /// trailing 6-month window. Backend only returns months with payments,
    /// so without padding the chart would collapse to 2-3 bars on new
    /// accounts and look broken. Parity with Android and Web, which apply
    /// the same padding client-side.
    @MainActor
    public func loadMonthlyRevenueTrend() async {
        let points: [DashboardRevenuePoint]
        do {
            points = try await apiClient.get(
                Endpoint.dashboardRevenueChart,
                params: ["period": "year"]
            )
        } catch {
            NSLog("[Dashboard] ⚠️ revenue-chart failed: %@", String(describing: error))
            return
        }

        monthlyRevenueTrend = Self.buildTrailingSixMonthTrend(from: points, now: Date())
    }

    /// Build 6 ordered trend points ending at the current month. Missing
    /// months get revenue=0, eventCount=0. Exposed as a static helper so
    /// tests can call it deterministically.
    static func buildTrailingSixMonthTrend(
        from serverPoints: [DashboardRevenuePoint],
        now: Date,
        calendar: Calendar = Calendar(identifier: .gregorian)
    ) -> [MonthlyRevenueTrendPoint] {
        let keyFormatter = DateFormatter()
        keyFormatter.calendar = Calendar(identifier: .gregorian)
        keyFormatter.locale = Locale(identifier: "en_US_POSIX")
        keyFormatter.timeZone = TimeZone(secondsFromGMT: 0)
        keyFormatter.dateFormat = "yyyy-MM"

        let labelFormatter = DateFormatter()
        labelFormatter.dateFormat = "MMM"
        labelFormatter.locale = Locale(identifier: "es_MX")

        let byMonth: [String: DashboardRevenuePoint] = Dictionary(
            uniqueKeysWithValues: serverPoints.map { ($0.month, $0) }
        )

        return (-5...0).compactMap { offset -> MonthlyRevenueTrendPoint? in
            guard let monthDate = calendar.date(byAdding: .month, value: offset, to: now),
                  let monthStart = calendar.date(
                    from: calendar.dateComponents([.year, .month], from: monthDate)
                  )
            else { return nil }
            let key = keyFormatter.string(from: monthStart)
            let point = byMonth[key]
            return MonthlyRevenueTrendPoint(
                month: labelFormatter.string(from: monthStart).capitalized,
                monthDate: monthStart,
                revenue: point?.revenue ?? 0,
                eventCount: point?.eventCount ?? 0
            )
        }
    }

    // MARK: - Events by Status

    /// Fetch the month-scoped status distribution from the backend and map
    /// it into `[EventStatus: Int]` for the chart. Status strings that
    /// don't match the iOS enum are dropped silently (defensive against
    /// future backend additions).
    @MainActor
    public func loadEventStatusCounts() async {
        let rows: [DashboardEventStatusCount]
        do {
            rows = try await apiClient.get(
                Endpoint.dashboardEventsByStatus,
                params: ["scope": "month"]
            )
        } catch {
            NSLog("[Dashboard] ⚠️ events-by-status failed: %@", String(describing: error))
            return
        }

        var map: [EventStatus: Int] = [:]
        for row in rows {
            if let status = EventStatus(rawValue: row.status) {
                map[status] = row.count
            }
        }
        eventStatusCounts = map
    }

    // MARK: - Analytics Widgets

    /// Fetch top clients by total spent
    @MainActor
    public func loadTopClients() async {
        do {
            topClients = try await apiClient.getTopClients(limit: 5)
        } catch {
            NSLog("[Dashboard] ⚠️ top-clients failed: %@", String(describing: error))
        }
    }

    /// Fetch products by demand (times used)
    @MainActor
    public func loadProductDemand() async {
        do {
            productDemand = try await apiClient.getProductDemand()
        } catch {
            NSLog("[Dashboard] ⚠️ product-demand failed: %@", String(describing: error))
        }
    }

    /// Fetch revenue forecast by month
    @MainActor
    public func loadForecast() async {
        do {
            forecast = try await apiClient.getForecast()
        } catch {
            NSLog("[Dashboard] ⚠️ forecast failed: %@", String(describing: error))
        }
    }
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
