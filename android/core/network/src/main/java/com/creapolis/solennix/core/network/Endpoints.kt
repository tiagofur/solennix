package com.creapolis.solennix.core.network

object Endpoints {
    // Auth
    const val REGISTER = "auth/register"
    const val LOGIN = "auth/login"
    const val LOGOUT = "auth/logout"
    const val REFRESH = "auth/refresh"
    const val FORGOT_PASSWORD = "auth/forgot-password"
    const val RESET_PASSWORD = "auth/reset-password"
    const val VERIFY_EMAIL_RESEND = "auth/verify-email/resend"
    const val TEAM_INVITE_ACCEPT = "auth/team-invite/accept"
    const val ME = "auth/me"
    const val CHANGE_PASSWORD = "auth/change-password"
    const val GOOGLE_AUTH = "auth/google"
    const val APPLE_AUTH = "auth/apple"

    // Clients
    const val CLIENTS = "clients"
    fun client(id: String) = "clients/$id"

    // Staff (Personal / Colaboradores)
    const val STAFF = "staff"
    const val STAFF_AVAILABILITY = "staff/availability"
    const val STAFF_MY_ASSIGNMENTS = "staff/my-assignments"
    const val STAFF_MY_TIMELINE = "staff/my-timeline"
    const val STAFF_MY_TIMELINE_READ = "staff/my-timeline/read"
    fun staff(id: String) = "staff/$id"
    fun staffInvite(id: String) = "staff/$id/invite"
    fun staffRespondAssignment(id: String) = "staff/assignments/$id/respond"
    fun eventStaff(eventId: String) = "events/$eventId/staff"

    // Staff Teams (Equipos)
    const val STAFF_TEAMS = "staff/teams"
    fun staffTeam(id: String) = "staff/teams/$id"

    // Events
    const val EVENTS = "events"
    const val UPCOMING_EVENTS = "events/upcoming"
    const val EVENTS_SEARCH = "events/search"
    const val EVENTS_ICAL = "events/ical"
    fun event(id: String) = "events/$id"
    fun eventProducts(id: String) = "events/$id/products"
    fun eventExtras(id: String) = "events/$id/extras"
    fun eventItems(id: String) = "events/$id/items"
    fun eventEquipment(id: String) = "events/$id/equipment"
    fun eventSupplies(id: String) = "events/$id/supplies"
    fun eventPhotos(id: String) = "events/$id/photos"
    fun eventPhoto(eventId: String, photoId: String) = "events/$eventId/photos/$photoId"
    fun eventPublicLink(eventId: String) = "events/$eventId/public-link"
    fun eventPdf(eventId: String, type: String) = "events/$eventId/pdf/$type"
    const val EQUIPMENT_CONFLICTS = "events/equipment/conflicts"
    const val EQUIPMENT_SUGGESTIONS = "events/equipment/suggestions"
    const val EQUIPMENT_AVAILABILITY = "events/equipment/availability"
    const val SUPPLY_SUGGESTIONS = "events/supplies/suggestions"

    // Products
    const val PRODUCTS = "products"
    fun product(id: String) = "products/$id"
    fun productIngredients(id: String) = "products/$id/ingredients"
    const val BATCH_INGREDIENTS = "products/ingredients/batch"

    // Inventory
    const val INVENTORY = "inventory"
    fun inventoryItem(id: String) = "inventory/$id"

    // Payments
    const val PAYMENTS = "payments"
    fun payment(id: String) = "payments/$id"

    // Quick Quotes
    const val QUICK_QUOTES = "quick-quotes"
    const val QUICK_QUOTES_PDF = "quick-quotes/pdf"

    // Unavailable Dates
    const val UNAVAILABLE_DATES = "unavailable-dates"
    fun unavailableDate(id: String) = "unavailable-dates/$id"

    // Search
    const val SEARCH = "search"

    // Uploads
    const val UPLOAD_IMAGE = "uploads/image"
    const val UPLOAD_PRESIGN = "uploads/presign"
    const val UPLOAD_COMPLETE = "uploads/complete"

    // Profile
    const val UPDATE_PROFILE = "users/me"

    // Subscriptions
    const val SUBSCRIPTION_STATUS = "subscriptions/status"

    // Dashboard (aggregated, server-computed)
    const val DASHBOARD_KPIS = "dashboard/kpis"
    const val DASHBOARD_REVENUE_CHART = "dashboard/revenue-chart"
    const val DASHBOARD_EVENTS_BY_STATUS = "dashboard/events-by-status"
    const val DASHBOARD_TOP_CLIENTS = "dashboard/top-clients"
    const val DASHBOARD_PRODUCT_DEMAND = "dashboard/product-demand"
    const val DASHBOARD_FORECAST = "dashboard/forecast"

    // Event Form Links
    const val EVENT_FORM_LINKS = "event-forms"
    fun eventFormLink(id: String) = "event-forms/$id"

    // Reviews (organizer inbox)
    const val REVIEWS = "reviews"
    fun reviewResponse(id: String) = "reviews/$id/response"
    fun reviewVisibility(id: String) = "reviews/$id/visibility"

    // Devices
    const val REGISTER_DEVICE = "devices/register"
    const val UNREGISTER_DEVICE = "devices/unregister"
}
