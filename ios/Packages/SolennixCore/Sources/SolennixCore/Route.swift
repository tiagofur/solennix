import Foundation

// MARK: - Route

/// All navigable destinations in the app. Used with NavigationPath / .navigationDestination(for:).
public enum Route: Hashable {

    // MARK: Events
    case eventList
    case eventDetail(id: String)
    case eventForm(id: String? = nil, clientId: String? = nil, date: Date? = nil)
    case eventChecklist(id: String)
    case eventFinances(id: String)
    case eventPayments(id: String)
    case eventProducts(id: String)
    case eventExtras(id: String)
    case eventSupplies(id: String)
    case eventEquipment(id: String)
    case eventShoppingList(id: String)
    case eventPhotos(id: String)
    case eventContractPreview(id: String)
    case eventStaff(id: String)

    // Clients
    case clientList
    case clientDetail(id: String)
    case clientForm(id: String? = nil)
    case quickQuote

    // MARK: Staff (Personal / Colaboradores)
    case staffList
    case staffDetail(id: String)
    case staffForm(id: String? = nil)

    // MARK: Staff Teams (Cuadrillas)
    case staffTeamList
    case staffTeamDetail(id: String)
    case staffTeamForm(id: String? = nil)

    // MARK: Products
    case productList
    case productDetail(id: String)
    case productForm(id: String? = nil)

    // MARK: Inventory
    case inventoryList
    case inventoryDetail(id: String)
    case inventoryForm(id: String? = nil)

    // MARK: Tools
    case search(query: String = "")
    case settings

    // MARK: Event Form Links
    case eventFormLinks

    // MARK: Settings Sub-Routes
    case editProfile
    case changePassword
    case businessSettings
    case contractDefaults
    case pricing
    case subscription
    case notificationPreferences
    case about
}
