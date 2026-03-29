package com.creapolis.solennix.ui.navigation

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.theme.SolennixElevation
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.feature.calendar.ui.CalendarScreen
import com.creapolis.solennix.feature.clients.ui.ClientDetailScreen
import com.creapolis.solennix.feature.clients.ui.ClientListScreen
import com.creapolis.solennix.feature.clients.ui.QuickQuoteScreen
import com.creapolis.solennix.feature.dashboard.ui.DashboardScreen
import com.creapolis.solennix.feature.events.ui.EventChecklistScreen
import com.creapolis.solennix.feature.events.ui.EventDetailScreen
import com.creapolis.solennix.feature.events.ui.EventFormScreen
import com.creapolis.solennix.feature.events.ui.EventListScreen
import com.creapolis.solennix.feature.inventory.ui.InventoryListScreen
import com.creapolis.solennix.feature.products.ui.ProductListScreen
import com.creapolis.solennix.feature.search.ui.SearchScreen
import com.creapolis.solennix.feature.settings.ui.AboutScreen
import com.creapolis.solennix.feature.settings.ui.ChangePasswordScreen
import com.creapolis.solennix.feature.settings.ui.EditProfileScreen
import com.creapolis.solennix.feature.settings.ui.PricingScreen
import com.creapolis.solennix.feature.settings.ui.PrivacyScreen
import com.creapolis.solennix.feature.settings.ui.BusinessSettingsScreen
import com.creapolis.solennix.feature.settings.ui.ContractDefaultsScreen
import com.creapolis.solennix.feature.settings.ui.SettingsScreen
import com.creapolis.solennix.feature.settings.ui.TermsScreen

@Composable
fun CompactBottomNavLayout(initialDeepLinkRoute: String? = null) {
    var selectedDestination by remember { mutableStateOf(TopLevelDestination.HOME) }
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route
    val isAtTopLevel = TopLevelDestination.entries.any { it.route == currentRoute }
    var calendarBlockDatesRequested by remember { mutableStateOf(false) }
    val calendarBlockDatesAction: () -> Unit = { calendarBlockDatesRequested = true }

    // Navegar al deep link despues de que el NavHost se haya inicializado
    LaunchedEffect(initialDeepLinkRoute) {
        initialDeepLinkRoute?.let { route ->
            navController.navigate(route) {
                launchSingleTop = true
            }
        }
    }

    Scaffold(
        bottomBar = {
            NavigationBar(containerColor = SolennixTheme.colors.tabBarBg) {
                TopLevelDestination.entries.forEach { destination ->
                    NavigationBarItem(
                        selected = selectedDestination == destination,
                        onClick = {
                            selectedDestination = destination
                            navController.navigate(destination.route) {
                                popUpTo(navController.graph.startDestinationId) {
                                    saveState = true
                                }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = {
                            Icon(
                                if (selectedDestination == destination) destination.selectedIcon
                                else destination.unselectedIcon,
                                contentDescription = destination.label
                            )
                        },
                        label = { Text(destination.label) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = SolennixTheme.colors.tabBarActive,
                            unselectedIconColor = SolennixTheme.colors.tabBarInactive,
                            indicatorColor = SolennixTheme.colors.primaryLight
                        )
                    )
                }
            }
        },
        floatingActionButton = {
            // Simple FAB on top-level destinations (except More and Calendar)
            val showSimpleFab = isAtTopLevel && currentRoute != TopLevelDestination.MORE.route && currentRoute != TopLevelDestination.CALENDAR.route
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
            if (currentRoute == TopLevelDestination.CALENDAR.route) {
                var expanded by remember { mutableStateOf(false) }

                Column(
                    horizontalAlignment = Alignment.End,
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    // Sub-options (visible when expanded)
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
                                        calendarBlockDatesAction()
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
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = TopLevelDestination.HOME.route,
            modifier = Modifier.padding(padding)
        ) {
            composable(TopLevelDestination.HOME.route) {
                DashboardScreen(
                    viewModel = hiltViewModel(),
                    onEventClick = { id -> navController.navigate("event_detail/$id") },
                    onInventoryClick = { id -> navController.navigate("inventory_detail/$id") },
                    onUpgradeClick = { navController.navigate("pricing") }
                )
            }
            composable(TopLevelDestination.CALENDAR.route) {
                CalendarScreen(
                    viewModel = hiltViewModel(),
                    onEventClick = { id -> navController.navigate("event_detail/$id") },
                    onBlockDatesRequested = calendarBlockDatesRequested,
                    onBlockDatesConsumed = { calendarBlockDatesRequested = false }
                )
            }
            composable(TopLevelDestination.CLIENTS.route) { 
                ClientListScreen(
                    viewModel = hiltViewModel(), 
                    onClientClick = { id -> navController.navigate("client_detail/$id") },
                    onAddClientClick = { navController.navigate("client_form") }
                )
            }
            composable(TopLevelDestination.MORE.route) {
                MoreMenuScreen(
                    onQuoteClick = { navController.navigate("event_form?eventId=") },
                    onQuickQuoteClick = { navController.navigate("quick_quote") },
                    onProductsClick = { navController.navigate("products") },
                    onInventoryClick = { navController.navigate("inventory") },
                    onSearchClick = { navController.navigate("search") },
                    onSettingsClick = { navController.navigate("settings") }
                )
            }

            // More Menu Destinations
            composable("events") {
                EventListScreen(
                    viewModel = hiltViewModel(),
                    onEventClick = { id -> navController.navigate("event_detail/$id") },
                    onNavigateBack = { navController.popBackStack() }
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
            
            composable("product_detail/{productId}") { backStackEntry ->
                val productId = backStackEntry.arguments?.getString("productId")
                com.creapolis.solennix.feature.products.ui.ProductDetailScreen(
                    viewModel = hiltViewModel(),
                    onNavigateBack = { navController.popBackStack() },
                    onEditClick = { id -> navController.navigate("product_form?productId=$id") }
                )
            }
            
            composable("product_form?productId={productId}") { backStackEntry ->
                val productId = backStackEntry.arguments?.getString("productId")
                com.creapolis.solennix.feature.products.ui.ProductFormScreen(
                    viewModel = hiltViewModel(),
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
            
            composable("inventory_detail/{itemId}") { backStackEntry ->
                val itemId = backStackEntry.arguments?.getString("itemId")
                com.creapolis.solennix.feature.inventory.ui.InventoryDetailScreen(
                    viewModel = hiltViewModel(),
                    onNavigateBack = { navController.popBackStack() },
                    onEditClick = { id -> navController.navigate("inventory_form?itemId=$id") }
                )
            }
            
            composable("inventory_form?itemId={itemId}") { backStackEntry ->
                val itemId = backStackEntry.arguments?.getString("itemId")
                com.creapolis.solennix.feature.inventory.ui.InventoryFormScreen(
                    viewModel = hiltViewModel(),
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

            // Settings sub-screens
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

            // Detail routes
            composable("client_detail/{clientId}") {
                ClientDetailScreen(
                    viewModel = hiltViewModel(),
                    onNavigateBack = { navController.popBackStack() },
                    onEditClick = { id -> navController.navigate("client_form?clientId=$id") },
                    onEventClick = { id -> navController.navigate("event_detail/$id") }
                )
            }
            
            composable("client_form?clientId={clientId}") { backStackEntry ->
                val clientId = backStackEntry.arguments?.getString("clientId")
                // Pass it to the ViewModel via SavedStateHandle, handled by Hilt
                com.creapolis.solennix.feature.clients.ui.ClientFormScreen(
                    viewModel = hiltViewModel(),
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            composable("quick_quote?clientId={clientId}") {
                QuickQuoteScreen(
                    viewModel = hiltViewModel(),
                    onNavigateBack = { navController.popBackStack() },
                    onConvertToEvent = { navController.navigate("event_form?eventId=") }
                )
            }

            composable("event_detail/{eventId}") {
                EventDetailScreen(
                    viewModel = hiltViewModel(),
                    onNavigateBack = { navController.popBackStack() },
                    onEditClick = { id -> navController.navigate("event_form?eventId=$id") },
                    onChecklistClick = { id -> navController.navigate("event_checklist/$id") }
                )
            }

            composable("event_checklist/{eventId}") {
                EventChecklistScreen(
                    viewModel = hiltViewModel(),
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            composable("event_form?eventId={eventId}") { backStackEntry ->
                val eventId = backStackEntry.arguments?.getString("eventId")
                EventFormScreen(
                    viewModel = hiltViewModel(),
                    onNavigateBack = { navController.popBackStack() }
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MoreMenuScreen(
    onQuoteClick: () -> Unit,
    onQuickQuoteClick: () -> Unit,
    onProductsClick: () -> Unit,
    onInventoryClick: () -> Unit,
    onSearchClick: () -> Unit,
    onSettingsClick: () -> Unit
) {
    Scaffold(
        topBar = {
            SolennixTopAppBar(title = { Text("Más") })
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp)
        ) {
            Spacer(modifier = Modifier.height(8.dp))
            MenuCard(title = "Cotización", subtitle = "Crea un nuevo evento con cotización", icon = Icons.Default.Receipt, onClick = onQuoteClick)
            MenuCard(title = "Cotización Rápida", subtitle = "Arma una cotización sin registrar cliente", icon = Icons.Default.Bolt, onClick = onQuickQuoteClick)

            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "Catálogo",
                style = MaterialTheme.typography.titleSmall,
                color = SolennixTheme.colors.secondaryText,
                modifier = Modifier.padding(start = 4.dp, bottom = 4.dp)
            )
            MenuCard(title = "Productos", subtitle = "Servicios y artículos que ofreces", icon = Icons.Default.Inventory2, onClick = onProductsClick)
            MenuCard(title = "Inventario", subtitle = "Control de equipos e insumos", icon = Icons.Default.Widgets, onClick = onInventoryClick)

            Spacer(modifier = Modifier.height(8.dp))
            MenuCard(title = "Buscar", subtitle = "Busca en toda la app", icon = Icons.Default.Search, onClick = onSearchClick)
            MenuCard(title = "Configuración", subtitle = "Cuenta, negocio y suscripción", icon = Icons.Default.Settings, onClick = onSettingsClick)
        }
    }
}

@Composable
fun MenuCard(
    title: String,
    subtitle: String = "",
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp)
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card)
    ) {
        Row(modifier = Modifier.padding(20.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, contentDescription = title, tint = SolennixTheme.colors.primary)
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.titleMedium)
                if (subtitle.isNotEmpty()) {
                    Text(
                        subtitle,
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.secondaryText
                    )
                }
            }
            Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = "Ir a $title", tint = SolennixTheme.colors.secondaryText)
        }
    }
}

