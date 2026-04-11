import SwiftUI
import SolennixCore
import SolennixFeatures
import SolennixNetwork

// MARK: - Route Destination

/// Resolves a `Route` to its destination view.
struct RouteDestination: View {

    let route: Route
    @Environment(\.apiClient) private var apiClient
    @Environment(AuthManager.self) private var authManager

    var body: some View {
        switch route {
        // Events
        case .eventList:
            EventListView(apiClient: apiClient)
        case .eventDetail(let id):
            EventDetailView(eventId: id, apiClient: apiClient)
        case .eventForm(let id, _, _):
            EventFormView(eventId: id, apiClient: apiClient)
        case .eventChecklist(let id):
            EventChecklistView(eventId: id, apiClient: apiClient)
        case .eventFinances(let id):
            EventFinancesDetailView(eventId: id, apiClient: apiClient)
        case .eventPayments(let id):
            EventPaymentsDetailView(eventId: id, apiClient: apiClient)
        case .eventProducts(let id):
            EventProductsDetailView(eventId: id, apiClient: apiClient)
        case .eventExtras(let id):
            EventExtrasDetailView(eventId: id, apiClient: apiClient)
        case .eventSupplies(let id):
            EventSuppliesDetailView(eventId: id, apiClient: apiClient)
        case .eventEquipment(let id):
            EventEquipmentDetailView(eventId: id, apiClient: apiClient)
        case .eventShoppingList(let id):
            EventShoppingListView(eventId: id, apiClient: apiClient)
        case .eventPhotos(let id):
            EventPhotosDetailView(eventId: id, apiClient: apiClient)
        case .eventContractPreview(let id):
            EventContractPreviewView(eventId: id, apiClient: apiClient)

        // Clients
        case .clientList:
            ClientListView(apiClient: apiClient)
        case .clientDetail(let id):
            ClientDetailView(clientId: id, apiClient: apiClient)
        case .clientForm(let id):
            ClientFormView(clientId: id, apiClient: apiClient)
        case .quickQuote:
            QuickQuoteView(apiClient: apiClient)

        // Products
        case .productList:
            ProductListView(apiClient: apiClient)
        case .productDetail(let id):
            ProductDetailView(apiClient: apiClient, productId: id)
        case .productForm(let id):
            ProductFormView(apiClient: apiClient, productId: id)

        // Inventory
        case .inventoryList:
            InventoryListView(apiClient: apiClient)
        case .inventoryDetail(let id):
            InventoryDetailView(apiClient: apiClient, itemId: id)
        case .inventoryForm(let id):
            InventoryFormView(apiClient: apiClient, itemId: id)

        // Tools
        case .search(let query):
            SearchView(initialQuery: query)
        case .settings:
            SettingsView(apiClient: apiClient, authManager: authManager)

        // Settings
        case .editProfile:
            EditProfileView(apiClient: apiClient, authManager: authManager)
        case .changePassword:
            ChangePasswordView(apiClient: apiClient, authManager: authManager)
        case .businessSettings:
            BusinessSettingsView(apiClient: apiClient)
        case .contractDefaults:
            ContractDefaultsView(apiClient: apiClient)
        case .pricing:
            PricingView(apiClient: apiClient, authManager: authManager)
        case .subscription:
            SubscriptionView(apiClient: apiClient, authManager: authManager)
        case .about:
            AboutView()
        }
    }
}

// MARK: - Previews

#Preview("Event Detail") {
    NavigationStack {
        RouteDestination(route: .eventDetail(id: "evt-123"))
    }
}

#Preview("Event Form") {
    NavigationStack {
        RouteDestination(route: .eventForm(clientId: "cli-456", date: .now))
    }
}
