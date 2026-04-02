package com.creapolis.solennix.ui.navigation

import android.content.Context
import android.net.Uri
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.expandHorizontally
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkHorizontally
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.Description
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.creapolis.solennix.core.designsystem.theme.LocalIsWideScreen
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.creapolis.solennix.R
import com.creapolis.solennix.core.designsystem.component.QuickActionsFAB
import com.creapolis.solennix.core.designsystem.theme.SolennixElevation
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.User
import com.creapolis.solennix.feature.calendar.ui.CalendarScreen
import com.creapolis.solennix.feature.clients.ui.ClientDetailScreen
import com.creapolis.solennix.feature.clients.ui.ClientFormScreen
import com.creapolis.solennix.feature.clients.ui.ClientListScreen
import com.creapolis.solennix.feature.clients.ui.QuickQuoteScreen
import com.creapolis.solennix.feature.dashboard.ui.DashboardScreen
import com.creapolis.solennix.feature.events.ui.EventChecklistScreen
import com.creapolis.solennix.feature.events.ui.EventDetailScreen
import com.creapolis.solennix.feature.events.ui.EventFinancesScreen
import com.creapolis.solennix.feature.events.ui.EventPaymentsScreen
import com.creapolis.solennix.feature.events.ui.EventProductsScreen
import com.creapolis.solennix.feature.events.ui.EventExtrasScreen
import com.creapolis.solennix.feature.events.ui.EventEquipmentScreen
import com.creapolis.solennix.feature.events.ui.EventSuppliesScreen
import com.creapolis.solennix.feature.events.ui.EventShoppingListScreen
import com.creapolis.solennix.feature.events.ui.EventContractPreviewScreen
import com.creapolis.solennix.feature.events.ui.EventPhotosScreen
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

private const val PREF_DRAWER = "nav_prefs"
private const val PREF_DRAWER_EXPANDED = "drawer_expanded"
private const val DRAWER_EXPANDED_WIDTH = 240
private const val DRAWER_COLLAPSED_WIDTH = 72

@Composable
fun AdaptiveNavigationRailLayout(
    initialDeepLinkRoute: String? = null,
    currentUser: User? = null
) {
    val context = LocalContext.current
    var selectedSection by remember { mutableStateOf(SidebarSection.DASHBOARD) }
    val navController = rememberNavController()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route
    // Drawer expanded state — persisted across sessions
    var isExpanded by remember {
        mutableStateOf(
            context.getSharedPreferences(PREF_DRAWER, Context.MODE_PRIVATE)
                .getBoolean(PREF_DRAWER_EXPANDED, true)
        )
    }
    val drawerWidth by animateDpAsState(
        targetValue = if (isExpanded) DRAWER_EXPANDED_WIDTH.dp else DRAWER_COLLAPSED_WIDTH.dp,
        animationSpec = tween(durationMillis = 220),
        label = "drawerWidth"
    )
    fun toggleDrawer() {
        isExpanded = !isExpanded
        context.getSharedPreferences(PREF_DRAWER, Context.MODE_PRIVATE)
            .edit().putBoolean(PREF_DRAWER_EXPANDED, isExpanded).apply()
    }

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
        // Permanent collapsible drawer
        Column(
            modifier = Modifier
                .width(drawerWidth)
                .fillMaxHeight()
                .background(SolennixTheme.colors.card)
                .statusBarsPadding()
        ) {
            // Branding header
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .padding(horizontal = 16.dp, vertical = 16.dp)
                    .height(48.dp)
            ) {
                Image(
                    painter = painterResource(id = R.drawable.ic_solennix_logo),
                    contentDescription = "Solennix",
                    modifier = Modifier
                        .size(36.dp)
                        .clip(RoundedCornerShape(8.dp))
                )
                AnimatedVisibility(
                    visible = isExpanded,
                    enter = fadeIn(tween(150)) + expandHorizontally(),
                    exit = fadeOut(tween(100)) + shrinkHorizontally()
                ) {
                    Text(
                        text = "Solennix",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = SolennixTheme.colors.primaryText,
                        modifier = Modifier.padding(start = 10.dp)
                    )
                }
            }

            HorizontalDivider(color = SolennixTheme.colors.divider)

            Spacer(Modifier.height(8.dp))

            // Nav items
            SidebarSection.entries.forEach { section ->
                DrawerNavItem(
                    section = section,
                    isSelected = selectedSection == section,
                    isExpanded = isExpanded,
                    onClick = {
                        selectedSection = section
                        navController.navigate(section.route) {
                            popUpTo(navController.graph.startDestinationId) { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                )
            }

            Spacer(Modifier.weight(1f))

            HorizontalDivider(color = SolennixTheme.colors.divider)

            // User footer
            if (currentUser != null) {
                DrawerUserFooter(
                    user = currentUser,
                    isExpanded = isExpanded,
                    onSettingsClick = {
                        selectedSection = SidebarSection.SETTINGS
                        navController.navigate(SidebarSection.SETTINGS.route) {
                            popUpTo(navController.graph.startDestinationId) { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                )
            }

            // Collapse / expand toggle
            Box(
                contentAlignment = if (isExpanded) Alignment.CenterEnd else Alignment.Center,
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { toggleDrawer() }
                    .padding(horizontal = 16.dp, vertical = 12.dp)
            ) {
                Icon(
                    imageVector = if (isExpanded) Icons.Default.KeyboardArrowLeft
                                  else Icons.Default.KeyboardArrowRight,
                    contentDescription = if (isExpanded) "Colapsar menú" else "Expandir menú",
                    tint = SolennixTheme.colors.secondaryText
                )
            }
        }

        // Content area with NavHost
        Scaffold(
            floatingActionButton = {
                // QuickActionsFAB on home, calendar and events only
                // clients/products/inventory have their own contextual FABs
                val showQuickActions = isAtSectionLevel
                    && currentRoute != "settings"
                    && currentRoute != "clients"
                    && currentRoute != "products"
                    && currentRoute != "inventory"

                if (showQuickActions) {
                    QuickActionsFAB(
                        onNewEventClick = { navController.navigate("event_form?eventId=") },
                        onQuickQuoteClick = { navController.navigate("quick_quote") }
                    )
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
                composable("calendar") {
                    CalendarScreen(
                        viewModel = hiltViewModel(),
                        onEventClick = { id -> navController.navigate("event_detail/$id") },
                        onSearchClick = { navController.navigate(buildSearchRoute()) }
                    )
                }
                composable("clients") {
                    ClientListScreen(
                        viewModel = hiltViewModel(),
                        onClientClick = { id -> navController.navigate("client_detail/$id") },
                        onSearchClick = { navController.navigate(buildSearchRoute()) },
                        onAddClientClick = { navController.navigate("client_form") }
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
                composable(
                    "search?query={query}",
                    arguments = listOf(
                        navArgument("query") {
                            type = NavType.StringType
                            nullable = true
                            defaultValue = null
                        }
                    )
                ) { backStackEntry ->
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
                        onSearchClick = { navController.navigate(buildSearchRoute()) },
                        onNavigateBack = { navController.popBackStack() }
                    )
                }

                // ── Events ──
                composable("events") {
                    EventListScreen(
                        viewModel = hiltViewModel(),
                        onEventClick = { id -> navController.navigate("event_detail/$id") },
                        onNavigateBack = { navController.popBackStack() },
                        onSearchClick = { navController.navigate(buildSearchRoute()) },
                        showBackButton = false
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
                composable("event_finances/{eventId}", arguments = listOf(navArgument("eventId") { type = NavType.StringType })) {
                    EventFinancesScreen(viewModel = hiltViewModel(), onNavigateBack = { navController.popBackStack() })
                }
                composable("event_payments/{eventId}", arguments = listOf(navArgument("eventId") { type = NavType.StringType })) {
                    EventPaymentsScreen(viewModel = hiltViewModel(), onNavigateBack = { navController.popBackStack() })
                }
                composable("event_products/{eventId}", arguments = listOf(navArgument("eventId") { type = NavType.StringType })) {
                    EventProductsScreen(viewModel = hiltViewModel(), onNavigateBack = { navController.popBackStack() })
                }
                composable("event_extras/{eventId}", arguments = listOf(navArgument("eventId") { type = NavType.StringType })) {
                    EventExtrasScreen(viewModel = hiltViewModel(), onNavigateBack = { navController.popBackStack() })
                }
                composable("event_equipment/{eventId}", arguments = listOf(navArgument("eventId") { type = NavType.StringType })) {
                    EventEquipmentScreen(viewModel = hiltViewModel(), onNavigateBack = { navController.popBackStack() })
                }
                composable("event_supplies/{eventId}", arguments = listOf(navArgument("eventId") { type = NavType.StringType })) {
                    EventSuppliesScreen(viewModel = hiltViewModel(), onNavigateBack = { navController.popBackStack() })
                }
                composable("event_shopping/{eventId}", arguments = listOf(navArgument("eventId") { type = NavType.StringType })) {
                    EventShoppingListScreen(viewModel = hiltViewModel(), onNavigateBack = { navController.popBackStack() })
                }
                composable("event_photos/{eventId}", arguments = listOf(navArgument("eventId") { type = NavType.StringType })) {
                    EventPhotosScreen(viewModel = hiltViewModel(), onNavigateBack = { navController.popBackStack() })
                }
                composable("event_contract/{eventId}", arguments = listOf(navArgument("eventId") { type = NavType.StringType })) {
                    EventContractPreviewScreen(viewModel = hiltViewModel(), onNavigateBack = { navController.popBackStack() })
                }
                composable(
                    "event_form?eventId={eventId}",
                    arguments = listOf(navArgument("eventId") { type = NavType.StringType; nullable = true; defaultValue = null })
                ) {
                    EventFormScreen(
                        viewModel = hiltViewModel(),
                        onSearchClick = { navController.navigate(buildSearchRoute()) },
                        onNavigateBack = { navController.popBackStack() }
                    )
                }
                composable(
                    "event_checklist/{eventId}",
                    arguments = listOf(navArgument("eventId") { type = NavType.StringType })
                ) {
                    EventChecklistScreen(
                        viewModel = hiltViewModel(),
                        onSearchClick = { navController.navigate(buildSearchRoute()) },
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
                        onSearchClick = { navController.navigate(buildSearchRoute()) },
                        onEventClick = { id -> navController.navigate("event_detail/$id") }
                    )
                }
                composable(
                    "client_form?clientId={clientId}",
                    arguments = listOf(navArgument("clientId") { type = NavType.StringType; nullable = true; defaultValue = null })
                ) {
                    ClientFormScreen(
                        viewModel = hiltViewModel(),
                        onSearchClick = { navController.navigate(buildSearchRoute()) },
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
                        onSearchClick = { navController.navigate(buildSearchRoute()) },
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
                        onSearchClick = { navController.navigate(buildSearchRoute()) },
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
                        onSearchClick = { navController.navigate(buildSearchRoute()) },
                        onEditClick = { id -> navController.navigate("inventory_form?itemId=$id") }
                    )
                }
                composable(
                    "inventory_form?itemId={itemId}",
                    arguments = listOf(navArgument("itemId") { type = NavType.StringType; nullable = true; defaultValue = null })
                ) {
                    InventoryFormScreen(
                        viewModel = hiltViewModel(),
                        onSearchClick = { navController.navigate(buildSearchRoute()) },
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
                        onSearchClick = { navController.navigate(buildSearchRoute()) },
                        onConvertToEvent = { navController.navigate("event_form?eventId=") }
                    )
                }
            }
        }
    }
    } // CompositionLocalProvider
}

@Composable
private fun DrawerNavItem(
    section: SidebarSection,
    isSelected: Boolean,
    isExpanded: Boolean,
    onClick: () -> Unit
) {
    if (isExpanded) {
        NavigationDrawerItem(
            icon = { Icon(section.icon, contentDescription = section.label) },
            label = { Text(section.label) },
            selected = isSelected,
            onClick = onClick,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 2.dp),
            colors = NavigationDrawerItemDefaults.colors(
                selectedContainerColor = SolennixTheme.colors.primaryLight,
                selectedIconColor = SolennixTheme.colors.primary,
                selectedTextColor = SolennixTheme.colors.primary,
                unselectedIconColor = SolennixTheme.colors.secondaryText,
                unselectedTextColor = SolennixTheme.colors.primaryText
            )
        )
    } else {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp)
                .padding(horizontal = 8.dp, vertical = 4.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(
                    if (isSelected) SolennixTheme.colors.primaryLight
                    else Color.Transparent
                )
                .clickable(onClick = onClick)
        ) {
            Icon(
                imageVector = section.icon,
                contentDescription = section.label,
                tint = if (isSelected) SolennixTheme.colors.primary
                       else SolennixTheme.colors.secondaryText
            )
        }
    }
}

@Composable
private fun DrawerUserFooter(
    user: User,
    isExpanded: Boolean,
    onSettingsClick: () -> Unit
) {
    val goldBrush = Brush.linearGradient(listOf(Color(0xFFC4A265), Color(0xFFB8965A)))
    val initial = user.name.firstOrNull()?.uppercaseChar()?.toString() ?: "S"

    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onSettingsClick() }
            .padding(horizontal = 16.dp, vertical = 12.dp)
    ) {
        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .size(36.dp)
                .clip(CircleShape)
                .background(goldBrush)
        ) {
            Text(
                text = initial,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
        }

        AnimatedVisibility(
            visible = isExpanded,
            enter = fadeIn(tween(150)) + expandHorizontally(),
            exit = fadeOut(tween(100)) + shrinkHorizontally()
        ) {
            Column(modifier = Modifier.padding(start = 10.dp)) {
                Text(
                    text = user.name,
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.SemiBold,
                    color = SolennixTheme.colors.primaryText,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = user.email,
                    style = MaterialTheme.typography.labelSmall,
                    color = SolennixTheme.colors.secondaryText,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

private fun buildSearchRoute(query: String? = null): String {
    return if (query.isNullOrBlank()) "search?query=" else "search?query=$query"
}
