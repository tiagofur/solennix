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

    // MARK: - Shared Instance

    /// Shared reference used by the launch-time BG task handler to resolve dependencies
    /// lazily. Set from SolennixApp once APIClient/CacheManager are ready.
    nonisolated(unsafe) static weak var shared: BackgroundTaskManager?

    // MARK: - Launch Handler Registration

    /// Registers the BG task handler synchronously at app launch.
    /// MUST be called from `AppDelegate.application(_:didFinishLaunchingWithOptions:)`
    /// — iOS aborts with NSInternalInconsistencyException if registration happens
    /// after launch completes.
    static func registerLaunchHandler() {
        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: Self.refreshTaskIdentifier,
            using: nil
        ) { task in
            guard let task = task as? BGAppRefreshTask else {
                task.setTaskCompleted(success: false)
                return
            }
            Task { @MainActor in
                if let manager = BackgroundTaskManager.shared {
                    await manager.handleAppRefresh(task)
                } else {
                    task.setTaskCompleted(success: false)
                }
            }
        }
    }

    // MARK: - Dependencies

    private let apiClient: APIClient
    private let cacheManager: CacheManager?
    private let authManager: AuthManager

    // MARK: - Init

    init(apiClient: APIClient, cacheManager: CacheManager?, authManager: AuthManager) {
        self.apiClient = apiClient
        self.cacheManager = cacheManager
        self.authManager = authManager
    }

    // MARK: - Scheduling

    /// Schedule the next background refresh. Call after each successful refresh or on app backgrounding.
    func scheduleAppRefresh() {
        let request = BGAppRefreshTaskRequest(identifier: Self.refreshTaskIdentifier)
        request.earliestBeginDate = Date(timeIntervalSinceNow: 30 * 60) // 30 minutes
        do {
            try BGTaskScheduler.shared.submit(request)
        } catch {
            // BGTaskScheduler commonly throws when running in simulator or when
            // background app refresh is disabled — these are expected and not actionable.
        }
    }

    // MARK: - Task Handling

    func handleAppRefresh(_ task: BGAppRefreshTask) async {
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
        // Bail out if the user is not authenticated — avoids unauthenticated API
        // calls that would fail with 401 and pollute Sentry after logout.
        guard authManager.isAuthenticated else { return false }

        do {
            // Fetch core data in parallel
            async let eventsResult: [Event] = apiClient.getAll(Endpoint.events)
            async let clientsResult: [Client] = apiClient.getAll(Endpoint.clients)
            async let productsResult: [Product] = apiClient.getAll(Endpoint.products)
            async let inventoryResult: [InventoryItem] = apiClient.getAll(Endpoint.inventory)
            async let paymentsResult: [Payment] = apiClient.getAll(Endpoint.payments)

            let events = try await eventsResult
            let clients = try await clientsResult
            let products = try await productsResult
            let inventory = try await inventoryResult
            let payments = try await paymentsResult

            // Update SwiftData cache
            try? cacheManager?.cacheEvents(events)
            try? cacheManager?.cacheClients(clients)
            try? cacheManager?.cacheProducts(products)
            try? cacheManager?.cacheInventoryItems(inventory)
            try? cacheManager?.cachePayments(payments)

            // Update Spotlight index
            let clientMap = Dictionary(uniqueKeysWithValues: clients.map { ($0.id, $0.name) })
            SpotlightIndexer.indexClients(clients)
            SpotlightIndexer.indexEvents(events, clientMap: clientMap)
            SpotlightIndexer.indexProducts(products)

            // Update widget data through the shared coordinator (single DRY
            // source for widget payload derivation — D3). It reads from the
            // cache populated above, so this stays network-fresh.
            WidgetSyncCoordinator.shared.syncAll()

            return true
        } catch {
            SentryHelper.capture(error: error, context: "background_task_refresh")
            return false
        }
    }
}
