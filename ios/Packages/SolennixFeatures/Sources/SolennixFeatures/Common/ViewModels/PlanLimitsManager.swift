import Foundation
import Observation
import SolennixCore
import SolennixNetwork

// MARK: - Plan Limits Manager

@Observable
public final class PlanLimitsManager {

    // MARK: - Configuration Limits
    
    public static let freePlanEventLimit = 3
    public static let clientLimit = 50
    public static let catalogLimit = 20

    // MARK: - Properties

    public var eventsThisMonth: Int = 0
    public var clientsCount: Int = 0
    public var catalogCount: Int = 0
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

    public var canCreateCatalogItem: Bool {
        !isBasicPlan || catalogCount < Self.catalogLimit
    }

    // MARK: - Actions

    @MainActor
    public func checkLimits() async {
        guard let _ = authManager?.currentUser else { return }
        
        isLoading = true

        let now = Date()
        let calendar = Calendar.current
        let startComponents = calendar.dateComponents([.year, .month], from: now)
        var endComponents = startComponents
        endComponents.month = (startComponents.month ?? 0) + 1
        endComponents.day = 0 // Last day of current month

        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"

        guard let startDate = calendar.date(from: startComponents),
              let endDate = calendar.date(from: endComponents) else {
            isLoading = false
            return
        }

        let startStr = formatter.string(from: startDate)
        let endStr = formatter.string(from: endDate)

        do {
            if isBasicPlan {
                // Fetch all to check limits
                async let eventsTask: [Event] = apiClient.get(Endpoint.events, params: ["start_date": startStr, "end_date": endStr])
                async let clientsTask: [Client] = apiClient.get(Endpoint.clients)
                async let productsTask: [Product] = apiClient.get(Endpoint.products)
                async let inventoryTask: [InventoryItem] = apiClient.get(Endpoint.inventory)

                // Await all concurrently, falling back to empty on individual errors if needed,
                // but here we wait for all to succeed. To match RN's `.catch(() => [])` we would:
                let events = (try? await eventsTask) ?? []
                let clients = (try? await clientsTask) ?? []
                let products = (try? await productsTask) ?? []
                let inventory = (try? await inventoryTask) ?? []

                eventsThisMonth = events.count
                clientsCount = clients.count
                catalogCount = products.count + inventory.count
            } else {
                // Only need to count events this month
                let events: [Event] = (try? await apiClient.get(Endpoint.events, params: ["start_date": startStr, "end_date": endStr])) ?? []
                eventsThisMonth = events.count
            }
        }

        isLoading = false
    }
}
