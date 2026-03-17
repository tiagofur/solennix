package com.creapolis.solennix.ui.navigation

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.designsystem.theme.SolennixTitle

import androidx.compose.material3.adaptive.layout.ListDetailPaneScaffold
import androidx.compose.material3.adaptive.layout.ListDetailPaneScaffoldRole
import androidx.compose.material3.adaptive.navigation.rememberListDetailPaneScaffoldNavigator
import androidx.hilt.navigation.compose.hiltViewModel
import com.creapolis.solennix.feature.clients.ui.ClientDetailScreen
import com.creapolis.solennix.feature.clients.ui.ClientListScreen
import com.creapolis.solennix.feature.dashboard.ui.DashboardScreen

@OptIn(androidx.compose.material3.adaptive.ExperimentalMaterial3AdaptiveApi::class)
@Composable
fun AdaptiveNavigationRailLayout() {
    var selectedSection by remember { mutableStateOf(SidebarSection.DASHBOARD) }
    val navigator = rememberListDetailPaneScaffoldNavigator<String>()

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
                        navigator.navigateTo(ListDetailPaneScaffoldRole.List)
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

        // Content area with List-Detail pattern
        Box(
            Modifier
                .fillMaxSize()
                .background(SolennixTheme.colors.surfaceGrouped)
        ) {
            when (selectedSection) {
                SidebarSection.CLIENTS -> {
                    ListDetailPaneScaffold(
                        directive = navigator.scaffoldDirective,
                        value = navigator.scaffoldValue,
                        listPane = {
                            ClientListScreen(
                                viewModel = hiltViewModel(),
                                onClientClick = { id -> 
                                    navigator.navigateTo(ListDetailPaneScaffoldRole.Detail, id)
                                },
                                onAddClientClick = {}
                            )
                        },
                        detailPane = {
                            val clientId = navigator.currentDestination?.content
                            if (clientId != null) {
                                ClientDetailScreen(
                                    viewModel = hiltViewModel(), // In reality, would need id injection
                                    onNavigateBack = { navigator.navigateBack() },
                                    onEditClick = {}
                                )
                            } else {
                                Box(Modifier.fillMaxSize(), contentAlignment = androidx.compose.ui.Alignment.Center) {
                                    Text("Selecciona un cliente para ver el detalle")
                                }
                            }
                        }
                    )
                }
                SidebarSection.DASHBOARD -> DashboardScreen(viewModel = hiltViewModel())
                else -> PlaceholderScreen("${selectedSection.label} — Phase 6")
            }
        }
    }
}
