package com.creapolis.solennix.ui.navigation

import android.net.Uri
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FabPosition
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.creapolis.solennix.core.designsystem.component.QuickActionsFAB
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.feature.calendar.ui.CalendarScreen
import com.creapolis.solennix.feature.clients.ui.ClientDetailScreen
import com.creapolis.solennix.feature.clients.ui.ClientFormScreen
import com.creapolis.solennix.feature.clients.ui.ClientListScreen
import com.creapolis.solennix.feature.clients.ui.QuickQuoteScreen
import com.creapolis.solennix.feature.dashboard.ui.DashboardScreen
import com.creapolis.solennix.feature.events.ui.EventChecklistScreen
import com.creapolis.solennix.feature.events.ui.EventContractPreviewScreen
import com.creapolis.solennix.feature.events.ui.EventDetailScreen
import com.creapolis.solennix.feature.events.ui.EventEquipmentScreen
import com.creapolis.solennix.feature.events.ui.EventExtrasScreen
import com.creapolis.solennix.feature.events.ui.EventFinancesScreen
import com.creapolis.solennix.feature.events.ui.EventFormScreen
import com.creapolis.solennix.feature.events.ui.EventListScreen
import com.creapolis.solennix.feature.events.ui.EventPaymentsScreen
import com.creapolis.solennix.feature.events.ui.EventPhotosScreen
import com.creapolis.solennix.feature.events.ui.EventProductsScreen
import com.creapolis.solennix.feature.events.ui.EventShoppingListScreen
import com.creapolis.solennix.feature.events.ui.EventSuppliesScreen
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
import com.creapolis.solennix.feature.settings.ui.PrivacyScreen
import com.creapolis.solennix.feature.settings.ui.SettingsScreen
import com.creapolis.solennix.feature.settings.ui.SubscriptionScreen
import com.creapolis.solennix.feature.settings.ui.EventFormLinksScreen
import com.creapolis.solennix.feature.settings.ui.TermsScreen

@Composable
fun CompactBottomNavLayout(initialDeepLinkRoute: String? = null) {
    var selectedDestination by remember { mutableStateOf(TopLevelDestination.HOME) }
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    LaunchedEffect(initialDeepLinkRoute) {
        initialDeepLinkRoute?.let { route ->
            navController.navigate(route) {
                launchSingleTop = true
            }
        }
    }

    val isAtTopLevel = TopLevelDestination.entries.any { it.route == currentRoute }

    Scaffold(
        bottomBar = {
            NavigationBar(containerColor = SolennixTheme.colors.tabBarBg) {
                TopLevelDestination.entries.forEach { destination ->
                    NavigationBarItem(
                        selected = selectedDestination == destination,
                        onClick = {
                            selectedDestination = destination
                            navController.navigate(destination.route) {
                                popUpTo(navController.graph.startDestinationId) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = {
                            Icon(
                                if (selectedDestination == destination) destination.selectedIcon else destination.unselectedIcon,
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
            val showQuickActions = isAtTopLevel &&
                currentRoute != TopLevelDestination.MORE.route &&
                currentRoute != TopLevelDestination.CLIENTS.route
            if (showQuickActions) {
                QuickActionsFAB(
                    onNewEventClick = { navController.navigate("event_form?eventId=") },
                    onQuickQuoteClick = { navController.navigate("quick_quote") }
                )
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
                    onUpgradeClick = { navController.navigate("pricing") },
                    onNewEventClick = { navController.navigate("event_form?eventId=") },
                    onNewClientClick = { navController.navigate("client_form") },
                    onSearchClick = { navController.navigate(buildSearchRoute()) },
                    onOnboardingAction = { action ->
                        when (action) {
                            "clients" -> navController.navigate("client_form")
                            "products" -> navController.navigate("product_form")
                            "events" -> navController.navigate("event_form?eventId=")
                        }
                    }
                )
            }

            composable(TopLevelDestination.CALENDAR.route) {
                CalendarScreen(
                    viewModel = hiltViewModel(),
                    onEventClick = { id -> navController.navigate("event_detail/$id") },
                    onSearchClick = { navController.navigate(buildSearchRoute()) }
                )
            }

            composable(TopLevelDestination.EVENTS.route) {
                EventListScreen(
                    viewModel = hiltViewModel(),
                    onEventClick = { id -> navController.navigate("event_detail/$id") },
                    onNavigateBack = { navController.popBackStack() },
                    onSearchClick = { navController.navigate(buildSearchRoute()) },
                    showBackButton = false
                )
            }

            composable(TopLevelDestination.CLIENTS.route) {
                ClientListScreen(
                    viewModel = hiltViewModel(),
                    onClientClick = { id -> navController.navigate("client_detail/$id") },
                    onSearchClick = { navController.navigate(buildSearchRoute()) },
                    onAddClientClick = { navController.navigate("client_form") }
                )
            }

            composable(TopLevelDestination.MORE.route) {
                MoreMenuScreen(
                    onProductsClick = { navController.navigate("products") },
                    onInventoryClick = { navController.navigate("inventory") },
                    onSettingsClick = { navController.navigate("settings") }
                )
            }

            composable("search?query={query}", arguments = listOf(navArgument("query") {
                type = NavType.StringType
                nullable = true
                defaultValue = null
            })) { backStackEntry ->
                SearchScreen(
                    viewModel = hiltViewModel(),
                    initialQuery = backStackEntry.arguments?.getString("query")?.let(Uri::decode),
                    onClientClick = { id -> navController.navigate("client_detail/$id") },
                    onEventClick = { id -> navController.navigate("event_detail/$id") },
                    onProductClick = { id -> navController.navigate("product_detail/$id") },
                    onInventoryClick = { id -> navController.navigate("inventory_detail/$id") },
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            composable("products") {
                ProductListScreen(
                    viewModel = hiltViewModel(),
                    onProductClick = { id -> navController.navigate("product_detail/$id") },
                    onAddProductClick = { navController.navigate("product_form") },
                    onEditProduct = { id -> navController.navigate("product_form?productId=$id") },
                    onSearchClick = { navController.navigate(buildSearchRoute()) },
                    onNavigateBack = { navController.popBackStack() }
                )
            }
            composable("product_detail/{productId}") {
                ProductDetailScreen(
                    viewModel = hiltViewModel(),
                    onSearchClick = { navController.navigate(buildSearchRoute()) },
                    onNavigateBack = { navController.popBackStack() },
                    onEditClick = { id -> navController.navigate("product_form?productId=$id") }
                )
            }
            composable("product_form?productId={productId}") {
                ProductFormScreen(
                    viewModel = hiltViewModel(),
                    onSearchClick = { navController.navigate(buildSearchRoute()) },
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            composable("inventory") {
                InventoryListScreen(
                    viewModel = hiltViewModel(),
                    onItemClick = { id -> navController.navigate("inventory_detail/$id") },
                    onEditItem = { id -> navController.navigate("inventory_form?itemId=$id") },
                    onAddItemClick = { navController.navigate("inventory_form") },
                    onSearchClick = { navController.navigate(buildSearchRoute()) },
                    onNavigateBack = { navController.popBackStack() }
                )
            }
            composable("inventory_detail/{itemId}") {
                InventoryDetailScreen(
                    viewModel = hiltViewModel(),
                    onSearchClick = { navController.navigate(buildSearchRoute()) },
                    onNavigateBack = { navController.popBackStack() },
                    onEditClick = { id -> navController.navigate("inventory_form?itemId=$id") }
                )
            }
            composable("inventory_form?itemId={itemId}") {
                InventoryFormScreen(
                    viewModel = hiltViewModel(),
                    onSearchClick = { navController.navigate(buildSearchRoute()) },
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
                    onEventFormLinks = { navController.navigate("event_form_links") },
                    onAbout = { navController.navigate("about") },
                    onPrivacy = { navController.navigate("privacy") },
                    onTerms = { navController.navigate("terms") },
                    onSearchClick = { navController.navigate(buildSearchRoute()) },
                    onNavigateBack = { navController.popBackStack() }
                )
            }
            composable("edit_profile") {
                EditProfileScreen(viewModel = hiltViewModel(), onNavigateBack = { navController.popBackStack() })
            }
            composable("change_password") {
                ChangePasswordScreen(viewModel = hiltViewModel(), onNavigateBack = { navController.popBackStack() })
            }
            composable("business_settings") {
                BusinessSettingsScreen(viewModel = hiltViewModel(), onNavigateBack = { navController.popBackStack() })
            }
            composable("contract_defaults") {
                ContractDefaultsScreen(viewModel = hiltViewModel(), onNavigateBack = { navController.popBackStack() })
            }
            composable("pricing") {
                // "pricing" route now renders the real subscription flow with dynamic
                // RevenueCat packages, restore purchases and provider-aware cancel
                // instructions. The legacy PricingScreen (static marketing copy with a
                // broken upgrade button) was removed in Bloque C.
                SubscriptionScreen(
                    viewModel = hiltViewModel(),
                    onNavigateBack = { navController.popBackStack() }
                )
            }
            composable("event_form_links") {
                EventFormLinksScreen(
                    viewModel = hiltViewModel(),
                    onNavigateBack = { navController.popBackStack() }
                )
            }
            composable("about") {
                AboutScreen(onNavigateBack = { navController.popBackStack() })
            }
            composable("privacy") {
                PrivacyScreen(onNavigateBack = { navController.popBackStack() })
            }
            composable("terms") {
                TermsScreen(onNavigateBack = { navController.popBackStack() })
            }

            composable("client_detail/{clientId}") {
                ClientDetailScreen(
                    viewModel = hiltViewModel(),
                    onNavigateBack = { navController.popBackStack() },
                    onEditClick = { id -> navController.navigate("client_form?clientId=$id") },
                    onSearchClick = { navController.navigate(buildSearchRoute()) },
                    onEventClick = { id -> navController.navigate("event_detail/$id") }
                )
            }
            composable("client_form?clientId={clientId}") {
                ClientFormScreen(
                    viewModel = hiltViewModel(),
                    onSearchClick = { navController.navigate(buildSearchRoute()) },
                    onNavigateBack = { navController.popBackStack() }
                )
            }

            composable("quick_quote?clientId={clientId}", arguments = listOf(navArgument("clientId") {
                type = NavType.StringType
                nullable = true
                defaultValue = null
            })) {
                QuickQuoteScreen(
                    viewModel = hiltViewModel(),
                    onNavigateBack = { navController.popBackStack() },
                    onSearchClick = { navController.navigate(buildSearchRoute()) },
                    onConvertToEvent = { navController.navigate("event_form?eventId=") }
                )
            }

            composable("event_detail/{eventId}") {
                EventDetailScreen(
                    viewModel = hiltViewModel(),
                    onNavigateBack = { navController.popBackStack() },
                    onEditClick = { id -> navController.navigate("event_form?eventId=$id") },
                    onSearchClick = { navController.navigate(buildSearchRoute()) },
                    onChecklistClick = { id -> navController.navigate("event_checklist/$id") },
                    onFinancesClick = { id -> navController.navigate("event_finances/$id") },
                    onPaymentsClick = { id -> navController.navigate("event_payments/$id") },
                    onProductsClick = { id -> navController.navigate("event_products/$id") },
                    onExtrasClick = { id -> navController.navigate("event_extras/$id") },
                    onEquipmentClick = { id -> navController.navigate("event_equipment/$id") },
                    onSuppliesClick = { id -> navController.navigate("event_supplies/$id") },
                    onShoppingListClick = { id -> navController.navigate("event_shopping/$id") },
                    onPhotosClick = { id -> navController.navigate("event_photos/$id") },
                    onContractPreviewClick = { id -> navController.navigate("event_contract/$id") }
                )
            }
            composable("event_finances/{eventId}") {
                EventFinancesScreen(viewModel = hiltViewModel(), onNavigateBack = { navController.popBackStack() })
            }
            composable("event_payments/{eventId}") {
                EventPaymentsScreen(viewModel = hiltViewModel(), onNavigateBack = { navController.popBackStack() })
            }
            composable("event_products/{eventId}") {
                EventProductsScreen(viewModel = hiltViewModel(), onNavigateBack = { navController.popBackStack() })
            }
            composable("event_extras/{eventId}") {
                EventExtrasScreen(viewModel = hiltViewModel(), onNavigateBack = { navController.popBackStack() })
            }
            composable("event_equipment/{eventId}") {
                EventEquipmentScreen(viewModel = hiltViewModel(), onNavigateBack = { navController.popBackStack() })
            }
            composable("event_supplies/{eventId}") {
                EventSuppliesScreen(viewModel = hiltViewModel(), onNavigateBack = { navController.popBackStack() })
            }
            composable("event_shopping/{eventId}") {
                EventShoppingListScreen(viewModel = hiltViewModel(), onNavigateBack = { navController.popBackStack() })
            }
            composable("event_photos/{eventId}") {
                EventPhotosScreen(viewModel = hiltViewModel(), onNavigateBack = { navController.popBackStack() })
            }
            composable("event_contract/{eventId}") {
                EventContractPreviewScreen(viewModel = hiltViewModel(), onNavigateBack = { navController.popBackStack() })
            }
            composable("event_checklist/{eventId}") {
                EventChecklistScreen(
                    viewModel = hiltViewModel(),
                    onSearchClick = { navController.navigate(buildSearchRoute()) },
                    onNavigateBack = { navController.popBackStack() }
                )
            }
            composable("event_form?eventId={eventId}", arguments = listOf(navArgument("eventId") {
                type = NavType.StringType
                nullable = true
                defaultValue = null
            })) {
                EventFormScreen(
                    viewModel = hiltViewModel(),
                    onSearchClick = { navController.navigate(buildSearchRoute()) },
                    onNavigateBack = { navController.popBackStack() }
                )
            }
        }
    }
}

@Composable
@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
fun MoreMenuScreen(
    onProductsClick: () -> Unit,
    onInventoryClick: () -> Unit,
    onSettingsClick: () -> Unit
) {
    Scaffold(topBar = { SolennixTopAppBar(title = { Text("Más") }) }) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(horizontal = 16.dp)
        ) {
            Spacer(modifier = Modifier.height(12.dp))
            MenuOptionItem(
                title = "Productos",
                subtitle = "Catálogo y costos",
                icon = Icons.Default.Inventory2,
                onClick = onProductsClick
            )
            MenuOptionItem(
                title = "Inventario",
                subtitle = "Stock y abastecimiento",
                icon = Icons.Default.Inventory2,
                onClick = onInventoryClick
            )
            MenuOptionItem(
                title = "Configuración",
                subtitle = "Perfil y negocio",
                icon = Icons.Default.Settings,
                onClick = onSettingsClick
            )
        }
    }
}

@Composable
private fun MenuOptionItem(
    title: String,
    subtitle: String = "",
    icon: ImageVector,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp)
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = RoundedCornerShape(14.dp)
    ) {
        Row(
            modifier = Modifier.padding(20.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
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
            Icon(
                Icons.AutoMirrored.Filled.KeyboardArrowRight,
                contentDescription = "Ir a $title",
                tint = SolennixTheme.colors.secondaryText
            )
        }
    }
}

private fun buildSearchRoute(query: String? = null): String {
    return "search?query=${Uri.encode(query.orEmpty())}"
}
