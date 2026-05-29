package com.creapolis.solennix.ui.navigation

import androidx.annotation.StringRes
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.ui.graphics.vector.ImageVector
import com.creapolis.solennix.R

enum class TopLevelDestination(
    @StringRes val labelRes: Int,
    val unselectedIcon: ImageVector,
    val selectedIcon: ImageVector,
    val route: String
) {
    HOME(R.string.nav_home, Icons.Default.Home, Icons.Filled.Home, "home"),
    CALENDAR(R.string.nav_calendar, Icons.Default.DateRange, Icons.Filled.DateRange, "calendar"),
    EVENTS(R.string.nav_events, Icons.Default.Celebration, Icons.Filled.Celebration, "events"),
    CLIENTS(R.string.nav_clients, Icons.Default.Person, Icons.Filled.Person, "clients"),
    MORE(R.string.nav_more, Icons.Default.Menu, Icons.Filled.Menu, "more")
}
