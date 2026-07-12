import Foundation
import Observation
import os.log
import SolennixCore
import SolennixNetwork

private let logger = Logger(subsystem: SolennixLog.subsystem, category: "DashboardViewModel")

// MARK: - Dashboard Attention Events

public enum DashboardAttentionEventKind: String, Sendable, Hashable {
    case overdueEvent
    case pendingPayment
    case unconfirmedEvent

    public var title: String {
        switch self {
        case .pendingPayment:
            return FeatureL10n.text("dashboard.attention.pending_payment_kind", "Pago pendiente")
        case .overdueEvent:
            return FeatureL10n.text("dashboard.attention.overdue_event_kind", "Vencido")
        case .unconfirmedEvent:
            return FeatureL10n.text("dashboard.attention.unconfirmed_event_kind", "Sin confirmar")
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
    public private(set) var hasLoadedOnce: Bool = false
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
    private let isBasicPlan: Bool
    private var allEvents: [Event] = []
    private var allPayments: [Payment] = []

    // MARK: - Init

    /// - parameter isBasicPlan: Snapshot of the user's plan tier at load time
    ///   (from `PlanLimitsManager.isBasicPlan`). When true, `loadDashboard()`
    ///   fetches only the core KPIs and skips the premium analytics bundle so
    ///   basic users don't pay for chart/widget data they can't see (#820).
    public init(apiClient: APIClient, isBasicPlan: Bool = false) {
        self.apiClient = apiClient
        self.isBasicPlan = isBasicPlan
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

    private static func tr(_ key: String, _ value: String) -> String {
        FeatureL10n.text(key, value)
    }

    /// Resolve a client name from the client map.
    public func clientName(for clientId: String) -> String {
        clientMap[clientId]?.name ?? Self.tr("dashboard.event.no_client", "Cliente")
    }

    // MARK: - Data Loading

    @MainActor
    public func loadDashboard() async {
        isLoading = true
        errorMessage = nil

        // Build date range for current month using the shared UTC month-range
        // helper so the boundary matches the server (UTC dates) regardless of
        // device TZ — and is identical to `PlanLimitsManager` (issue #805).
        let now = Date()
        let (startStr, endStr) = Date.utcMonthRange(for: now)

        var encounteredError = false

        // Plan-tier-aware header load (#820).
        // - Paid users: single aggregated round-trip — KPIs + the 5
        //   chart/widget datasets (revenue-chart, events-by-status,
        //   top-clients, product-demand, forecast) collapse into one
        //   GET /dashboard/summary (issue #807).
        // - Basic users: fetch only GET /dashboard/kpis (core counts). The 5
        //   premium datasets are gated behind `!planLimitsManager.isBasicPlan`
        //   in the View, so basic users never see them — fetching the bundle
        //   would waste bandwidth for data that is rendered into nothing.
        do {
            if isBasicPlan {
                let kpisOnly: DashboardKPIs = try await apiClient.get(Endpoint.dashboardKpis)
                applyKPIs(kpisOnly, now: now)
            } else {
                let summary: DashboardSummary = try await apiClient.get(Endpoint.dashboardSummary)
                applySummary(summary, now: now)
            }
        } catch {
            logger.error("dashboard header load failed: \(String(describing: error), privacy: .public)")
            // Non-fatal — the body-list loaders below still populate the
            // dashboard; we just lose the header/charts/widgets until the next
            // load. Fall through so the lists still attempt.
            encounteredError = true
        }

        // Generic list loader returning a (values, failed) tuple so it is safe
        // to call from concurrent `async let` branches (no shared mutable
        // capture). Callers aggregate the `failed` flags after awaiting.
        func loadOrEmpty<T: Decodable>(
            _ endpoint: String,
            params: [String: String]? = nil,
            label: String
        ) async -> (values: [T], failed: Bool) {
            let paramsDesc = params?.map { "\($0.key)=\($0.value)" }.joined(separator: "&") ?? "none"
            // Log the ACTUAL resolved URL to diagnose 404s. Debug-level so it
            // is dropped in Release: the URL carries query params that may
            // include resource IDs, which must not reach Console.app/diagnostics.
            let resolvedURL = await apiClient.resolveURL(endpoint)?.absoluteString ?? "nil"
            logger.debug("Loading \(label, privacy: .public) -> \(endpoint, privacy: .public) params: \(paramsDesc, privacy: .private) | URL: \(resolvedURL, privacy: .private)")
            do {
                let result: [T] = try await apiClient.getAll(endpoint, params: params)
                logger.debug("\(label, privacy: .public) loaded \(result.count) items")
                return (result, false)
            } catch {
                logger.error("\(label, privacy: .public) FAILED: \(String(describing: error), privacy: .public)")
                return ([], true)
            }
        }

        // Body lists in bounded-parallel batches (max 3 in flight per batch).
        // The dashboard previously fired these sequentially as a workaround for
        // an nginx HTTP/2 concurrent-stream hang; other ViewModels now fan out
        // with async let over the same URLSession without issue, so we cap at 3
        // (well below the 8 that triggered the old hang) as insurance.
        // 5 lists at cap 3 ≈ 2 round-trips instead of 5 sequential ones.
        // Note: /products is no longer fetched — its only consumer was
        // `totalProducts`, now sourced from `kpis.totalProducts`. The duplicate
        // month-scoped /events fetch is gone too — `eventsThisMonth` is derived
        // client-side from the single all-events fetch below.
        async let clientsFetch: (values: [Client], failed: Bool) = loadOrEmpty(
            Endpoint.clients,
            label: "clients"
        )
        async let eventsFetch: (values: [Event], failed: Bool) = loadOrEmpty(
            Endpoint.events,
            label: "all events"
        )
        async let inventoryFetch: (values: [InventoryItem], failed: Bool) = loadOrEmpty(
            Endpoint.inventory,
            label: "inventory"
        )
        let clientsLoad = await clientsFetch
        let eventsLoad = await eventsFetch
        let inventoryLoad = await inventoryFetch

        async let upcomingFetch: (values: [Event], failed: Bool) = loadOrEmpty(
            Endpoint.upcomingEvents,
            label: "upcoming events"
        )
        async let paymentsFetch: (values: [Payment], failed: Bool) = loadOrEmpty(
            Endpoint.payments,
            label: "all payments"
        )
        let upcomingLoad = await upcomingFetch
        let paymentsLoad = await paymentsFetch

        let clients = clientsLoad.values
        let loadedAllEvents = eventsLoad.values
        let inventory = inventoryLoad.values
        let loadedUpcomingEvents = upcomingLoad.values
        let loadedAllPayments = paymentsLoad.values

        if clientsLoad.failed || eventsLoad.failed || inventoryLoad.failed
            || upcomingLoad.failed || paymentsLoad.failed {
            encounteredError = true
        }

        // Build client map
        clientMap = Dictionary(uniqueKeysWithValues: clients.map { ($0.id, $0) })

        // Events this month: derived client-side from the single all-events
        // fetch (inclusive UTC start/end string compare matches the server's
        // ?start=&end= filter exactly for ISO "YYYY-MM-DD" dates).
        let monthEvents = loadedAllEvents.filter { event in
            let day = String(event.eventDate.prefix(10))
            return day >= startStr && day <= endStr
        }
        eventsThisMonth = monthEvents
        allEvents = loadedAllEvents
        allPayments = loadedAllPayments

        // Upcoming events
        upcomingEvents = Array(loadedUpcomingEvents.sorted(by: Self.compareDashboardEvents).prefix(5))

        // Low stock items = inventory where current_stock < minimum_stock AND minimum_stock > 0.
        // lowStockItems.count is the single canonical source once inventory loads.
        // The KPI value (set in applySummary) is only a pre-inventory placeholder.
        lowStockItems = inventory.filter { $0.minimumStock > 0 && $0.currentStock < $0.minimumStock }
        lowStockCount = lowStockItems.count  // canonical — KPI value is now superseded

        // Counts for onboarding checklist. totalProducts comes from KPIs now
        // (no /products list fetch); totalEvents is still the full event count.
        totalProducts = kpis?.totalProducts ?? 0
        totalEvents = loadedAllEvents.count

        // Attention events for dashboard alerts/cards.
        attentionEvents = Self.makeAttentionEvents(
            events: loadedAllEvents,
            payments: loadedAllPayments,
            clientMap: clientMap,
            now: now
        )

        logger.debug("Summary: clients=\(clients.count), monthEvents=\(monthEvents.count), upcoming=\(self.upcomingEvents.count), allEvents=\(loadedAllEvents.count), inventory=\(inventory.count), totalProducts=\(self.totalProducts), allPayments=\(loadedAllPayments.count), encounteredError=\(encounteredError ? "YES" : "NO", privacy: .public)")

        if encounteredError {
            if clients.isEmpty && loadedAllEvents.isEmpty {
                errorMessage = Self.tr("dashboard.error.load_failed", "Error al cargar dashboard")
            } else {
                errorMessage = Self.tr("dashboard.error.partial_load", "Algunos datos no se pudieron cargar")
            }
        }

        hasLoadedOnce = true
        isLoading = false
    }

    /// Applies only the core KPIs (counts all plans need). Shared by the
    /// basic-plan path (`GET /dashboard/kpis`) and the paid-plan summary path.
    /// Posts `.solennixDashboardKPIsRefreshed` so the widget stays aligned.
    @MainActor
    private func applyKPIs(_ aggregated: DashboardKPIs, now: Date) {
        kpis = aggregated
        // Publish server-aggregated KPIs so the widget sync coordinator can
        // persist them to the App Group — keeps widget revenue/event counts
        // aligned with the dashboard instead of the local cache (issue #802).
        NotificationCenter.default.post(
            name: .solennixDashboardKPIsRefreshed,
            object: nil,
            userInfo: ["kpis": aggregated]
        )
        // Mirror low stock count for views that read `lowStockCount` directly
        // only while inventory hasn't loaded yet. Once lowStockItems is
        // populated by the inventory loader it becomes the canonical source,
        // so skip the placeholder write on pull-to-refresh (lowStockItems is
        // non-empty after first load).
        if lowStockItems.isEmpty {
            lowStockCount = aggregated.lowStockItems
        }
    }

    /// Fan a `DashboardSummary` payload out to the chart/widget properties.
    /// Paid-plan path: KPIs (via `applyKPIs`) + the 5 premium datasets. Basic
    /// users never reach here — `loadDashboard` routes them to `applyKPIs` only.
    @MainActor
    private func applySummary(_ summary: DashboardSummary, now: Date) {
        applyKPIs(summary.kpis, now: now)

        // Revenue trend: backend returns only months with payments; pad the
        // trailing 6-month window with zero-revenue points so the chart always
        // shows 6 bars.
        monthlyRevenueTrend = Self.buildTrailingSixMonthTrend(from: summary.revenueChart, now: now)

        // Month-scoped status distribution → [EventStatus: Int]. Status strings
        // that don't match the iOS enum are dropped silently (defensive against
        // future backend additions).
        var statusMap: [EventStatus: Int] = [:]
        for row in summary.eventsByStatus {
            if let status = EventStatus(rawValue: row.status) {
                statusMap[status] = row.count
            }
        }
        eventStatusCounts = statusMap

        topClients = summary.topClients
        productDemand = summary.productDemand
        forecast = summary.forecast
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
                NotificationCenter.default.post(
                    name: .solennixDashboardKPIsRefreshed,
                    object: nil,
                    userInfo: ["kpis": refreshed]
                )
                // lowStockCount is owned by lowStockItems (canonical source after inventory load).
                // Do NOT overwrite it from kpis here to avoid a flicker back to the
                // server-aggregate value. lowStockItems remains authoritative.
            }
            await loadEventStatusCounts()
            HapticsHelper.play(.success)
        } catch {
            HapticsHelper.play(.error)

            if let apiError = error as? APIError {
                errorMessage = apiError.errorDescription ?? Self.tr("dashboard.error.status_change_failed", "No se pudo cambiar el estado")
            } else {
                errorMessage = Self.tr("dashboard.error.status_change_failed", "No se pudo cambiar el estado")
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
        // Status filter matches isUpcomingEvent: confirmed only.
        guard event.status == .confirmed,
              let eventDate = Self.dashboardDateFormatter.date(from: String(event.eventDate.prefix(10)))
        else {
            return false
        }

        // Use the same UTC round-trip normalization as isUpcomingEvent so that
        // shouldDisplayInUpcoming and isUpcomingEvent agree for every timezone.
        let today = Self.dashboardDateFormatter.date(from: Self.dashboardDateFormatter.string(from: now)) ?? now
        return eventDate >= today
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

    /// UTC calendar shared by makeAttentionEvents so its date arithmetic matches
    /// dashboardDateFormatter (UTC-pinned) and PendingEventsViewModel (explicit UTC).
    private static let utcCalendar: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(secondsFromGMT: 0)!
        return c
    }()

    static func makeAttentionEvents(
        events: [Event],
        payments: [Payment],
        clientMap: [String: Client],
        now: Date,
        calendar: Calendar = utcCalendar
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
                clientName: clientMap[event.clientId]?.name ?? Self.tr("dashboard.event.no_client", "Cliente"),
                totalPaid: totalPaid,
                outstandingAmount: outstandingAmount,
                daysFromToday: daysFromToday
            )
        }
        .sorted(by: Self.compareAttentionEvents)
    }

    static func compareAttentionEvents(
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

    private static func isUpcomingEvent(_ event: Event, now: Date = Date()) -> Bool {
        // Only confirmed events appear in "Próximos eventos" — must match
        // shouldDisplayInUpcoming so both functions agree on membership.
        guard event.status == .confirmed,
              let eventDate = dashboardDateFormatter.date(from: String(event.eventDate.prefix(10)))
        else {
            return false
        }

        let today = dashboardDateFormatter.date(from: dashboardDateFormatter.string(from: now)) ?? now
        return eventDate >= today
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
            logger.error("revenue-chart failed: \(String(describing: error), privacy: .public)")
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
        calendar: Calendar = utcCalendar
    ) -> [MonthlyRevenueTrendPoint] {
        let keyFormatter = DateFormatter()
        keyFormatter.calendar = Calendar(identifier: .gregorian)
        keyFormatter.locale = Locale(identifier: "en_US_POSIX")
        keyFormatter.timeZone = TimeZone(secondsFromGMT: 0)
        keyFormatter.dateFormat = "yyyy-MM"

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
                month: DashboardFormatting.monthYear(from: key),
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
            logger.error("events-by-status failed: \(String(describing: error), privacy: .public)")
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
            logger.error("top-clients failed: \(String(describing: error), privacy: .public)")
        }
    }

    /// Fetch products by demand (times used)
    @MainActor
    public func loadProductDemand() async {
        do {
            productDemand = try await apiClient.getProductDemand()
        } catch {
            logger.error("product-demand failed: \(String(describing: error), privacy: .public)")
        }
    }

    /// Fetch revenue forecast by month
    @MainActor
    public func loadForecast() async {
        do {
            forecast = try await apiClient.getForecast()
        } catch {
            logger.error("forecast failed: \(String(describing: error), privacy: .public)")
        }
    }
}
