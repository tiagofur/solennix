package com.creapolis.solennix.feature.dashboard.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.component.*
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.InventoryItem
import com.creapolis.solennix.core.model.extensions.asMXN
import com.creapolis.solennix.feature.dashboard.viewmodel.DashboardViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    viewModel: DashboardViewModel
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Dashboard", style = MaterialTheme.typography.titleLarge) },
                actions = {
                    IconButton(onClick = { viewModel.refresh() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = SolennixTheme.colors.background
                )
            )
        },
        containerColor = SolennixTheme.colors.surfaceGrouped
    ) { padding ->
        if (uiState.isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = SolennixTheme.colors.primary)
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 16.dp)
            ) {
                item {
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "Resumen del Mes",
                        style = MaterialTheme.typography.titleMedium,
                        color = SolennixTheme.colors.primaryText
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                }

                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        KPICard(
                            title = "Ventas del Mes",
                            value = uiState.revenueThisMonth.asMXN(),
                            icon = Icons.Default.AttachMoney,
                            iconColor = SolennixTheme.colors.kpiGreen,
                            modifier = Modifier.weight(1f)
                        )
                        KPICard(
                            title = "Cobrado",
                            value = uiState.cashCollected.asMXN(),
                            icon = Icons.Default.Payments,
                            iconColor = SolennixTheme.colors.kpiBlue,
                            subtitle = "Este mes",
                            modifier = Modifier.weight(1f)
                        )
                    }
                }

                item {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        KPICard(
                            title = "Eventos del Mes",
                            value = uiState.eventsThisMonth.toString(),
                            icon = Icons.Default.CalendarMonth,
                            iconColor = SolennixTheme.colors.kpiOrange,
                            modifier = Modifier.weight(1f)
                        )
                        KPICard(
                            title = "Clientes",
                            value = uiState.totalClients.toString(),
                            icon = Icons.Default.People,
                            iconColor = SolennixTheme.colors.kpiBlue,
                            subtitle = "Total",
                            modifier = Modifier.weight(1f)
                        )
                    }
                }

                item {
                    KPICard(
                        title = "Cotizaciones Pendientes",
                        value = uiState.pendingQuotes.toString(),
                        icon = Icons.Default.RequestQuote,
                        iconColor = SolennixTheme.colors.kpiRed
                    )
                }

                if (uiState.upcomingEvents.isNotEmpty()) {
                    item {
                        Spacer(modifier = Modifier.height(24.dp))
                        Text(
                            text = "Proximos Eventos",
                            style = MaterialTheme.typography.titleMedium,
                            color = SolennixTheme.colors.primaryText
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                    }

                    items(uiState.upcomingEvents) { event ->
                        EventListItem(event = event)
                    }
                }

                if (uiState.lowStockItems.isNotEmpty()) {
                    item {
                        Spacer(modifier = Modifier.height(24.dp))
                        Text(
                            text = "Alertas de Inventario",
                            style = MaterialTheme.typography.titleMedium,
                            color = SolennixTheme.colors.primaryText
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                    }

                    items(uiState.lowStockItems) { item ->
                        InventoryAlertItem(item = item)
                    }
                }

                item {
                    Spacer(modifier = Modifier.height(32.dp))
                }
            }
        }
    }
}

@Composable
fun EventListItem(event: Event) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.medium
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = event.serviceType,
                    style = MaterialTheme.typography.titleSmall,
                    color = SolennixTheme.colors.primaryText
                )
                Text(
                    text = event.eventDate,
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText
                )
            }
            StatusBadge(status = event.status.name)
        }
    }
}

@Composable
fun InventoryAlertItem(item: InventoryItem) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.medium
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.Warning,
                contentDescription = null,
                tint = SolennixTheme.colors.warning,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = item.ingredientName,
                    style = MaterialTheme.typography.titleSmall,
                    color = SolennixTheme.colors.primaryText
                )
                Text(
                    text = "Stock actual: ${item.currentStock} ${item.unit}",
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.error
                )
            }
        }
    }
}
