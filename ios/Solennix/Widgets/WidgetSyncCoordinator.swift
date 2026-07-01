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
        // trigger (descoped).
        let names: [Notification.Name] = [
            .solennixEventUpdated,
            .solennixPaymentRegistered,
            .solennixPaymentDeleted,
            .solennixSceneActivated,
            NSLocale.currentLocaleDidChangeNotification
        ]
        for name in names {
            let observer = center.addObserver(forName: name, object: nil, queue: .main) { [weak self] _ in
                guard let self else { return }
                Task { @MainActor in
                    self.handleSyncTrigger()
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

        // Upcoming events: confirmed/quoted, capped at 10.
        let widgetEvents = events
            .filter { $0.status == .confirmed || $0.status == .quoted }
            .prefix(10)
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

    /// Derives KPIs from cached events + inventory + (best-effort) payments.
    /// Mirrors the derivation previously inlined in
    /// `BackgroundTaskManager.performRefresh` (single DRY source — D3).
    private func deriveKPIs(
        events: [Event],
        inventory: [InventoryItem],
        cacheManager: CacheManager
    ) -> WidgetKPIData {
        let now = Date()
        let calendar = Calendar.current

        let eventsThisMonth = events.filter {
            guard let date = ISO8601DateFormatter().date(from: $0.eventDate) else { return false }
            return calendar.isDate(date, equalTo: now, toGranularity: .month)
        }
        let startOfWeek = calendar.dateInterval(of: .weekOfYear, for: now)?.start ?? now
        let eventsThisWeek = events.filter {
            guard let date = ISO8601DateFormatter().date(from: $0.eventDate) else { return false }
            return date >= startOfWeek && date <= now.addingTimeInterval(7 * 24 * 3600)
        }
        let lowStockCount = inventory.filter { $0.minimumStock > 0 && $0.currentStock < $0.minimumStock }.count
        let monthlyRevenue = eventsThisMonth
            .filter { $0.status == .completed }
            .reduce(0.0) { $0 + $1.totalAmount }

        // Pending payments: confirmed events in the next 7 days, minus cached
        // payments per event. Payments are cached by the background refresh;
        // when absent this degrades to the event's full amount (never crashes).
        let startOfToday = calendar.startOfDay(for: now)
        let next7Days = calendar.date(byAdding: .day, value: 7, to: startOfToday) ?? now
        let pendingPayments = events
            .filter { event in
                guard event.status == .confirmed else { return false }
                guard let eventDate = ISO8601DateFormatter().date(from: event.eventDate) else { return false }
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
            eventsThisMonth: eventsThisMonth.count,
            eventsThisWeek: eventsThisWeek.count,
            lowStockCount: lowStockCount,
            pendingPayments: pendingPayments,
            confirmedEvents: events.filter { $0.status == .confirmed }.count,
            quotedEvents: events.filter { $0.status == .quoted }.count
        )
    }
}
