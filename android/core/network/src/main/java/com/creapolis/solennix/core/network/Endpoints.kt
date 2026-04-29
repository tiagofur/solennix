package com.creapolis.solennix.core.network

object Endpoints {
    // Auth
    const val REGISTER = "auth/register"
    const val LOGIN = "auth/login"
    const val LOGOUT = "auth/logout"
    const val REFRESH = "auth/refresh"
    const val FORGOT_PASSWORD = "auth/forgot-password"
    const val RESET_PASSWORD = "auth/reset-password"
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
    fun staff(id: String) = "staff/$id"
    fun eventStaff(eventId: String) = "events/$eventId/staff"

    // Staff Teams (Equipos)
    const val STAFF_TEAMS = "staff/teams"
    fun staffTeam(id: String) = "staff/teams/$id"

    // Events
    const val EVENTS = "events"
    const val UPCOMING_EVENTS = "events/upcoming"
    fun event(id: String) = "events/$id"
    fun eventProducts(id: String) = "events/$id/products"
    fun eventExtras(id: String) = "events/$id/extras"
    fun eventItems(id: String) = "events/$id/items"
    fun eventEquipment(id: String) = "events/$id/equipment"
    fun eventSupplies(id: String) = "events/$id/supplies"
    fun eventPhotos(id: String) = "events/$id/photos"
    fun eventPhoto(eventId: String, photoId: String) = "events/$eventId/photos/$photoId"
    fun eventPublicLink(eventId: String) = "events/$eventId/public-link"
    const val EQUIPMENT_CONFLICTS = "events/equipment/conflicts"
    const val EQUIPMENT_SUGGESTIONS = "events/equipment/suggestions"
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

    // Event Form Links
    const val EVENT_FORM_LINKS = "event-forms"
    fun eventFormLink(id: String) = "event-forms/$id"

    // Devices
    const val REGISTER_DEVICE = "devices/register"
    const val UNREGISTER_DEVICE = "devices/unregister"
}
