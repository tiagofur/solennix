import Foundation

// MARK: - Route

/// All navigable destinations in the app. Used with NavigationPath / .navigationDestination(for:).
public enum Route: Hashable {

    // MARK: Events
    case eventList
    case eventDetail(id: String)
    case eventForm(id: String? = nil, clientId: String? = nil, date: Date? = nil)
    case eventChecklist(id: String)

    // Clients
    case clientList
    case clientDetail(id: String)
    case clientForm(id: String? = nil)
    case quickQuote

    // MARK: Products
    case productDetail(id: String)
    case productForm(id: String? = nil)

    // MARK: Inventory
    case inventoryDetail(id: String)
    case inventoryForm(id: String? = nil)

    // MARK: Settings Sub-Routes
    case editProfile
    case changePassword
    case businessSettings
    case contractDefaults
    case pricing
    case about
    case privacy
    case terms
}
