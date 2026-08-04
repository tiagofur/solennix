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
    public static let verifyEmailResend = "/auth/verify-email/resend"
    public static let teamInviteAccept = "/auth/team-invite/accept"
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
    public static let eventsSearch = "/events/search"

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

    /// Dedicated event-photos sub-resource (GET / POST). Replaces the legacy
    /// pattern of rewriting the whole `event.photos` JSON string via PUT
    /// /events/{id}; that shape (an array of bare URL strings) was
    /// incompatible with the backend's object-array schema and silently made
    /// iOS-uploaded photos invisible on web/Android (#1067).
    public static func eventPhotos(_ id: String) -> String {
        "/events/\(id)/photos"
    }

    /// Single event photo (DELETE).
    public static func eventPhoto(_ id: String, _ photoId: String) -> String {
        "/events/\(id)/photos/\(photoId)"
    }

    public static let equipmentConflicts = "/events/equipment/conflicts"
    public static let equipmentSuggestions = "/events/equipment/suggestions"
    public static let equipmentAvailability = "/events/equipment/availability"
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

    public static func staffInvite(_ id: String) -> String {
        "/staff/\(id)/invite"
    }

    public static let staffMyAssignments = "/staff/my-assignments"
    public static let staffMyTimeline = "/staff/my-timeline"
    public static let staffMyTimelineRead = "/staff/my-timeline/read"

    public static func staffRespondAssignment(_ id: String) -> String {
        "/staff/assignments/\(id)/respond"
    }

    /// Execution state del team member (#875). GET devuelve el estado guardado
    /// (o defaults si nunca se guardó); PUT hace upsert.
    public static func staffExecutionState(_ id: String) -> String {
        "/staff/assignments/\(id)/execution-state"
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

    // MARK: - PDF Downloads

    public static func eventPDF(_ eventId: String, type: String) -> String {
        "/events/\(eventId)/pdf/\(type)"
    }

    public static let quickQuotePDF = "/quick-quotes/pdf"

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

    // MARK: - Payment Submissions (organizer review inbox)

    /// GET /payment-submissions — pending submissions for the organizer
    public static let paymentSubmissionsInbox = "/payment-submissions"

    /// PATCH /payment-submissions/{id} — approve or reject a submission
    public static func paymentSubmission(_ id: String) -> String {
        "/payment-submissions/\(id)"
    }

    // MARK: - Public quote requests (organizer inbox, v2 #1121/#1122)

    /// GET /organizers/me/requests — list (cursor or page)
    public static let publicRequests = "/organizers/me/requests"

    /// GET /organizers/me/requests/unread-count
    public static let publicRequestsUnreadCount = "/organizers/me/requests/unread-count"

    /// GET /organizers/me/requests/{id}
    public static func publicRequest(_ id: String) -> String {
        "/organizers/me/requests/\(id)"
    }

    /// POST /organizers/me/requests/{id}/read
    public static func publicRequestRead(_ id: String) -> String {
        "/organizers/me/requests/\(id)/read"
    }

    /// POST /organizers/me/requests/{id}/responses
    public static func publicRequestRespond(_ id: String) -> String {
        "/organizers/me/requests/\(id)/responses"
    }

    /// POST /organizers/me/requests/{id}/decline
    public static func publicRequestDecline(_ id: String) -> String {
        "/organizers/me/requests/\(id)/decline"
    }

    /// POST /organizers/me/requests/{id}/request-info
    public static func publicRequestInfo(_ id: String) -> String {
        "/organizers/me/requests/\(id)/request-info"
    }

    /// POST /organizers/me/requests/{id}/convert-to-event
    public static func publicRequestConvert(_ id: String) -> String {
        "/organizers/me/requests/\(id)/convert-to-event"
    }

    // MARK: - Reviews (organizer inbox)

    public static let reviews = "/reviews"

    public static func reviewResponse(_ id: String) -> String {
        "/reviews/\(id)/response"
    }

    public static func reviewVisibility(_ id: String) -> String {
        "/reviews/\(id)/visibility"
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

    /// Bundled dashboard endpoint — returns KPIs + the 5 chart/widget datasets
    /// (revenue-chart, events-by-status, top-clients, product-demand, forecast)
    /// in a single response. Collapses 6 client round-trips into one (issue #807).
    public static let dashboardSummary = "/dashboard/summary"

    /// Revenue chart endpoint — returns `[DashboardRevenuePoint]` with one
    /// entry per month. Query param `period=month|quarter|year` controls the
    /// window (year = last 12 months). The dashboard's 6-month chart takes
    /// the last 6 entries.
    public static let dashboardRevenueChart = "/dashboard/revenue-chart"

    /// Events grouped by status. Query param `scope=month|all` — the
    /// dashboard passes `month` so the status distribution stays consistent
    /// with the rest of the month-scoped KPI cards.
    public static let dashboardEventsByStatus = "/dashboard/events-by-status"

    /// Top clients by total spent
    public static let dashboardTopClients = "/dashboard/top-clients"

    /// Products by demand (times used)
    public static let dashboardProductDemand = "/dashboard/product-demand"

    /// Revenue forecast by month
    public static let dashboardForecast = "/dashboard/forecast"

    // MARK: - Search

    public static let search = "/search"

    // MARK: - Uploads

    public static let uploadImage = "/uploads/image"
    public static let uploadPresign = "/uploads/presign"
    public static let uploadComplete = "/uploads/complete"

    // MARK: - Profile

    public static let updateProfile = "/users/me"
    public static let deleteAccount = "/users/me"

    // MARK: - Public Profile (organizer settings)

    public static let myPublicProfile = "/users/me/public-profile"
    public static let myPublicProfilePortfolio = "/users/me/public-profile/portfolio"

    public static func myPublicProfilePortfolioItem(_ id: String) -> String {
        "/users/me/public-profile/portfolio/\(id)"
    }

    /// Service multi-select (GET list / PUT selected product IDs).
    public static let myPublicProfileServices = "/users/me/public-profile/services"

    /// Pro+ packages (GET list / POST create).
    public static let myPublicProfilePackages = "/users/me/public-profile/packages"
    public static func myPublicProfilePackage(_ id: String) -> String {
        "/users/me/public-profile/packages/\(id)"
    }

    /// Pro+ FAQ (GET list / POST create).
    public static let myPublicProfileFaq = "/users/me/public-profile/faq"
    public static func myPublicProfileFaqItem(_ id: String) -> String {
        "/users/me/public-profile/faq/\(id)"
    }

    /// Public visitor profile (unauthenticated) — #1126.
    public static func publicOrganizer(_ slug: String) -> String {
        "/public/organizers/\(slug.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? slug)"
    }

    // MARK: - Subscriptions

    public static let subscriptionStatus = "/subscriptions/status"

    // MARK: - Devices

    public static let registerDevice = "/devices/register"
    public static let unregisterDevice = "/devices/unregister"

    // MARK: - Public request links (Solicitudes share links)

    /// GET/POST /organizers/me/request-links
    public static let publicRequestLinks = "/organizers/me/request-links"

    /// DELETE /organizers/me/request-links/{id}
    public static func publicRequestLink(_ id: String) -> String {
        "/organizers/me/request-links/\(id)"
    }

    // MARK: - Live Activities (iOS Dynamic Island remote updates)

    public static let registerLiveActivityToken = "/live-activities/register"

    public static func liveActivityByEvent(_ eventId: String) -> String {
        "/live-activities/by-event/\(eventId)"
    }

}
