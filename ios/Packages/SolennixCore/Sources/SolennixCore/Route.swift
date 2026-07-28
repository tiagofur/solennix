import Foundation

// MARK: - Route

/// All navigable destinations in the app. Used with NavigationPath / .navigationDestination(for:).
///
/// `Codable` is synthesized (every associated value is `String` / `String?` /
/// `Date?` / `Int?`, all Codable) so a `NavigationPath` containing these routes
/// can be persisted to `@SceneStorage` via `NavigationPath.CodableRepresentation`
/// for relaunch state restoration (Sprint 3 — `ios-lifecycle` PR-B).
public enum Route: Hashable, Codable {

    // MARK: Events
    case eventList
    case eventDetail(id: String)
    case eventForm(id: String? = nil, clientId: String? = nil, date: Date? = nil, step: Int? = nil)
    case eventChecklist(id: String)
    case eventFinances(id: String)
    case eventPayments(id: String)
    case eventProducts(id: String)
    case eventExtras(id: String)
    case eventSupplies(id: String)
    case eventEquipment(id: String)
    case eventShoppingList(id: String)
    case eventPurchaseChecklist(id: String)
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

    // MARK: Payment Submissions (organizer inbox)
    case paymentInbox

    // MARK: Reviews (organizer inbox)
    case reviews

    // MARK: Settings Sub-Routes
    case editProfile
    case changePassword
    case businessSettings
    case publicProfileSettings
    case contractDefaults
    case pricing
    case subscription
    case notificationPreferences
    case calendarSyncPreferences
    case about
    case deleteAccount
}
