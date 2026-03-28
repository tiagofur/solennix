package com.creapolis.solennix.feature.dashboard.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.component.*
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveDetailLayout
import com.creapolis.solennix.core.designsystem.theme.LocalIsWideScreen
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.EventStatus
import com.creapolis.solennix.core.model.InventoryItem
import com.creapolis.solennix.core.model.extensions.asMXN
import com.creapolis.solennix.feature.dashboard.viewmodel.DashboardViewModel
import com.creapolis.solennix.feature.dashboard.viewmodel.PendingEvent
import com.creapolis.solennix.feature.dashboard.viewmodel.StatusCount

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    viewModel: DashboardViewModel,
    onEventClick: (String) -> Unit = {},
    onInventoryClick: (String) -> Unit = {},
    onUpgradeClick: () -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val isWideScreen = LocalIsWideScreen.current

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Dashboard", style = MaterialTheme.typography.titleLarge) },
                actions = {
                    IconButton(onClick = { viewModel.refresh() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors()
            )
        },
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = uiState.isRefreshing,
            onRefresh = { viewModel.refresh() },
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            if (uiState.isLoading) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = SolennixTheme.colors.primary)
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
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

                // KPI Cards
                item {
                    if (isWideScreen) {
                        // Tablet: grid layout (4 columns like web)
                        val kpiItems = listOf(
                            Triple("Ventas del Mes", uiState.revenueThisMonth.asMXN(), Triple(Icons.Default.AttachMoney, SolennixTheme.colors.kpiGreen, null as String?)),
                            Triple("Cobrado", uiState.cashCollected.asMXN(), Triple(Icons.Default.Payments, SolennixTheme.colors.kpiOrange, "Este mes")),
                            Triple("IVA Cobrado", uiState.vatCollected.asMXN(), Triple(Icons.Default.Receipt, SolennixTheme.colors.kpiBlue, "Este mes")),
                            Triple("IVA Pendiente", uiState.vatOutstanding.asMXN(), Triple(Icons.Default.ReceiptLong, SolennixTheme.colors.kpiBlue, "Por cobrar")),
                            Triple("Eventos del Mes", uiState.eventsThisMonth.toString(), Triple(Icons.Default.CalendarMonth, SolennixTheme.colors.kpiOrange, null)),
                            Triple("Stock Bajo", uiState.lowStockCount.toString(), Triple(Icons.Default.Inventory2, if (uiState.lowStockCount > 0) SolennixTheme.colors.kpiOrange else SolennixTheme.colors.kpiGreen, null)),
                            Triple("Clientes", uiState.totalClients.toString(), Triple(Icons.Default.People, SolennixTheme.colors.kpiBlue, "Total")),
                            Triple("Cotizaciones", uiState.pendingQuotes.toString(), Triple(Icons.Default.RequestQuote, SolennixTheme.colors.kpiOrange, null))
                        )
                        Column(modifier = Modifier.padding(vertical = 8.dp)) {
                            kpiItems.chunked(4).forEach { rowItems ->
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    rowItems.forEach { (title, value, iconInfo) ->
                                        val (icon, color, subtitle) = iconInfo
                                        KPICard(
                                            title = title,
                                            value = value,
                                            icon = icon,
                                            iconColor = color,
                                            subtitle = subtitle,
                                            modifier = Modifier.weight(1f)
                                        )
                                    }
                                    // Fill empty slots if row is not full
                                    repeat(4 - rowItems.size) {
                                        Spacer(modifier = Modifier.weight(1f))
                                    }
                                }
                                Spacer(modifier = Modifier.height(12.dp))
                            }
                        }
                    } else {
                        // Phone: horizontal scroll
                        Row(
                            modifier = Modifier
                                .horizontalScroll(rememberScrollState())
                                .padding(vertical = 8.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Spacer(modifier = Modifier.width(4.dp))
                            KPICard(title = "Ventas del Mes", value = uiState.revenueThisMonth.asMXN(), icon = Icons.Default.AttachMoney, iconColor = SolennixTheme.colors.kpiGreen)
                            KPICard(title = "Cobrado", value = uiState.cashCollected.asMXN(), icon = Icons.Default.Payments, iconColor = SolennixTheme.colors.kpiOrange, subtitle = "Este mes")
                            KPICard(title = "IVA Cobrado", value = uiState.vatCollected.asMXN(), icon = Icons.Default.Receipt, iconColor = SolennixTheme.colors.kpiBlue, subtitle = "Este mes")
                            KPICard(title = "IVA Pendiente", value = uiState.vatOutstanding.asMXN(), icon = Icons.Default.ReceiptLong, iconColor = SolennixTheme.colors.kpiBlue, subtitle = "Por cobrar")
                            KPICard(title = "Eventos del Mes", value = uiState.eventsThisMonth.toString(), icon = Icons.Default.CalendarMonth, iconColor = SolennixTheme.colors.kpiOrange)
                            KPICard(title = "Stock Bajo", value = uiState.lowStockCount.toString(), icon = Icons.Default.Inventory2, iconColor = if (uiState.lowStockCount > 0) SolennixTheme.colors.kpiOrange else SolennixTheme.colors.kpiGreen)
                            KPICard(title = "Clientes", value = uiState.totalClients.toString(), icon = Icons.Default.People, iconColor = SolennixTheme.colors.kpiBlue, subtitle = "Total")
                            KPICard(title = "Cotizaciones", value = uiState.pendingQuotes.toString(), icon = Icons.Default.RequestQuote, iconColor = SolennixTheme.colors.kpiOrange)
                            Spacer(modifier = Modifier.width(4.dp))
                        }
                    }
                }

                // Upgrade Banner for basic plan users
                if (uiState.isBasicPlan) {
                    item {
                        UpgradeBanner(
                            message = "Potencia tu negocio con el plan Pro: eventos ilimitados, inventario y mas.",
                            style = UpgradeBannerStyle.PROMO,
                            onUpgradeClick = onUpgradeClick
                        )
                    }
                }

                // Status Distribution + Pending Events
                if (uiState.statusDistribution.isNotEmpty() || uiState.pendingEvents.isNotEmpty()) {
                    item {
                        Spacer(modifier = Modifier.height(24.dp))
                        AdaptiveDetailLayout(
                            left = {
                                if (uiState.statusDistribution.isNotEmpty()) {
                                    Text(
                                        text = "Estado de Eventos",
                                        style = MaterialTheme.typography.titleMedium,
                                        color = SolennixTheme.colors.primaryText
                                    )
                                    EventStatusDistributionCard(statusCounts = uiState.statusDistribution)
                                }
                            },
                            right = {
                                if (uiState.pendingEvents.isNotEmpty()) {
                                    Text(
                                        text = "Eventos Pendientes",
                                        style = MaterialTheme.typography.titleMedium,
                                        color = SolennixTheme.colors.primaryText
                                    )
                                    uiState.pendingEvents.forEach { pendingEvent ->
                                        PendingEventItem(
                                            pendingEvent = pendingEvent,
                                            onClick = { onEventClick(pendingEvent.event.id) }
                                        )
                                    }
                                }
                            }
                        )
                    }
                }

                // Upcoming Events + Inventory Alerts
                if (uiState.upcomingEvents.isNotEmpty() || uiState.lowStockItems.isNotEmpty()) {
                    item {
                        Spacer(modifier = Modifier.height(24.dp))
                        AdaptiveDetailLayout(
                            left = {
                                if (uiState.upcomingEvents.isNotEmpty()) {
                                    Text(text = "Proximos Eventos", style = MaterialTheme.typography.titleMedium, color = SolennixTheme.colors.primaryText)
                                    uiState.upcomingEvents.forEach { event ->
                                        EventListItem(event = event, onClick = { onEventClick(event.id) })
                                    }
                                }
                            },
                            right = {
                                if (uiState.lowStockItems.isNotEmpty()) {
                                    Text(text = "Alertas de Inventario", style = MaterialTheme.typography.titleMedium, color = SolennixTheme.colors.primaryText)
                                    uiState.lowStockItems.forEach { item ->
                                        InventoryAlertItem(item = item, onClick = { onInventoryClick(item.id) })
                                    }
                                }
                            }
                        )
                    }
                }

                item {
                    Spacer(modifier = Modifier.height(32.dp))
                }
            }
            }
        }
    }
}

@Composable
fun EventStatusDistributionCard(
    statusCounts: List<StatusCount>,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.medium
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Horizontal stacked bar
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(12.dp)
                    .clip(RoundedCornerShape(6.dp))
            ) {
                statusCounts.forEach { statusCount ->
                    Box(
                        modifier = Modifier
                            .weight(statusCount.percentage.coerceAtLeast(0.01f))
                            .fillMaxHeight()
                            .background(statusColor(statusCount.status))
                    )
                }
            }

            // Legend items
            statusCounts.forEach { statusCount ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(12.dp)
                                .clip(RoundedCornerShape(3.dp))
                                .background(statusColor(statusCount.status))
                        )
                        Text(
                            text = statusLabel(statusCount.status),
                            style = MaterialTheme.typography.bodyMedium,
                            color = SolennixTheme.colors.primaryText
                        )
                    }
                    Text(
                        text = "${statusCount.count} (${(statusCount.percentage * 100).toInt()}%)",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium,
                        color = SolennixTheme.colors.secondaryText
                    )
                }
            }
        }
    }
}

@Composable
private fun statusColor(status: EventStatus): Color {
    return when (status) {
        EventStatus.QUOTED -> SolennixTheme.colors.statusQuoted
        EventStatus.CONFIRMED -> SolennixTheme.colors.statusConfirmed
        EventStatus.COMPLETED -> SolennixTheme.colors.statusCompleted
        EventStatus.CANCELLED -> SolennixTheme.colors.statusCancelled
    }
}

private fun statusLabel(status: EventStatus): String {
    return when (status) {
        EventStatus.QUOTED -> "Cotizado"
        EventStatus.CONFIRMED -> "Confirmado"
        EventStatus.COMPLETED -> "Completado"
        EventStatus.CANCELLED -> "Cancelado"
    }
}

@Composable
fun PendingEventItem(pendingEvent: PendingEvent, onClick: () -> Unit = {}) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.medium
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.ErrorOutline,
                contentDescription = null,
                tint = SolennixTheme.colors.warning,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = pendingEvent.event.serviceType,
                    style = MaterialTheme.typography.titleSmall,
                    color = SolennixTheme.colors.primaryText
                )
                Text(
                    text = pendingEvent.event.eventDate,
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText
                )
            }
            Surface(
                color = SolennixTheme.colors.warning.copy(alpha = 0.15f),
                shape = RoundedCornerShape(6.dp)
            ) {
                Text(
                    text = pendingEvent.reason,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                    color = SolennixTheme.colors.warning,
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

@Composable
fun EventListItem(event: Event, onClick: () -> Unit = {}) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .clickable(onClick = onClick),
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
fun InventoryAlertItem(item: InventoryItem, onClick: () -> Unit = {}) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .clickable(onClick = onClick),
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
