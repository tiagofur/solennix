import SwiftUI
import SolennixCore
import SolennixFeatures
import SolennixNetwork

// MARK: - Route Destination

/// Resolves a `Route` to its destination view.
///
/// Real views are substituted as each feature module is implemented.
struct RouteDestination: View {

    let route: Route
    @Environment(\.apiClient) private var apiClient

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
        case .productDetail(let id):
            ProductDetailView(apiClient: apiClient, productId: id)
        case .productForm(let id):
            ProductFormView(apiClient: apiClient, productId: id)

        // Inventory
        case .inventoryDetail(let id):
            InventoryDetailView(apiClient: apiClient, itemId: id)
        case .inventoryForm(let id):
            InventoryFormView(apiClient: apiClient, itemId: id)

        // Settings
        case .editProfile:
            EditProfileView(apiClient: apiClient)
        case .changePassword:
            ChangePasswordView(apiClient: apiClient)
        case .businessSettings:
            BusinessSettingsView(apiClient: apiClient)
        case .contractDefaults:
            ContractDefaultsView(apiClient: apiClient)
        case .pricing:
            PricingView(apiClient: apiClient)
        case .about:
            AboutView()
        case .privacy:
            PrivacyView()
        case .terms:
            TermsView()
        }
    }
}

// MARK: - Placeholder View

/// A temporary view displayed for screens not yet implemented.
/// Shows the screen name, an optional ID, and which phase will deliver it.
struct PlaceholderView: View {

    let title: String
    var id: String? = nil
    var subtitle: String? = nil
    let phase: Int

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "hammer.fill")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)

            Text(title)
                .font(.title2)
                .fontWeight(.semibold)

            if let id {
                Text("ID: \(id)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .monospaced()
            }

            if let subtitle, !subtitle.isEmpty {
                Text(subtitle)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Text("Disponible en Fase \(phase)")
                .font(.footnote)
                .foregroundStyle(.tertiary)
                .padding(.top, 8)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .navigationTitle(title)
    }
}

// MARK: - Previews

#Preview("Event Detail Placeholder") {
    NavigationStack {
        RouteDestination(route: .eventDetail(id: "evt-123"))
    }
}

#Preview("Event Form Placeholder") {
    NavigationStack {
        RouteDestination(route: .eventForm(clientId: "cli-456", date: .now))
    }
}
