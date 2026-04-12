package com.creapolis.solennix.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.ui.graphics.vector.ImageVector

enum class TopLevelDestination(
    val label: String,
    val unselectedIcon: ImageVector,
    val selectedIcon: ImageVector,
    val route: String
) {
    HOME("Inicio", Icons.Default.Home, Icons.Filled.Home, "home"),
    CALENDAR("Calendario", Icons.Default.DateRange, Icons.Filled.DateRange, "calendar"),
    EVENTS("Eventos", Icons.Default.Celebration, Icons.Filled.Celebration, "events"),
    CLIENTS("Clientes", Icons.Default.Person, Icons.Filled.Person, "clients"),
    MORE("Más", Icons.Default.Menu, Icons.Filled.Menu, "more")
}
