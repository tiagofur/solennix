package com.creapolis.solennix.ui.navigation

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.Description
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.creapolis.solennix.core.designsystem.theme.LocalIsWideScreen
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.creapolis.solennix.core.designsystem.theme.SolennixElevation
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.designsystem.theme.SolennixTitle
import com.creapolis.solennix.feature.calendar.ui.CalendarScreen
import com.creapolis.solennix.feature.clients.ui.ClientDetailScreen
import com.creapolis.solennix.feature.clients.ui.ClientFormScreen
import com.creapolis.solennix.feature.clients.ui.ClientListScreen
import com.creapolis.solennix.feature.clients.ui.QuickQuoteScreen
import com.creapolis.solennix.feature.dashboard.ui.DashboardScreen
import com.creapolis.solennix.feature.events.ui.EventChecklistScreen
import com.creapolis.solennix.feature.events.ui.EventDetailScreen
import com.creapolis.solennix.feature.events.ui.EventFormScreen
import com.creapolis.solennix.feature.events.ui.EventListScreen
import com.creapolis.solennix.feature.inventory.ui.InventoryDetailScreen
import com.creapolis.solennix.feature.inventory.ui.InventoryFormScreen
import com.creapolis.solennix.feature.inventory.ui.InventoryListScreen
import com.creapolis.solennix.feature.products.ui.ProductDetailScreen
import com.creapolis.solennix.feature.products.ui.ProductFormScreen
import com.creapolis.solennix.feature.products.ui.ProductListScreen
import com.creapolis.solennix.feature.search.ui.SearchScreen
import com.creapolis.solennix.feature.settings.ui.AboutScreen
import com.creapolis.solennix.feature.settings.ui.BusinessSettingsScreen
import com.creapolis.solennix.feature.settings.ui.ChangePasswordScreen
import com.creapolis.solennix.feature.settings.ui.ContractDefaultsScreen
import com.creapolis.solennix.feature.settings.ui.EditProfileScreen
import com.creapolis.solennix.feature.settings.ui.PricingScreen
import com.creapolis.solennix.feature.settings.ui.PrivacyScreen
import com.creapolis.solennix.feature.settings.ui.SettingsScreen
import com.creapolis.solennix.feature.settings.ui.TermsScreen

@Composable
fun AdaptiveNavigationRailLayout(initialDeepLinkRoute: String? = null) {
    var selectedSection by remember { mutableStateOf(SidebarSection.DASHBOARD) }
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route
    var calendarBlockDatesRequested by remember { mutableStateOf(false) }

    // Navigate to deep link after NavHost is initialized
    LaunchedEffect(initialDeepLinkRoute) {
        initialDeepLinkRoute?.let { route ->
            navController.navigate(route) {
                launchSingleTop = true
            }
        }
    }

    // Sync selectedSection with actual navigation to prevent desync
    LaunchedEffect(currentRoute) {
        val matchingSection = SidebarSection.entries.find { section ->
            currentRoute == section.route || currentRoute?.startsWith(section.route + "/") == true
        }
        if (matchingSection != null && matchingSection != selectedSection) {
            selectedSection = matchingSection
        }
    }

    // Determine if we are at a section-level route (for FAB visibility)
    val sectionRoutes = SidebarSection.entries.map { it.route }.toSet()
    val isAtSectionLevel = currentRoute in sectionRoutes

    CompositionLocalProvider(LocalIsWideScreen provides true) {
    Row(Modifier.fillMaxSize()) {
        NavigationRail(
            containerColor = SolennixTheme.colors.card,
            header = {
                Text(
                    text = "S",
                    style = SolennixTitle,
                    color = SolennixTheme.colors.primary,
                    modifier = Modifier.padding(vertical = 16.dp)
                )
            }
        ) {
            SidebarSection.entries.forEach { section ->
                NavigationRailItem(
                    selected = selectedSection == section,
                    onClick = {
                        selectedSection = section
                        navController.navigate(section.route) {
                            popUpTo(navController.graph.startDestinationId) {
                                saveState = true
                            }
                            launchSingleTop = true
                            // Don't restore state for QUOTE — always open fresh form
                            if (section != SidebarSection.QUOTE) {
                                restoreState = true
                            }
                        }
                    },
                    icon = { Icon(section.icon, section.label) },
                    label = { Text(section.label) },
                    colors = NavigationRailItemDefaults.colors(
                        selectedIconColor = SolennixTheme.colors.primary,
                        unselectedIconColor = SolennixTheme.colors.secondaryText,
                        indicatorColor = SolennixTheme.colors.primaryLight
                    )
                )
            }
        }

        // Content area with NavHost
        Scaffold(
            floatingActionButton = {
                // Simple FAB on section-level routes (except calendar, search, quick_quote, and settings)
                val showSimpleFab = isAtSectionLevel
                    && currentRoute != "calendar"
                    && currentRoute != "search"
                    && currentRoute != "quick_quote"
                    && currentRoute != "settings"

                if (showSimpleFab) {
                    FloatingActionButton(
                        onClick = { navController.navigate("event_form?eventId=") },
                        containerColor = SolennixTheme.colors.primary,
                        elevation = FloatingActionButtonDefaults.elevation(
                            defaultElevation = SolennixElevation.fab
                        )
                    ) {
                        Icon(Icons.Filled.Add, "Nuevo Evento", tint = Color.White)
                    }
                }

                // Expandable FAB for Calendar
                if (currentRoute == "calendar") {
                    var expanded by remember { mutableStateOf(false) }

                    Column(
                        horizontalAlignment = Alignment.End,
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        AnimatedVisibility(
                            visible = expanded,
                            enter = fadeIn() + slideInVertically(initialOffsetY = { it }),
                            exit = fadeOut() + slideOutVertically(targetOffsetY = { it })
                        ) {
                            Column(
                                horizontalAlignment = Alignment.End,
                                verticalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                // Block dates option
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Surface(
                                        shape = RoundedCornerShape(8.dp),
                                        color = SolennixTheme.colors.card,
                                        shadowElevation = 2.dp
                                    ) {
                                        Text(
                                            "Bloquear Fechas",
                                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                            style = MaterialTheme.typography.labelMedium,
                                            color = SolennixTheme.colors.primaryText
                                        )
                                    }
                                    SmallFloatingActionButton(
                                        onClick = {
                                            expanded = false
                                            calendarBlockDatesRequested = true
                                        },
                                        containerColor = SolennixTheme.colors.primary,
                                        contentColor = Color.White
                                    ) {
                                        Icon(Icons.Default.Block, contentDescription = "Bloquear Fechas")
                                    }
                                }

                                // New event option
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    Surface(
                                        shape = RoundedCornerShape(8.dp),
                                        color = SolennixTheme.colors.card,
                                        shadowElevation = 2.dp
                                    ) {
                                        Text(
                                            "Nuevo Evento",
                                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                            style = MaterialTheme.typography.labelMedium,
                                            color = SolennixTheme.colors.primaryText
                                        )
                                    }
                                    SmallFloatingActionButton(
                                        onClick = {
                                            expanded = false
                                            navController.navigate("event_form?eventId=")
                                        },
                                        containerColor = SolennixTheme.colors.primary,
                                        contentColor = Color.White
                                    ) {
                                        Icon(Icons.Filled.Add, contentDescription = "Nuevo Evento")
                                    }
                                }
                            }
                        }

                        // Main FAB (toggle)
                        FloatingActionButton(
                            onClick = { expanded = !expanded },
                            containerColor = SolennixTheme.colors.primary,
                            elevation = FloatingActionButtonDefaults.elevation(
                                defaultElevation = SolennixElevation.fab
                            )
                        ) {
                            Icon(
                                if (expanded) Icons.Default.Close else Icons.Filled.Add,
                                contentDescription = if (expanded) "Cerrar menú" else "Opciones",
                                tint = Color.White
                            )
                        }
                    }
                }
            },
            floatingActionButtonPosition = FabPosition.End
        ) { innerPadding ->
            NavHost(
                navController = navController,
                startDestination = "home",
                modifier = Modifier.padding(innerPadding)
            ) {
                // ── Top-level section screens ──
                composable("home") {
                    DashboardScreen(
                        viewModel = hiltViewModel(),
                        onEventClick = { id -> navController.navigate("event_detail/$id") },
                        onInventoryClick = { id -> navController.navigate("inventory_detail/$id") },
                        onUpgradeClick = { navController.navigate("pricing") },
                        onNewEventClick = { navController.navigate("event_form?eventId=") },
                        onNewClientClick = { navController.navigate("client_form") },
                        onQuickQuoteClick = { navController.navigate("quick_quote") },
                        onSearchClick = { navController.navigate("search") }
                    )
                }
                composable("calendar") {
                    CalendarScreen(
                        viewModel = hiltViewModel(),
                        onEventClick = { id -> navController.navigate("event_detail/$id") },
                        onBlockDatesRequested = calendarBlockDatesRequested,
                        onBlockDatesConsumed = { calendarBlockDatesRequested = false }
                    )
                }
                composable("clients") {
                    ClientListScreen(
                        viewModel = hiltViewModel(),
                        onClientClick = { id -> navController.navigate("client_detail/$id") },
                        onAddClientClick = { navController.navigate("client_form") }
                    )
                }
                composable("products") {
                    ProductListScreen(
                        viewModel = hiltViewModel(),
                        onProductClick = { id -> navController.navigate("product_detail/$id") },
                        onAddProductClick = { navController.navigate("product_form") },
                        onNavigateBack = { navController.popBackStack() }
                    )
                }
                composable("inventory") {
                    InventoryListScreen(
                        viewModel = hiltViewModel(),
                        onItemClick = { id -> navController.navigate("inventory_detail/$id") },
                        onAddItemClick = { navController.navigate("inventory_form") },
                        onNavigateBack = { navController.popBackStack() }
                    )
                }
                composable("search") {
                    SearchScreen(
                        viewModel = hiltViewModel(),
                        onClientClick = { id -> navController.navigate("client_detail/$id") },
                        onEventClick = { id -> navController.navigate("event_detail/$id") },
                        onProductClick = { id -> navController.navigate("product_detail/$id") },
                        onInventoryClick = { id -> navController.navigate("inventory_detail/$id") },
                        onNavigateBack = { navController.popBackStack() }
                    )
                }
                composable("settings") {
                    SettingsScreen(
                        viewModel = hiltViewModel(),
                        onEditProfile = { navController.navigate("edit_profile") },
                        onChangePassword = { navController.navigate("change_password") },
                        onBusinessSettings = { navController.navigate("business_settings") },
                        onContractDefaults = { navController.navigate("contract_defaults") },
                        onPricing = { navController.navigate("pricing") },
                        onAbout = { navController.navigate("about") },
                        onPrivacy = { navController.navigate("privacy") },
                        onTerms = { navController.navigate("terms") },
                        onNavigateBack = { navController.popBackStack() }
                    )
                }

                // ── Events ──
                composable("events") {
                    EventListScreen(
                        viewModel = hiltViewModel(),
                        onEventClick = { id -> navController.navigate("event_detail/$id") },
                        onNavigateBack = { navController.popBackStack() }
                    )
                }
                composable(
                    "event_detail/{eventId}",
                    arguments = listOf(navArgument("eventId") { type = NavType.StringType })
                ) {
                    EventDetailScreen(
                        viewModel = hiltViewModel(),
                        onNavigateBack = { navController.popBackStack() },
                        onEditClick = { id -> navController.navigate("event_form?eventId=$id") },
                        onChecklistClick = { id -> navController.navigate("event_checklist/$id") }
                    )
                }
                composable(
                    "event_form?eventId={eventId}",
                    arguments = listOf(navArgument("eventId") { type = NavType.StringType; nullable = true; defaultValue = null })
                ) {
                    EventFormScreen(
                        viewModel = hiltViewModel(),
                        onNavigateBack = { navController.popBackStack() }
                    )
                }
                composable(
                    "event_checklist/{eventId}",
                    arguments = listOf(navArgument("eventId") { type = NavType.StringType })
                ) {
                    EventChecklistScreen(
                        viewModel = hiltViewModel(),
                        onNavigateBack = { navController.popBackStack() }
                    )
                }

                // ── Clients ──
                composable(
                    "client_detail/{clientId}",
                    arguments = listOf(navArgument("clientId") { type = NavType.StringType })
                ) {
                    ClientDetailScreen(
                        viewModel = hiltViewModel(),
                        onNavigateBack = { navController.popBackStack() },
                        onEditClick = { id -> navController.navigate("client_form?clientId=$id") },
                        onEventClick = { id -> navController.navigate("event_detail/$id") }
                    )
                }
                composable(
                    "client_form?clientId={clientId}",
                    arguments = listOf(navArgument("clientId") { type = NavType.StringType; nullable = true; defaultValue = null })
                ) {
                    ClientFormScreen(
                        viewModel = hiltViewModel(),
                        onNavigateBack = { navController.popBackStack() }
                    )
                }

                // ── Products ──
                composable(
                    "product_detail/{productId}",
                    arguments = listOf(navArgument("productId") { type = NavType.StringType })
                ) {
                    ProductDetailScreen(
                        viewModel = hiltViewModel(),
                        onNavigateBack = { navController.popBackStack() },
                        onEditClick = { id -> navController.navigate("product_form?productId=$id") }
                    )
                }
                composable(
                    "product_form?productId={productId}",
                    arguments = listOf(navArgument("productId") { type = NavType.StringType; nullable = true; defaultValue = null })
                ) {
                    ProductFormScreen(
                        viewModel = hiltViewModel(),
                        onNavigateBack = { navController.popBackStack() }
                    )
                }

                // ── Inventory ──
                composable(
                    "inventory_detail/{itemId}",
                    arguments = listOf(navArgument("itemId") { type = NavType.StringType })
                ) {
                    InventoryDetailScreen(
                        viewModel = hiltViewModel(),
                        onNavigateBack = { navController.popBackStack() },
                        onEditClick = { id -> navController.navigate("inventory_form?itemId=$id") }
                    )
                }
                composable(
                    "inventory_form?itemId={itemId}",
                    arguments = listOf(navArgument("itemId") { type = NavType.StringType; nullable = true; defaultValue = null })
                ) {
                    InventoryFormScreen(
                        viewModel = hiltViewModel(),
                        onNavigateBack = { navController.popBackStack() }
                    )
                }

                // ── Settings sub-screens ──
                composable("edit_profile") {
                    EditProfileScreen(
                        viewModel = hiltViewModel(),
                        onNavigateBack = { navController.popBackStack() }
                    )
                }
                composable("change_password") {
                    ChangePasswordScreen(
                        viewModel = hiltViewModel(),
                        onNavigateBack = { navController.popBackStack() }
                    )
                }
                composable("business_settings") {
                    BusinessSettingsScreen(
                        viewModel = hiltViewModel(),
                        onNavigateBack = { navController.popBackStack() }
                    )
                }
                composable("contract_defaults") {
                    ContractDefaultsScreen(
                        viewModel = hiltViewModel(),
                        onNavigateBack = { navController.popBackStack() }
                    )
                }
                composable("pricing") {
                    PricingScreen(
                        viewModel = hiltViewModel(),
                        onNavigateBack = { navController.popBackStack() }
                    )
                }
                composable("about") {
                    AboutScreen(
                        onNavigateBack = { navController.popBackStack() }
                    )
                }
                composable("privacy") {
                    PrivacyScreen(
                        onNavigateBack = { navController.popBackStack() }
                    )
                }
                composable("terms") {
                    TermsScreen(
                        onNavigateBack = { navController.popBackStack() }
                    )
                }

                // ── Quick Quote ──
                composable(
                    "quick_quote?clientId={clientId}",
                    arguments = listOf(navArgument("clientId") { type = NavType.StringType; nullable = true; defaultValue = null })
                ) {
                    QuickQuoteScreen(
                        viewModel = hiltViewModel(),
                        onNavigateBack = { navController.popBackStack() },
                        onConvertToEvent = { navController.navigate("event_form?eventId=") }
                    )
                }
            }
        }
    }
    } // CompositionLocalProvider
}
