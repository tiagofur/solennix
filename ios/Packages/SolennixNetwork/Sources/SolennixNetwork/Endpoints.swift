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

    public static func eventStaff(_ id: String) -> String {
        "/events/\(id)/staff"
    }

    /// Organizer-facing endpoint for the client-portal share link of an event
    /// (PRD/12 feature A). Used by GET (fetch active), POST (create or rotate)
    /// and DELETE (revoke) — same path, different verbs.
    public static func eventPublicLink(_ id: String) -> String {
        "/events/\(id)/public-link"
    }

    // MARK: - Staff (Personal / Colaboradores)

    public static let staff = "/staff"

    public static func staff(_ id: String) -> String {
        "/staff/\(id)"
    }

    /// Reporte de disponibilidad de staff para una fecha o rango.
    /// Consumido via `GET /api/staff/availability?date=YYYY-MM-DD` o
    /// `?start=YYYY-MM-DD&end=YYYY-MM-DD`.
    public static let staffAvailability = "/staff/availability"

    // MARK: - Staff Teams (Cuadrillas)

    public static let staffTeams = "/staff/teams"

    public static func staffTeam(_ id: String) -> String {
        "/staff/teams/\(id)"
    }

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

    // MARK: - Dashboard

    /// Aggregated KPI endpoint — returns counts + totals server-side.
    /// Use this for the dashboard header so the UI can paint immediately
    /// while the underlying list endpoints continue loading.
    public static let dashboardKpis = "/dashboard/kpis"

    /// Revenue chart endpoint — returns `[DashboardRevenuePoint]` with one
    /// entry per month. Query param `period=month|quarter|year` controls the
    /// window (year = last 12 months). The dashboard's 6-month chart takes
    /// the last 6 entries.
    public static let dashboardRevenueChart = "/dashboard/revenue-chart"

    /// Events grouped by status. Query param `scope=month|all` — the
    /// dashboard passes `month` so the status distribution stays consistent
    /// with the rest of the month-scoped KPI cards.
    public static let dashboardEventsByStatus = "/dashboard/events-by-status"

    // MARK: - Search

    public static let search = "/search"

    // MARK: - Uploads

    public static let uploadImage = "/uploads/image"
    public static let uploadPresign = "/uploads/presign"
    public static let uploadComplete = "/uploads/complete"

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
