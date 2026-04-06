import BackgroundTasks
import SolennixCore
import SolennixNetwork
import SolennixFeatures

// MARK: - Background Task Manager

/// Manages background app refresh to keep cached data, widgets, and Spotlight index up to date.
@MainActor
final class BackgroundTaskManager {

    // MARK: - Constants

    static let refreshTaskIdentifier = "com.solennix.app.refresh"

    // MARK: - Dependencies

    private let apiClient: APIClient
    private let cacheManager: CacheManager?

    // MARK: - Init

    init(apiClient: APIClient, cacheManager: CacheManager?) {
        self.apiClient = apiClient
        self.cacheManager = cacheManager
    }

    // MARK: - Registration

    /// Register the background refresh task handler. Call once at app launch.
    func registerTasks() {
        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: Self.refreshTaskIdentifier,
            using: nil
        ) { [weak self] task in
            guard let task = task as? BGAppRefreshTask else { return }
            Task { @MainActor in
                await self?.handleAppRefresh(task)
            }
        }
    }

    // MARK: - Scheduling

    /// Schedule the next background refresh. Call after each successful refresh or on app backgrounding.
    func scheduleAppRefresh() {
        let request = BGAppRefreshTaskRequest(identifier: Self.refreshTaskIdentifier)
        request.earliestBeginDate = Date(timeIntervalSinceNow: 30 * 60) // 30 minutes
        do {
            try BGTaskScheduler.shared.submit(request)
        } catch {
            print("[BackgroundTaskManager] Error scheduling refresh: \(error)")
        }
    }

    // MARK: - Task Handling

    private func handleAppRefresh(_ task: BGAppRefreshTask) async {
        // Schedule the next refresh before doing work
        scheduleAppRefresh()

        // Set up expiration handler
        let refreshTask = Task {
            await performRefresh()
        }

        task.expirationHandler = {
            refreshTask.cancel()
        }

        let success = await refreshTask.value
        task.setTaskCompleted(success: success)
    }

    /// Fetches fresh data from the API and updates cache, widgets, and Spotlight.
    private func performRefresh() async -> Bool {
        do {
            // Fetch core data in parallel
            async let eventsResult: [Event] = apiClient.getAll(Endpoint.events)
            async let clientsResult: [Client] = apiClient.getAll(Endpoint.clients)
            async let productsResult: [Product] = apiClient.getAll(Endpoint.products)
            async let inventoryResult: [InventoryItem] = apiClient.getAll(Endpoint.inventory)

            let events = try await eventsResult
            let clients = try await clientsResult
            let products = try await productsResult
            let inventory = try await inventoryResult

            // Update SwiftData cache
            try? cacheManager?.cacheEvents(events)
            try? cacheManager?.cacheClients(clients)
            try? cacheManager?.cacheProducts(products)
            try? cacheManager?.cacheInventoryItems(inventory)

            // Update Spotlight index
            let clientMap = Dictionary(uniqueKeysWithValues: clients.map { ($0.id, $0.name) })
            SpotlightIndexer.indexClients(clients)
            SpotlightIndexer.indexEvents(events, clientMap: clientMap)
            SpotlightIndexer.indexProducts(products)

            // Update widget data
            let widgetEvents = events
                .filter { $0.status == .confirmed || $0.status == .quoted }
                .prefix(10)
                .map { event in
                    WidgetEventData.from(
                        event: event,
                        clientName: clientMap[event.clientId] ?? "Cliente"
                    )
                }
            WidgetDataSync.shared.syncUpcomingEvents(Array(widgetEvents))

            // Sync KPIs for widget
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
            let lowStockCount = inventory.filter { $0.currentStock < $0.minimumStock }.count
            let monthlyRevenue = eventsThisMonth
                .filter { $0.status == .completed }
                .reduce(0.0) { $0 + $1.totalAmount }

            let kpis = WidgetKPIData.from(
                monthlyRevenue: monthlyRevenue,
                eventsThisMonth: eventsThisMonth.count,
                eventsThisWeek: eventsThisWeek.count,
                lowStockCount: lowStockCount,
                pendingPayments: 0,
                confirmedEvents: events.filter { $0.status == .confirmed }.count,
                quotedEvents: events.filter { $0.status == .quoted }.count
            )
            WidgetDataSync.shared.syncKPIs(kpis)

            return true
        } catch {
            print("[BackgroundTaskManager] Refresh failed: \(error)")
            return false
        }
    }
}
