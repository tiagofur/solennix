package com.creapolis.solennix.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.ui.graphics.vector.ImageVector

/**
 * Sidebar sections for tablet NavigationRail.
 * Order and icons match the web sidebar (Layout.tsx navigation array).
 * QUOTE is special: it navigates to event_form (create new event), not a section root.
 */
enum class SidebarSection(val label: String, val icon: ImageVector, val route: String) {
    DASHBOARD("Dashboard", Icons.Default.Dashboard, "home"),
    CALENDAR("Calendario", Icons.Default.CalendarToday, "calendar"),
    QUOTE("Cotización", Icons.Default.Receipt, "event_form?eventId="),
    QUICK_QUOTE("Cotización Rápida", Icons.Default.Bolt, "quick_quote"),
    CLIENTS("Clientes", Icons.Default.People, "clients"),
    PRODUCTS("Productos", Icons.Default.Inventory2, "products"),
    INVENTORY("Inventario", Icons.Default.Widgets, "inventory"),
    SEARCH("Buscar", Icons.Default.Search, "search"),
    SETTINGS("Configuración", Icons.Default.Settings, "settings")
}
