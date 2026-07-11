import Foundation
import Observation
import os.log
import SolennixCore
import SolennixNetwork

// MARK: - Plan Limits Manager

@Observable
public final class PlanLimitsManager {

    private let logger = Logger(subsystem: SolennixLog.subsystem, category: "PlanLimitsManager")

    // MARK: - Configuration Limits
    
    public static let freePlanEventLimit = 4
    public static let clientLimit = 20
    public static let productLimit = 15
    public static let inventoryLimit = 30
    public static let catalogLimit = 20

    // MARK: - Properties

    public var eventsThisMonth: Int = 0
    public var clientsCount: Int = 0
    public var productsCount: Int = 0
    public var inventoryCount: Int = 0
    public var isLoading: Bool = false

    private let apiClient: APIClient
    private var authManager: AuthManager?

    // MARK: - Init

    public init(apiClient: APIClient) {
        self.apiClient = apiClient
    }

    /// Link auth manager to know current user plan.
    public func setAuthManager(_ authManager: AuthManager) {
        self.authManager = authManager
    }

    // MARK: - State Checks

    public var isBasicPlan: Bool {
        guard let user = authManager?.currentUser else { return true }
        return user.plan == .basic
    }

    public var canCreateEvent: Bool {
        !isBasicPlan || eventsThisMonth < Self.freePlanEventLimit
    }

    public var canCreateClient: Bool {
        !isBasicPlan || clientsCount < Self.clientLimit
    }

    public var canCreateProduct: Bool {
        guard isBasicPlan else { return true }
        let catalogTotal = productsCount + inventoryCount
        return productsCount < Self.productLimit && catalogTotal < Self.catalogLimit
    }

    public var canCreateInventoryItem: Bool {
        guard isBasicPlan else { return true }
        let catalogTotal = productsCount + inventoryCount
        return inventoryCount < Self.inventoryLimit && catalogTotal < Self.catalogLimit
    }

    // MARK: - Actions

    @MainActor
    public func checkLimits() async {
        guard let _ = authManager?.currentUser else { return }

        isLoading = true
        defer { isLoading = false }

        // Use the shared UTC month-range helper so the `start`/`end` query
        // params match `DashboardViewModel` and the server's UTC dates exactly
        // (issue #805). Previously this used `Calendar.current`, which in
        // negative-offset zones (e.g. UTC-6) shifted the month boundary and
        // made the free-plan event count disagree with the dashboard.
        let (startStr, endStr) = Date.utcMonthRange()
        let eventsParams: [String: String] = ["start": startStr, "end": endStr]

        if isBasicPlan {
            // Kick off the four limit-relevant fetches concurrently with async
            // let, then await each inside its own do/catch. On failure we log
            // and preserve the last known count (instead of zeroing it), so a
            // transient network/server error can't silently reopen the free-plan
            // gate (issue #806). Each is awaited independently so one failure
            // can't abort the others.
            async let eventsTask = apiClient.getAll(Endpoint.events, params: eventsParams) as [Event]
            async let clientsTask = apiClient.getAll(Endpoint.clients) as [Client]
            async let productsTask = apiClient.getAll(Endpoint.products) as [Product]
            async let inventoryTask = apiClient.getAll(Endpoint.inventory) as [InventoryItem]

            do { eventsThisMonth = (try await eventsTask).count }
            catch { logger.error("events fetch failed: \(String(describing: error), privacy: .public)") }

            do { clientsCount = (try await clientsTask).count }
            catch { logger.error("clients fetch failed: \(String(describing: error), privacy: .public)") }

            do { productsCount = (try await productsTask).count }
            catch { logger.error("products fetch failed: \(String(describing: error), privacy: .public)") }

            do { inventoryCount = (try await inventoryTask).count }
            catch { logger.error("inventory fetch failed: \(String(describing: error), privacy: .public)") }
        } else {
            // Paid plans only gate events-per-month.
            do {
                let events: [Event] = try await apiClient.getAll(Endpoint.events, params: eventsParams)
                eventsThisMonth = events.count
            } catch {
                logger.error("events fetch failed: \(String(describing: error), privacy: .public)")
            }
        }
    }
}
