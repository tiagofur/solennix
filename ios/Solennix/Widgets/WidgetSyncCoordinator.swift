import Foundation
import WidgetKit
import os.log
import SolennixCore

private let logger = Logger(subsystem: "com.solennix.app", category: "WidgetSyncCoordinator")

// MARK: - Widget Sync Coordinator

/// Single entrypoint that keeps widget timelines fresh.
///
/// Observes the existing `NotificationCenter` bus (event/payment CRUD,
/// scene foreground, locale change) and reacts by deriving widget payloads
/// from the local SwiftData cache (no network) and handing them to the
/// injected `WidgetSyncing` (defaults to `WidgetDataSync.shared`), which writes
/// the App Group container and reloads the affected timelines per kind.
///
/// Design (D2/D3/D8/D13): `@MainActor`; observers hop to the main actor; the
/// sync dependency is injected so the trigger logic is unit-testable with a
/// mock. Replaces the scattered widget-sync call sites and the dead
/// `WidgetSyncable` protocol.
@MainActor
final class WidgetSyncCoordinator {

    static let shared = WidgetSyncCoordinator()

    /// Cache used to derive widget payloads. Weak: owned by the app; cleared on
    /// logout via `CacheManager.clearAll()`.
    private weak var cacheManager: CacheManager?

    /// Sync backend (injectable for tests). Defaults to the real shared instance.
    private let sync: WidgetSyncing

    /// Auth gate evaluated on every trigger. Set from `SolennixApp` so the
    /// coordinator never syncs for a logged-out user. Defaults to `false`.
    private var isAuthorized: () -> Bool = { false }

    /// Last server-aggregated KPIs received from `DashboardViewModel` (issue
    /// #802). When present, `deriveKPIs` uses these as the source of truth for
    /// revenue / month count / low stock so the widget matches the dashboard;
    /// the cache is only a fallback (cold launch before dashboard loads).
    private var lastServerKPIs: DashboardKPIs?

    /// Registered notification observers (removed by `stop()`).
    private var observers: [NSObjectProtocol] = []

    // MARK: - Init

    /// - Parameter sync: Injected sync backend for tests. Defaults to the real
    ///   shared instance when `nil` (resolved in the init body, which is
    ///   main-actor-isolated, so the default value itself stays nonisolated-safe).
    init(sync: WidgetSyncing? = nil) {
        self.sync = sync ?? WidgetDataSync.shared
    }

    // MARK: - Lifecycle

    /// Attaches the cache + auth gate and begins observing sync triggers.
    /// Idempotent: calling again replaces previously registered observers.
    func start(cache: CacheManager, isAuthorized: @escaping () -> Bool) {
        self.cacheManager = cache
        self.isAuthorized = isAuthorized
        stop()

        let center = NotificationCenter.default
        // REQ-WDS-03 (amended): cold launch + scene foreground are delivered
        // via .solennixSceneActivated; CRUD via the event/payment names;
        // locale change via NSLocale. Pull-to-refresh is intentionally NOT a
        // trigger (descoped). `.solennixDashboardKPIsRefreshed` feeds
        // server-aggregated KPIs to the widget (issue #802).
        let names: [Notification.Name] = [
            .solennixEventUpdated,
            .solennixPaymentRegistered,
            .solennixPaymentDeleted,
            .solennixSceneActivated,
            .solennixDashboardKPIsRefreshed,
            NSLocale.currentLocaleDidChangeNotification
        ]
        for name in names {
            // Deliver synchronously when the notification is posted from the
            // main thread (the common case: all current posters are @MainActor
            // VMs / the app / the system). For the rare background poster, hop
            // to the main actor asynchronously so the handler never runs off-main.
            let observer = center.addObserver(forName: name, object: nil, queue: nil) { [weak self] notification in
                guard let self else { return }
                let handle = {
                    if name == .solennixDashboardKPIsRefreshed {
                        self.handleServerKPIsRefreshed(notification)
                    } else {
                        self.handleSyncTrigger()
                    }
                }
                if Thread.isMainThread {
                    MainActor.assumeIsolated { handle() }
                } else {
                    Task { @MainActor in handle() }
                }
            }
            observers.append(observer)
        }
        logger.debug("WidgetSyncCoordinator started (\(names.count) observers)")
    }

    /// Removes all registered observers.
    func stop() {
        for observer in observers {
            NotificationCenter.default.removeObserver(observer)
        }
        observers.removeAll()
    }

    // MARK: - Sync

    /// Derives widget payloads from the local cache and pushes them through
    /// the sync backend (auth guard is applied by the notification handler,
    /// not here, so tests and the background refresh can call this directly).
    ///
    /// Failures are logged and never propagated: widget freshness must not
    /// break the user flow (REQ-WDS-06).
    func syncAll() {
        guard let cacheManager else {
            logger.debug("syncAll skipped — no CacheManager attached")
            return
        }

        let events = (try? cacheManager.getCachedEvents()) ?? []
        let clients = (try? cacheManager.getCachedClients()) ?? []
        let inventory = (try? cacheManager.getCachedInventoryItems()) ?? []

        let clientMap = Dictionary(uniqueKeysWithValues: clients.map { ($0.id, $0.name) })

        // Upcoming events: confirmed-only, today-or-future, sorted ascending by
        // date, capped at 5 — mirrors the dashboard's upcoming list (issue #802,
        // divergence #3). Date parse uses the local-day anchor so the widget's
        // "today" matches what the user sees.
        let startOfToday = Calendar.current.startOfDay(for: Date())
        let widgetEvents = events
            .filter { event in
                guard event.status == .confirmed else { return false }
                guard let date = Date.fromServerDayLocal(event.eventDate) else {
                    logger.warning("syncAll: unparseable eventDate '\(event.eventDate, privacy: .public)' (upcoming filter)")
                    return false
                }
                return date >= startOfToday
            }
            .sorted {
                (Date.fromServerDayLocal($0.eventDate) ?? .distantFuture) <
                (Date.fromServerDayLocal($1.eventDate) ?? .distantFuture)
            }
            .prefix(5)
            .map { WidgetEventData.from(event: $0, clientName: clientMap[$0.clientId] ?? "Cliente") }
        sync.syncUpcomingEvents(Array(widgetEvents))

        sync.syncKPIs(deriveKPIs(events: events, inventory: inventory, cacheManager: cacheManager))
    }

    // MARK: - Private

    private func handleSyncTrigger() {
        guard isAuthorized() else {
            logger.debug("Sync trigger ignored — not authenticated")
            return
        }
        syncAll()
    }

    /// Captures server-aggregated KPIs and immediately re-syncs so the widget
    /// reflects dashboard values without waiting for the next cache trigger
    /// (issue #802 — divergences #1 and #4).
    private func handleServerKPIsRefreshed(_ notification: Notification) {
        guard isAuthorized() else {
            logger.debug("Server-KPIs trigger ignored — not authenticated")
            return
        }
        if let kpis = notification.userInfo?["kpis"] as? DashboardKPIs {
            lastServerKPIs = kpis
            logger.debug("Server KPIs captured — netSales=\(kpis.netSalesThisMonth, privacy: .private), eventsThisMonth=\(kpis.eventsThisMonth)")
        } else {
            logger.warning("solennixDashboardKPIsRefreshed posted without valid `kpis` payload")
        }
        syncAll()
    }

    /// Derives KPIs from cached events + inventory + (best-effort) payments.
    ///
    /// Server-aggregated KPIs (`lastServerKPIs`) are the source of truth for
    /// revenue, month event count, and low stock when available — so the widget
    /// matches the dashboard (issue #802). The cache remains the fallback for
    /// cold launch before the dashboard has fetched. `eventsThisWeek` uses a
    /// true calendar-week interval (was a rolling 7-day window).
    private func deriveKPIs(
        events: [Event],
        inventory: [InventoryItem],
        cacheManager: CacheManager
    ) -> WidgetKPIData {
        let now = Date()
        let calendar = Calendar.current
        let server = lastServerKPIs

        // --- Month count: server first, cache fallback ---
        let cacheEventsThisMonth = events.filter {
            guard let date = Date.fromServerDayLocal($0.eventDate) else {
                logger.warning("deriveKPIs: unparseable eventDate '\($0.eventDate, privacy: .public)' (eventsThisMonth)")
                return false
            }
            return calendar.isDate(date, equalTo: now, toGranularity: .month)
        }
        let eventsThisMonthCount = server?.eventsThisMonth ?? cacheEventsThisMonth.count

        // --- This week: true calendar week, not a rolling window (issue #802) ---
        let weekInterval = calendar.dateInterval(of: .weekOfYear, for: now)
        let eventsThisWeek = events.filter {
            guard let date = Date.fromServerDayLocal($0.eventDate) else {
                logger.warning("deriveKPIs: unparseable eventDate '\($0.eventDate, privacy: .public)' (eventsThisWeek)")
                return false
            }
            return weekInterval?.contains(date) ?? false
        }

        // --- Low stock: server first, cache fallback ---
        let cacheLowStock = inventory.filter { $0.minimumStock > 0 && $0.currentStock < $0.minimumStock }.count
        let lowStockCount = server?.lowStockItems ?? cacheLowStock

        // --- Revenue: server net sales first; cache fallback sums
        // confirmed + completed `totalAmount` (was completed-only), matching
        // the backend's `SUM(total_amount)` definition (#802). `totalAmount`
        // is already the post-discount final amount, so no extra subtraction. ---
        let monthlyRevenue: Double
        if let server {
            monthlyRevenue = server.netSalesThisMonth
        } else {
            monthlyRevenue = cacheEventsThisMonth
                .filter { $0.status == .confirmed || $0.status == .completed }
                .reduce(0.0) { $0 + $1.totalAmount }
        }

        // Pending payments: confirmed events in the next 7 days, minus cached
        // payments per event. Payments are cached by the background refresh;
        // when absent this degrades to the event's full amount (never crashes).
        let startOfToday = calendar.startOfDay(for: now)
        let next7Days = calendar.date(byAdding: .day, value: 7, to: startOfToday) ?? now
        let pendingPayments = events
            .filter { event in
                guard event.status == .confirmed else { return false }
                guard let eventDate = Date.fromServerDayLocal(event.eventDate) else {
                    logger.warning("deriveKPIs: unparseable eventDate '\(event.eventDate, privacy: .public)' (pendingPayments)")
                    return false
                }
                let normalized = calendar.startOfDay(for: eventDate)
                return normalized >= startOfToday && normalized <= next7Days
            }
            .reduce(0.0) { total, event in
                let payments = (try? cacheManager.getCachedPayments(eventId: event.id)) ?? []
                let totalPaid = payments.reduce(0) { $0 + $1.amount }
                return total + max(event.totalAmount - totalPaid, 0)
            }

        return WidgetKPIData.from(
            monthlyRevenue: monthlyRevenue,
            eventsThisMonth: eventsThisMonthCount,
            eventsThisWeek: eventsThisWeek.count,
            lowStockCount: lowStockCount,
            pendingPayments: pendingPayments,
            confirmedEvents: events.filter { $0.status == .confirmed }.count,
            quotedEvents: events.filter { $0.status == .quoted }.count
        )
    }
}
