import Foundation

/// Centralized API endpoint definitions for all Solennix API routes.
public enum Endpoint {

    // MARK: - Auth

    public static let register = "/auth/register"
    public static let login = "/auth/login"
    public static let logout = "/auth/logout"
    public static let refresh = "/auth/refresh"
    public static let forgotPassword = "/auth/forgot-password"
    public static let resetPassword = "/auth/reset-password"
    public static let me = "/auth/me"
    public static let changePassword = "/auth/change-password"
    public static let appleAuth = "/auth/apple"
    public static let googleAuth = "/auth/google"

    // MARK: - Clients

    public static let clients = "/clients"

    public static func client(_ id: String) -> String {
        "/clients/\(id)"
    }

    // MARK: - Events

    public static let events = "/events"
    public static let upcomingEvents = "/events/upcoming"

    public static func event(_ id: String) -> String {
        "/events/\(id)"
    }

    public static func eventProducts(_ id: String) -> String {
        "/events/\(id)/products"
    }

    public static func eventExtras(_ id: String) -> String {
        "/events/\(id)/extras"
    }

    public static func eventItems(_ id: String) -> String {
        "/events/\(id)/items"
    }

    public static func eventEquipment(_ id: String) -> String {
        "/events/\(id)/equipment"
    }

    public static func eventSupplies(_ id: String) -> String {
        "/events/\(id)/supplies"
    }

    public static let equipmentConflicts = "/events/equipment/conflicts"
    public static let equipmentSuggestions = "/events/equipment/suggestions"
    public static let supplySuggestions = "/events/supplies/suggestions"

    // MARK: - Products

    public static let products = "/products"

    public static func product(_ id: String) -> String {
        "/products/\(id)"
    }

    public static func productIngredients(_ id: String) -> String {
        "/products/\(id)/ingredients"
    }

    public static let batchIngredients = "/products/ingredients/batch"

    // MARK: - Inventory

    public static let inventory = "/inventory"

    public static func inventoryItem(_ id: String) -> String {
        "/inventory/\(id)"
    }

    // MARK: - Payments

    public static let payments = "/payments"

    public static func payment(_ id: String) -> String {
        "/payments/\(id)"
    }

    // MARK: - Unavailable Dates

    public static let unavailableDates = "/unavailable-dates"

    public static func unavailableDate(_ id: String) -> String {
        "/unavailable-dates/\(id)"
    }

    // MARK: - Search

    public static let search = "/search"

    // MARK: - Uploads

    public static let uploadImage = "/uploads/image"

    // MARK: - Profile

    public static let updateProfile = "/users/me"

    // MARK: - Subscriptions

    public static let subscriptionStatus = "/subscriptions/status"

    // MARK: - Devices

    public static let registerDevice = "/devices/register"
    public static let unregisterDevice = "/devices/unregister"

    // MARK: - Event Form Links

    public static let eventFormLinks = "/event-forms"

    public static func eventFormLink(_ id: String) -> String {
        "/event-forms/\(id)"
    }

    // MARK: - Live Activities (iOS Dynamic Island remote updates)

    public static let registerLiveActivityToken = "/live-activities/register"

    public static func liveActivityByEvent(_ eventId: String) -> String {
        "/live-activities/by-event/\(eventId)"
    }
}
