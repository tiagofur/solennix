package com.creapolis.solennix.feature.dashboard.ui

import android.widget.Toast
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
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.LifecycleResumeEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.component.*
import com.creapolis.solennix.core.designsystem.component.SolennixSectionTopAppBar
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveDetailLayout
import com.creapolis.solennix.core.designsystem.theme.LocalIsWideScreen
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.EventStatus
import com.creapolis.solennix.core.model.InventoryItem
import com.creapolis.solennix.core.model.extensions.asMXN
import com.creapolis.solennix.core.model.extensions.parseFlexibleDate
import com.creapolis.solennix.feature.dashboard.viewmodel.DashboardViewModel
import com.creapolis.solennix.feature.dashboard.viewmodel.MIN_PENDING_AMOUNT
import com.creapolis.solennix.feature.dashboard.viewmodel.PendingEvent
import com.creapolis.solennix.feature.dashboard.viewmodel.PendingEventReason
import com.creapolis.solennix.feature.dashboard.viewmodel.StatusCount

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    viewModel: DashboardViewModel,
    onEventClick: (String) -> Unit = {},
    onInventoryClick: (String) -> Unit = {},
    onUpgradeClick: () -> Unit = {},
    onNewEventClick: () -> Unit = {},
    onNewClientClick: () -> Unit = {},
    onSearchClick: () -> Unit = {},
    onOnboardingAction: (String) -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val isWideScreen = LocalIsWideScreen.current
    val context = LocalContext.current

    LifecycleResumeEffect(viewModel) {
        viewModel.refresh()
        onPauseOrDispose { }
    }

    // Surface ViewModel transient messages as a toast (matches Solennix Android pattern).
    LaunchedEffect(uiState.transientMessage) {
        uiState.transientMessage?.let { message ->
            Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
            viewModel.consumeTransientMessage()
        }
    }

    Scaffold(
        topBar = {
            SolennixSectionTopAppBar(
                title = "Inicio",
                onSearchClick = onSearchClick,
                actions = {
                    IconButton(onClick = { viewModel.refresh() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Actualizar")
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
                    DashboardGreetingHeader(
                        userName = uiState.userName
                    )
                }

                // Onboarding Checklist
                item {
                    var onboardingDismissed by rememberSaveable { mutableStateOf(false) }
                    val onboardingSteps = OnboardingSteps.getDefaultSteps(
                        hasClients = uiState.hasClients,
                        hasProducts = uiState.hasProducts,
                        hasEvents = uiState.hasEvents
                    )
                    OnboardingChecklist(
                        steps = onboardingSteps,
                        onStepClick = { step -> onOnboardingAction(step.action) },
                        onDismiss = { onboardingDismissed = true },
                        visible = !onboardingDismissed
                    )
                }

                // Upgrade Banner for basic plan users
                if (uiState.isBasicPlan) {
                    item {
                        UpgradeBanner(
                            message = "Potenciá tu negocio con el plan Pro: eventos ilimitados, inventario y más.",
                            style = UpgradeBannerStyle.PROMO,
                            onUpgradeClick = onUpgradeClick
                        )
                    }
                }

                // Pending Events Banner
                if (uiState.pendingEvents.isNotEmpty()) {
                    item {
                        Spacer(modifier = Modifier.height(8.dp))
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.warning.copy(alpha = 0.1f)),
                            shape = MaterialTheme.shapes.medium
                        ) {
                            Column(modifier = Modifier.padding(16.dp)) {
                                Text(
                                    text = "Requieren atención (${uiState.pendingEvents.size})",
                                    style = MaterialTheme.typography.titleSmall,
                                    color = SolennixTheme.colors.warning,
                                    fontWeight = FontWeight.SemiBold
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                uiState.pendingEvents.forEach { pendingEvent ->
                                    PendingEventItem(
                                        pendingEvent = pendingEvent,
                                        isUpdating = uiState.updatingEventId == pendingEvent.event.id,
                                        onClick = { onEventClick(pendingEvent.event.id) },
                                        onComplete = {
                                            viewModel.updateEventStatus(pendingEvent.event.id, EventStatus.COMPLETED)
                                        },
                                        onCancel = {
                                            viewModel.updateEventStatus(pendingEvent.event.id, EventStatus.CANCELLED)
                                        },
                                        onRegisterPayment = {
                                            viewModel.openPaymentModal(pendingEvent)
                                        }
                                    )
                                }
                            }
                        }
                    }
                }

                // KPI Cards
                item {
                    if (isWideScreen) {
                        val kpiItems = listOf(
                            Triple("Ventas Netas", uiState.revenueThisMonth.asMXN(), Triple(Icons.Default.AttachMoney, SolennixTheme.colors.kpiGreen, "Eventos confirmados y completados")),
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
                                    modifier = Modifier.fillMaxWidth().height(IntrinsicSize.Max),
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
                                            modifier = Modifier.weight(1f).fillMaxHeight()
                                        )
                                    }
                                    repeat(4 - rowItems.size) {
                                        Spacer(modifier = Modifier.weight(1f))
                                    }
                                }
                                Spacer(modifier = Modifier.height(12.dp))
                            }
                        }
                    } else {
                        Row(
                            modifier = Modifier
                                .horizontalScroll(rememberScrollState())
                                .padding(vertical = 8.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Spacer(modifier = Modifier.width(4.dp))
                            KPICard(title = "Ventas Netas", value = uiState.revenueThisMonth.asMXN(), icon = Icons.Default.AttachMoney, iconColor = SolennixTheme.colors.kpiGreen, subtitle = "Eventos confirmados y completados")
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

                // Quick Action Buttons
                item {
                    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        QuickActionButton("Nuevo Evento", Icons.Default.Event, SolennixTheme.colors.primary, onNewEventClick, Modifier.weight(1f))
                        QuickActionButton("Nuevo Cliente", Icons.Default.PersonAdd, SolennixTheme.colors.kpiBlue, onNewClientClick, Modifier.weight(1f))
                    }
                }

                // Status Distribution + Financial Comparison
                if (uiState.statusDistribution.isNotEmpty()) {
                    item {
                        Spacer(modifier = Modifier.height(24.dp))
                        AdaptiveDetailLayout(
                            left = {
                                EventStatusDistributionCard(
                                    statusCounts = uiState.statusDistribution,
                                    modifier = Modifier.fillMaxHeight()
                                )
                            },
                            right = {
                                FinancialComparisonCard(
                                    revenueThisMonth = uiState.revenueThisMonth,
                                    cashCollected = uiState.cashCollected,
                                    vatOutstanding = uiState.vatOutstanding,
                                    modifier = Modifier.fillMaxHeight()
                                )
                            }
                        )
                    }
                }

                // Low Stock Alerts
                if (uiState.lowStockItems.isNotEmpty()) {
                    item {
                        Spacer(modifier = Modifier.height(24.dp))
                        Text(
                            text = "Alertas de Inventario",
                            modifier = Modifier.semantics { heading() },
                            style = MaterialTheme.typography.titleMedium,
                            color = SolennixTheme.colors.primaryText
                        )
                        uiState.lowStockItems.forEach { item ->
                            InventoryAlertItem(item = item, onClick = { onInventoryClick(item.id) })
                        }
                    }
                }

                // Upcoming Events
                if (uiState.upcomingEvents.isNotEmpty()) {
                    item {
                        Spacer(modifier = Modifier.height(24.dp))
                        Text(
                            text = "Próximos Eventos",
                            modifier = Modifier.semantics { heading() },
                            style = MaterialTheme.typography.titleMedium,
                            color = SolennixTheme.colors.primaryText
                        )
                        uiState.upcomingEvents.forEach { event ->
                            EventListItem(
                                event = event,
                                clientName = uiState.clientMap[event.clientId],
                                onClick = { onEventClick(event.id) }
                            )
                        }
                    }
                }

                item {
                    Spacer(modifier = Modifier.height(32.dp))
                }
            }
            }
        }

        uiState.paymentModalEvent?.let { pe ->
            val isOverdueWithBalance =
                pe.reason == PendingEventReason.OVERDUE_EVENT && pe.pendingAmount > MIN_PENDING_AMOUNT
            val (modalTitle, confirmLabel) = if (isOverdueWithBalance) {
                "Registrar pago y completar" to "Pagar y completar"
            } else {
                "Registrar pago" to "Guardar Pago"
            }
            PaymentModal(
                remaining = pe.pendingAmount,
                initialAmount = pe.pendingAmount.takeIf { it > 0 },
                title = modalTitle,
                confirmLabel = confirmLabel,
                onDismiss = { viewModel.dismissPaymentModal() },
                onConfirm = { amount, method, notes, date ->
                    viewModel.registerPayment(
                        pendingEvent = pe,
                        amount = amount,
                        method = method,
                        notes = notes,
                        date = date,
                        autoComplete = isOverdueWithBalance
                    )
                }
            )
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
            Text(
                "Estado de Eventos",
                style = MaterialTheme.typography.titleSmall,
                color = SolennixTheme.colors.primaryText,
                fontWeight = FontWeight.SemiBold
            )
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
fun PendingEventItem(
    pendingEvent: PendingEvent,
    isUpdating: Boolean = false,
    onClick: () -> Unit = {},
    onComplete: () -> Unit = {},
    onCancel: () -> Unit = {},
    onRegisterPayment: () -> Unit = {}
) {
    val hasPending = pendingEvent.pendingAmount > MIN_PENDING_AMOUNT
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .semantics(mergeDescendants = true) {
                contentDescription = pendingEventTalkBackLabel(pendingEvent)
            }
            .clickable(enabled = !isUpdating, onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.medium
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
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
                        text = pendingEvent.reasonLabel,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                        color = SolennixTheme.colors.warning,
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            PendingEventActions(
                reason = pendingEvent.reason,
                hasPending = hasPending,
                isUpdating = isUpdating,
                onComplete = onComplete,
                onCancel = onCancel,
                onRegisterPayment = onRegisterPayment,
                onViewDetail = onClick
            )
        }
    }
}

@Composable
private fun PendingEventActions(
    reason: PendingEventReason,
    hasPending: Boolean,
    isUpdating: Boolean,
    onComplete: () -> Unit,
    onCancel: () -> Unit,
    onRegisterPayment: () -> Unit,
    onViewDetail: () -> Unit
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        when (reason) {
            PendingEventReason.PAYMENT_DUE -> {
                Button(
                    onClick = onRegisterPayment,
                    enabled = !isUpdating,
                    colors = ButtonDefaults.buttonColors(containerColor = SolennixTheme.colors.primary)
                ) { Text("Registrar pago") }
                TextButton(onClick = onViewDetail, enabled = !isUpdating) { Text("Ver") }
            }
            PendingEventReason.OVERDUE_EVENT -> {
                if (hasPending) {
                    Button(
                        onClick = onRegisterPayment,
                        enabled = !isUpdating,
                        colors = ButtonDefaults.buttonColors(containerColor = SolennixTheme.colors.primary)
                    ) { Text("Pagar y completar") }
                    OutlinedButton(
                        onClick = onCancel,
                        enabled = !isUpdating,
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = SolennixTheme.colors.error)
                    ) { Text("Cancelar") }
                    TextButton(onClick = onComplete, enabled = !isUpdating) { Text("Solo completar") }
                } else {
                    Button(
                        onClick = onComplete,
                        enabled = !isUpdating,
                        colors = ButtonDefaults.buttonColors(containerColor = SolennixTheme.colors.success)
                    ) { Text("Completar") }
                    OutlinedButton(
                        onClick = onCancel,
                        enabled = !isUpdating,
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = SolennixTheme.colors.error)
                    ) { Text("Cancelar") }
                }
            }
            PendingEventReason.QUOTE_URGENT -> {
                TextButton(onClick = onViewDetail, enabled = !isUpdating) { Text("Ver detalle") }
            }
        }

        if (isUpdating) {
            Spacer(modifier = Modifier.width(4.dp))
            CircularProgressIndicator(
                modifier = Modifier.size(16.dp),
                strokeWidth = 2.dp,
                color = SolennixTheme.colors.primary
            )
        }
    }
}

@Composable
fun EventListItem(event: Event, clientName: String? = null, onClick: () -> Unit = {}) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .semantics(mergeDescendants = true) {
                contentDescription = dashboardEventTalkBackLabel(event, clientName)
            }
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.medium
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            DateBox(dateString = event.eventDate)
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                if (!clientName.isNullOrEmpty()) {
                    Text(
                        text = clientName,
                        style = MaterialTheme.typography.titleSmall,
                        color = SolennixTheme.colors.primaryText
                    )
                }
                Text(
                    text = event.serviceType,
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText
                )
            }
            StatusBadge(status = event.status.name)
        }
    }
}

@Composable
private fun DashboardGreetingHeader(
    userName: String,
    modifier: Modifier = Modifier
) {
    val today = remember {
        val now = java.time.LocalDate.now()
        val formatter = java.time.format.DateTimeFormatter
            .ofPattern("EEEE d 'de' MMMM", java.util.Locale("es", "MX"))
        now.format(formatter).replaceFirstChar { it.uppercase() }
    }
    Row(
        modifier = modifier.fillMaxWidth().padding(vertical = 16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = if (userName.isNotEmpty()) "Hola, $userName" else "Hola",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.Bold,
                color = SolennixTheme.colors.primaryText
            )
            Text(
                text = today,
                style = MaterialTheme.typography.bodyMedium,
                color = SolennixTheme.colors.secondaryText
            )
        }
    }
}

@Composable
private fun QuickActionButton(
    label: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    containerColor: Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val isLargeFontScale = LocalDensity.current.fontScale >= 1.3f
    Button(
        onClick = onClick,
        modifier = modifier.heightIn(min = if (isLargeFontScale) 60.dp else 52.dp),
        colors = ButtonDefaults.buttonColors(containerColor = containerColor),
        shape = RoundedCornerShape(12.dp),
        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)
    ) {
        Icon(icon, contentDescription = null, modifier = Modifier.size(18.dp), tint = Color.White)
        Spacer(modifier = Modifier.width(6.dp))
        Text(
            label,
            style = MaterialTheme.typography.labelMedium,
            color = Color.White,
            maxLines = if (isLargeFontScale) 2 else 1,
            overflow = if (isLargeFontScale) TextOverflow.Clip else TextOverflow.Ellipsis
        )
    }
}

@Composable
private fun DateBox(dateString: String, modifier: Modifier = Modifier) {
    val (month, day) = remember(dateString) {
        val parsed = try {
            parseFlexibleDate(dateString)
        } catch (_: Exception) { null }
        if (parsed != null) {
            val monthAbbr = parsed.month.getDisplayName(
                java.time.format.TextStyle.SHORT, java.util.Locale("es", "MX")
            ).replaceFirstChar { it.uppercase() }
            monthAbbr to parsed.dayOfMonth.toString()
        } else "" to ""
    }
    Box(modifier = modifier.size(48.dp).clip(RoundedCornerShape(10.dp))
        .background(SolennixTheme.colors.primaryLight),
        contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(month, style = MaterialTheme.typography.labelSmall,
                color = SolennixTheme.colors.primary, fontWeight = FontWeight.SemiBold)
            Text(day, style = MaterialTheme.typography.titleMedium,
                color = SolennixTheme.colors.primary, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun FinancialComparisonCard(
    revenueThisMonth: Double, cashCollected: Double, vatOutstanding: Double,
    modifier: Modifier = Modifier
) {
    val maxValue = maxOf(revenueThisMonth, cashCollected, vatOutstanding, 1.0)
    Card(modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.large) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("Comparativa Financiera", style = MaterialTheme.typography.titleSmall,
                color = SolennixTheme.colors.primaryText, fontWeight = FontWeight.SemiBold)
            FinancialBar("Ventas Netas", revenueThisMonth, maxValue, SolennixTheme.colors.kpiGreen)
            FinancialBar("Cobrado Real", cashCollected, maxValue, SolennixTheme.colors.primary)
            FinancialBar("IVA por Cobrar", vatOutstanding, maxValue, SolennixTheme.colors.kpiRed)
        }
    }
}

@Composable
private fun FinancialBar(label: String, value: Double, maxValue: Double, barColor: Color) {
    val fraction = (value / maxValue).coerceIn(0.0, 1.0).toFloat()
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(label, style = MaterialTheme.typography.bodySmall, color = SolennixTheme.colors.secondaryText)
            Text(value.asMXN(), style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.Medium, color = SolennixTheme.colors.primaryText)
        }
        Box(modifier = Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(4.dp))
            .background(SolennixTheme.colors.surfaceAlt)) {
            Box(modifier = Modifier.fillMaxWidth(fraction).fillMaxHeight()
                .clip(RoundedCornerShape(4.dp)).background(barColor))
        }
    }
}

@Composable
fun InventoryAlertItem(item: InventoryItem, onClick: () -> Unit = {}) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .semantics(mergeDescendants = true) {
                contentDescription = inventoryAlertTalkBackLabel(item)
            }
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

internal fun pendingEventTalkBackLabel(pendingEvent: PendingEvent): String {
    return buildString {
        append("Evento pendiente")
        append(": ${pendingEvent.event.serviceType}")
        append(", fecha ${pendingEvent.event.eventDate}")
        append(", motivo ${pendingEvent.reasonLabel}")
    }
}

internal fun dashboardEventTalkBackLabel(event: Event, clientName: String?): String {
    return buildString {
        clientName?.takeIf { it.isNotBlank() }?.let { append("$it, ") }
        append(event.serviceType)
        append(", fecha ${event.eventDate}")
        append(", estado ${statusLabel(event.status)}")
    }
}

internal fun inventoryAlertTalkBackLabel(item: InventoryItem): String {
    return "Stock bajo: ${item.ingredientName}, actual ${item.currentStock} ${item.unit}"
}
