package com.creapolis.solennix.ui.navigation

import androidx.annotation.StringRes
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.ui.graphics.vector.ImageVector
import com.creapolis.solennix.R

/**
 * Sidebar sections for tablet NavigationRail.
 * 7 items: 6 main sections + settings at bottom.
 * Cotización, Cotización Rápida, and Search removed — now accessible via
 * contextual buttons (FAB/toolbar) and search bar in TopAppBar.
 */
enum class SidebarSection(@StringRes val labelRes: Int, val icon: ImageVector, val route: String) {
    DASHBOARD(R.string.nav_home, Icons.Default.Dashboard, "home"),
    CALENDAR(R.string.nav_calendar, Icons.Default.CalendarToday, "calendar"),
    EVENTS(R.string.nav_events, Icons.Default.Celebration, "events"),
    CLIENTS(R.string.nav_clients, Icons.Default.People, "clients"),
    PRODUCTS(R.string.nav_products, Icons.Default.Inventory2, "products"),
    INVENTORY(R.string.nav_inventory, Icons.Default.Widgets, "inventory"),
    SETTINGS(R.string.nav_settings, Icons.Default.Settings, "settings")
}
