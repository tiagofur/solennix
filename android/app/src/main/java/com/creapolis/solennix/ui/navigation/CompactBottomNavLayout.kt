package com.creapolis.solennix.ui.navigation

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
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
import androidx.navigation.compose.rememberNavController
import com.creapolis.solennix.core.designsystem.theme.SolennixElevation
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.feature.calendar.ui.CalendarScreen
import com.creapolis.solennix.feature.clients.ui.ClientDetailScreen
import com.creapolis.solennix.feature.clients.ui.ClientListScreen
import com.creapolis.solennix.feature.dashboard.ui.DashboardScreen
import com.creapolis.solennix.feature.events.ui.EventChecklistScreen
import com.creapolis.solennix.feature.events.ui.EventDetailScreen
import com.creapolis.solennix.feature.events.ui.EventFormScreen
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
            FloatingActionButton(
                onClick = { navController.navigate("event_form") },
                containerColor = SolennixTheme.colors.primary,
                elevation = FloatingActionButtonDefaults.elevation(
                    defaultElevation = SolennixElevation.fab
                )
            ) {
                Icon(Icons.Filled.Add, "Nuevo Evento", tint = Color.White)
            }
        },
        floatingActionButtonPosition = FabPosition.Center
    ) { padding ->
        NavHost(
            navController = navController,
            startDestination = TopLevelDestination.HOME.route,
            modifier = Modifier.padding(padding)
        ) {
            composable(TopLevelDestination.HOME.route) { 
                DashboardScreen(viewModel = hiltViewModel())
            }
            composable(TopLevelDestination.CALENDAR.route) { 
                CalendarScreen(viewModel = hiltViewModel(), onEventClick = { id -> 
                    navController.navigate("event_detail/$id")
                })
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
                    onProductsClick = { navController.navigate("products") },
                    onInventoryClick = { navController.navigate("inventory") },
                    onSettingsClick = { navController.navigate("settings") },
                    onSearchClick = { navController.navigate("search") }
                )
            }

            // More Menu Destinations
            composable("products") {
                ProductListScreen(
                    viewModel = hiltViewModel(),
                    onProductClick = { id -> navController.navigate("product_detail/$id") },
                    onAddProductClick = { navController.navigate("product_form") }
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
                    onAddItemClick = { navController.navigate("inventory_form") }
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
                    onTerms = { navController.navigate("terms") }
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
                    onEventClick = { id -> navController.navigate("event_detail/$id") }
                )
            }

            // Detail routes
            composable("client_detail/{clientId}") { 
                ClientDetailScreen(
                    viewModel = hiltViewModel(),
                    onNavigateBack = { navController.popBackStack() },
                    onEditClick = { id -> navController.navigate("client_form?clientId=$id") }
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

            composable("event_form") {
                EventFormScreen(
                    viewModel = hiltViewModel(),
                    onNavigateBack = { navController.popBackStack() }
                )
            }
        }
    }
}

@Composable
fun MoreMenuScreen(
    onProductsClick: () -> Unit,
    onInventoryClick: () -> Unit,
    onSettingsClick: () -> Unit,
    onSearchClick: () -> Unit
) {
    Column(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        Text("Menu Principal", style = MaterialTheme.typography.headlineSmall, color = SolennixTheme.colors.primaryText)
        Spacer(modifier = Modifier.height(24.dp))
        
        MenuCard(title = "Productos", icon = Icons.Default.List, onClick = onProductsClick)
        MenuCard(title = "Inventario", icon = Icons.Default.Build, onClick = onInventoryClick)
        MenuCard(title = "Busqueda Global", icon = Icons.Default.Search, onClick = onSearchClick)
        MenuCard(title = "Ajustes", icon = Icons.Default.Settings, onClick = onSettingsClick)
    }
}

@Composable
fun MenuCard(title: String, icon: androidx.compose.ui.graphics.vector.ImageVector, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp).clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card)
    ) {
        Row(modifier = Modifier.padding(20.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, contentDescription = null, tint = SolennixTheme.colors.primary)
            Spacer(modifier = Modifier.width(16.dp))
            Text(title, style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.weight(1f))
            Icon(Icons.Default.KeyboardArrowRight, contentDescription = null, tint = SolennixTheme.colors.secondaryText)
        }
    }
}

@Composable
fun PlaceholderScreen(text: String) {
    Surface(modifier = Modifier.padding(16.dp)) {
        Text(text = text, style = MaterialTheme.typography.headlineMedium)
    }
}
