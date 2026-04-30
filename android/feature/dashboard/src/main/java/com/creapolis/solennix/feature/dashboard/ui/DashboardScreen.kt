package com.creapolis.solennix.feature.dashboard.ui

import android.content.Context
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
import androidx.compose.ui.res.stringResource
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
import com.creapolis.solennix.core.model.extensions.asMXNCompact
import com.creapolis.solennix.core.model.extensions.parseFlexibleDate
import com.creapolis.solennix.feature.dashboard.R
import com.creapolis.solennix.feature.dashboard.viewmodel.DashboardViewModel
import com.creapolis.solennix.feature.dashboard.viewmodel.MIN_PENDING_AMOUNT
import com.creapolis.solennix.feature.dashboard.viewmodel.PendingEvent
import com.creapolis.solennix.feature.dashboard.viewmodel.PendingEventReason
import com.creapolis.solennix.feature.dashboard.viewmodel.StatusCount
import java.text.NumberFormat
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.Currency
import java.util.Locale

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
                title = stringResource(R.string.dashboard_title),
                onSearchClick = onSearchClick,
                actions = {
                    IconButton(onClick = { viewModel.refresh() }) {
                        Icon(Icons.Default.Refresh, contentDescription = stringResource(R.string.dashboard_refresh))
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
                            message = stringResource(R.string.dashboard_upgrade_banner),
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
                                    text = stringResource(R.string.dashboard_attention_title_with_count, uiState.pendingEvents.size),
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
                            Triple(stringResource(R.string.dashboard_kpi_net_sales), uiState.revenueThisMonth.asMXNCompact(), Triple(Icons.Default.AttachMoney, SolennixTheme.colors.kpiGreen, stringResource(R.string.dashboard_kpi_confirmed_completed))),
                            Triple(stringResource(R.string.dashboard_kpi_collected), uiState.cashCollected.asMXNCompact(), Triple(Icons.Default.Payments, SolennixTheme.colors.kpiOrange, stringResource(R.string.dashboard_kpi_this_month))),
                            Triple(stringResource(R.string.dashboard_kpi_vat_collected), uiState.vatCollected.asMXNCompact(), Triple(Icons.Default.Receipt, SolennixTheme.colors.kpiBlue, stringResource(R.string.dashboard_kpi_this_month))),
                            Triple(stringResource(R.string.dashboard_kpi_vat_outstanding), uiState.vatOutstanding.asMXNCompact(), Triple(Icons.Default.ReceiptLong, SolennixTheme.colors.kpiBlue, stringResource(R.string.dashboard_kpi_due))),
                            Triple(stringResource(R.string.dashboard_kpi_events_this_month), uiState.eventsThisMonth.toString(), Triple(Icons.Default.CalendarMonth, SolennixTheme.colors.kpiOrange, null)),
                            Triple(stringResource(R.string.dashboard_kpi_low_stock), uiState.lowStockCount.toString(), Triple(Icons.Default.Inventory2, if (uiState.lowStockCount > 0) SolennixTheme.colors.kpiOrange else SolennixTheme.colors.kpiGreen, null)),
                            Triple(stringResource(R.string.dashboard_kpi_clients), uiState.totalClients.toString(), Triple(Icons.Default.People, SolennixTheme.colors.kpiBlue, stringResource(R.string.dashboard_kpi_total))),
                            Triple(stringResource(R.string.dashboard_kpi_quotes), uiState.pendingQuotes.toString(), Triple(Icons.Default.RequestQuote, SolennixTheme.colors.kpiOrange, null))
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
                        // Fixed-width cards in the horizontal-scroll row so every
                        // card has identical width and short values (e.g. "3") stay
                        // visually centered. The prior `defaultMinSize` on KPICard
                        // was letting content with a narrow intrinsic size collapse
                        // and anchor to the start edge inside the scroll.
                        val isLargeFontScale = LocalDensity.current.fontScale >= 1.3f
                        val scrollCardWidth = if (isLargeFontScale) 180.dp else 160.dp
                        val cardModifier = Modifier.width(scrollCardWidth)
                        Row(
                            modifier = Modifier
                                .horizontalScroll(rememberScrollState())
                                .padding(vertical = 8.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            Spacer(modifier = Modifier.width(4.dp))
                            KPICard(title = stringResource(R.string.dashboard_kpi_net_sales), value = uiState.revenueThisMonth.asMXNCompact(), icon = Icons.Default.AttachMoney, iconColor = SolennixTheme.colors.kpiGreen, subtitle = stringResource(R.string.dashboard_kpi_confirmed_completed), modifier = cardModifier)
                            KPICard(title = stringResource(R.string.dashboard_kpi_collected), value = uiState.cashCollected.asMXNCompact(), icon = Icons.Default.Payments, iconColor = SolennixTheme.colors.kpiOrange, subtitle = stringResource(R.string.dashboard_kpi_this_month), modifier = cardModifier)
                            KPICard(title = stringResource(R.string.dashboard_kpi_vat_collected), value = uiState.vatCollected.asMXNCompact(), icon = Icons.Default.Receipt, iconColor = SolennixTheme.colors.kpiBlue, subtitle = stringResource(R.string.dashboard_kpi_this_month), modifier = cardModifier)
                            KPICard(title = stringResource(R.string.dashboard_kpi_vat_outstanding), value = uiState.vatOutstanding.asMXNCompact(), icon = Icons.Default.ReceiptLong, iconColor = SolennixTheme.colors.kpiBlue, subtitle = stringResource(R.string.dashboard_kpi_due), modifier = cardModifier)
                            KPICard(title = stringResource(R.string.dashboard_kpi_events_this_month), value = uiState.eventsThisMonth.toString(), icon = Icons.Default.CalendarMonth, iconColor = SolennixTheme.colors.kpiOrange, modifier = cardModifier)
                            KPICard(title = stringResource(R.string.dashboard_kpi_low_stock), value = uiState.lowStockCount.toString(), icon = Icons.Default.Inventory2, iconColor = if (uiState.lowStockCount > 0) SolennixTheme.colors.kpiOrange else SolennixTheme.colors.kpiGreen, modifier = cardModifier)
                            KPICard(title = stringResource(R.string.dashboard_kpi_clients), value = uiState.totalClients.toString(), icon = Icons.Default.People, iconColor = SolennixTheme.colors.kpiBlue, subtitle = stringResource(R.string.dashboard_kpi_total), modifier = cardModifier)
                            KPICard(title = stringResource(R.string.dashboard_kpi_quotes), value = uiState.pendingQuotes.toString(), icon = Icons.Default.RequestQuote, iconColor = SolennixTheme.colors.kpiOrange, modifier = cardModifier)
                            Spacer(modifier = Modifier.width(4.dp))
                        }
                    }
                }

                // Quick Action Buttons
                item {
                    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        QuickActionButton(stringResource(R.string.dashboard_quick_new_event), Icons.Default.Event, SolennixTheme.colors.primary, onNewEventClick, Modifier.weight(1f))
                        QuickActionButton(stringResource(R.string.dashboard_quick_new_client), Icons.Default.PersonAdd, SolennixTheme.colors.kpiBlue, onNewClientClick, Modifier.weight(1f))
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

                // Premium: 6-month revenue trend. Only rendered for Pro/Business
                // plans to match iOS and Web. Non-premium users do not see an
                // upsell here — upsell surfaces live elsewhere in the app.
                if (!uiState.isBasicPlan && uiState.monthlyRevenueTrend.isNotEmpty()) {
                    item {
                        Spacer(modifier = Modifier.height(24.dp))
                        MonthlyRevenueTrendCard(points = uiState.monthlyRevenueTrend)
                    }
                }

                // Low Stock Alerts
                if (uiState.lowStockItems.isNotEmpty()) {
                    item {
                        Spacer(modifier = Modifier.height(24.dp))
                        Text(
                            text = stringResource(R.string.dashboard_inventory_alerts),
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
                            text = stringResource(R.string.dashboard_upcoming_events),
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

                // Analytics Widgets
                item {
                    Spacer(modifier = Modifier.height(24.dp))
                    TopClientsWidget(
                        clients = uiState.topClients,
                        isLoading = uiState.isRefreshing,
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                item {
                    Spacer(modifier = Modifier.height(12.dp))
                    ProductDemandWidget(
                        products = uiState.productDemand,
                        isLoading = uiState.isRefreshing,
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                item {
                    Spacer(modifier = Modifier.height(12.dp))
                    ForecastWidget(
                        forecast = uiState.forecast,
                        isLoading = uiState.isRefreshing,
                        modifier = Modifier.fillMaxWidth()
                    )
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
                stringResource(R.string.dashboard_attention_register_payment_and_complete) to stringResource(R.string.dashboard_attention_pay_and_complete)
            } else {
                stringResource(R.string.dashboard_attention_register_payment) to stringResource(R.string.dashboard_payment_save)
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
    val context = LocalContext.current
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
                stringResource(R.string.dashboard_event_status),
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
                            text = statusLabel(statusCount.status, context),
                            style = MaterialTheme.typography.bodyMedium,
                            color = SolennixTheme.colors.primaryText
                        )
                    }
                    Text(
                        text = stringResource(
                            R.string.dashboard_chart_count_percentage,
                            statusCount.count,
                            (statusCount.percentage * 100).toInt()
                        ),
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

private fun statusLabel(status: EventStatus, context: Context): String {
    return when (status) {
        EventStatus.QUOTED -> context.getString(R.string.dashboard_status_quoted)
        EventStatus.CONFIRMED -> context.getString(R.string.dashboard_status_confirmed)
        EventStatus.COMPLETED -> context.getString(R.string.dashboard_status_completed)
        EventStatus.CANCELLED -> context.getString(R.string.dashboard_status_cancelled)
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
    val context = LocalContext.current
    val hasPending = pendingEvent.pendingAmount > MIN_PENDING_AMOUNT
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .semantics(mergeDescendants = true) {
                contentDescription = pendingEventTalkBackLabel(pendingEvent, context)
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
                ) { Text(stringResource(R.string.dashboard_attention_register_payment)) }
                TextButton(onClick = onViewDetail, enabled = !isUpdating) { Text(stringResource(R.string.dashboard_attention_view)) }
            }
            PendingEventReason.OVERDUE_EVENT -> {
                if (hasPending) {
                    Button(
                        onClick = onRegisterPayment,
                        enabled = !isUpdating,
                        colors = ButtonDefaults.buttonColors(containerColor = SolennixTheme.colors.primary)
                    ) { Text(stringResource(R.string.dashboard_attention_pay_and_complete)) }
                    OutlinedButton(
                        onClick = onCancel,
                        enabled = !isUpdating,
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = SolennixTheme.colors.error)
                    ) { Text(stringResource(R.string.dashboard_action_cancel)) }
                    TextButton(onClick = onComplete, enabled = !isUpdating) { Text(stringResource(R.string.dashboard_attention_complete_only)) }
                } else {
                    Button(
                        onClick = onComplete,
                        enabled = !isUpdating,
                        colors = ButtonDefaults.buttonColors(containerColor = SolennixTheme.colors.success)
                    ) { Text(stringResource(R.string.dashboard_attention_complete)) }
                    OutlinedButton(
                        onClick = onCancel,
                        enabled = !isUpdating,
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = SolennixTheme.colors.error)
                    ) { Text(stringResource(R.string.dashboard_action_cancel)) }
                }
            }
            PendingEventReason.QUOTE_URGENT -> {
                TextButton(onClick = onViewDetail, enabled = !isUpdating) { Text(stringResource(R.string.dashboard_attention_view_detail)) }
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
    val context = LocalContext.current
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .semantics(mergeDescendants = true) {
                contentDescription = dashboardEventTalkBackLabel(event, clientName, context)
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
    val context = LocalContext.current
    val locale = currentAppLocale(context)
    val today = remember(locale) {
        val now = LocalDate.now()
        val formatter = DateTimeFormatter
            .ofPattern(context.getString(R.string.dashboard_greeting_date_pattern), locale)
        now.format(formatter).replaceFirstChar { it.uppercase() }
    }
    Row(
        modifier = modifier.fillMaxWidth().padding(vertical = 16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = if (userName.isNotEmpty()) context.getString(R.string.dashboard_greeting_with_name, userName) else context.getString(R.string.dashboard_greeting_generic),
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
    val context = LocalContext.current
    val locale = currentAppLocale(context)
    val (month, day) = remember(dateString, locale) {
        val parsed = try {
            parseFlexibleDate(dateString)
        } catch (_: Exception) { null }
        if (parsed != null) {
            val monthAbbr = parsed.month.getDisplayName(
                TextStyle.SHORT,
                locale
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
private fun MonthlyRevenueTrendCard(points: List<com.creapolis.solennix.core.model.DashboardRevenuePoint>) {
    val context = LocalContext.current
    val locale = currentAppLocale(context)
    val maxRevenue = points.maxOfOrNull { it.revenue }?.takeIf { it > 0 } ?: 1.0
    val monthLabelFormatter = remember(locale) {
        DateTimeFormatter.ofPattern(context.getString(R.string.dashboard_month_short_pattern), locale)
    }
    // 4 gridlines + baseline at $0 → matches iOS's AxisMarks(leading) look.
    // We pick nice round fractions of the max so labels are "$0", "2k",
    // "5k", "7k", "10k" equivalents regardless of the actual peak.
    val yTicks = remember(maxRevenue) {
        listOf(0.0, 0.25, 0.5, 0.75, 1.0).map { it * maxRevenue }
    }
    val yAxisLabelFormatter: (Double) -> String = remember {
        { value -> formatAxisCurrencyLabel(value, locale) }
    }
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.large
    ) {
        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(
                stringResource(R.string.dashboard_revenue_last_6_months),
                style = MaterialTheme.typography.titleSmall,
                color = SolennixTheme.colors.primaryText,
                fontWeight = FontWeight.SemiBold
            )
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(140.dp)
            ) {
                // Y-axis labels column (top=max, bottom=$0) — mirrors iOS's
                // AxisMarks(position: .leading). Tiny fixed width so bars
                // still get most of the horizontal space.
                Column(
                    modifier = Modifier
                        .width(36.dp)
                        .fillMaxHeight(),
                    horizontalAlignment = Alignment.End,
                    verticalArrangement = Arrangement.SpaceBetween
                ) {
                    yTicks.reversed().forEach { tick ->
                        Text(
                            yAxisLabelFormatter(tick),
                            style = MaterialTheme.typography.labelSmall,
                            color = SolennixTheme.colors.tertiaryText
                        )
                    }
                }
                Spacer(modifier = Modifier.width(4.dp))
                // Bars column — each bar fills its weight slot and stacks
                // from bottom, matching the iOS BarMark(y:) behavior.
                Row(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.Bottom
                ) {
                    points.forEach { point ->
                        val fraction = (point.revenue / maxRevenue).coerceIn(0.0, 1.0).toFloat()
                        val monthLabel = try {
                            val parsed = YearMonth.parse(point.month)
                            parsed.format(monthLabelFormatter).replaceFirstChar { it.uppercase() }
                        } catch (_: Exception) {
                            point.month
                        }
                        Column(
                            modifier = Modifier
                                .weight(1f)
                                .fillMaxHeight(),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Bottom
                        ) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .weight(1f),
                                contentAlignment = Alignment.BottomCenter
                            ) {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth(0.7f)
                                        .fillMaxHeight(fraction.coerceAtLeast(0.02f))
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(SolennixTheme.colors.primary)
                                )
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                monthLabel,
                                style = MaterialTheme.typography.labelSmall,
                                color = SolennixTheme.colors.secondaryText
                            )
                        }
                    }
                }
            }
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
            Text(stringResource(R.string.dashboard_financial_comparison), style = MaterialTheme.typography.titleSmall,
                color = SolennixTheme.colors.primaryText, fontWeight = FontWeight.SemiBold)
            FinancialBar(stringResource(R.string.dashboard_kpi_net_sales), revenueThisMonth, maxValue, SolennixTheme.colors.kpiGreen)
            FinancialBar(stringResource(R.string.dashboard_kpi_collected), cashCollected, maxValue, SolennixTheme.colors.primary)
            FinancialBar(stringResource(R.string.dashboard_kpi_vat_outstanding), vatOutstanding, maxValue, SolennixTheme.colors.kpiRed)
        }
    }
}

@Composable
private fun FinancialBar(label: String, value: Double, maxValue: Double, barColor: Color) {
    val fraction = (value / maxValue).coerceIn(0.0, 1.0).toFloat()
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(label, style = MaterialTheme.typography.bodySmall, color = SolennixTheme.colors.secondaryText)
            Text(value.asMXNCompact(), style = MaterialTheme.typography.bodySmall,
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
    val context = LocalContext.current
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .semantics(mergeDescendants = true) {
                contentDescription = inventoryAlertTalkBackLabel(item, context)
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
                    text = stringResource(R.string.dashboard_low_stock_current, item.currentStock.toString(), item.unit),
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.error
                )
            }
        }
    }
}

internal fun pendingEventTalkBackLabel(pendingEvent: PendingEvent, context: Context): String {
    return context.getString(
        R.string.dashboard_a11y_pending_event,
        pendingEvent.reasonLabel,
        pendingEvent.event.serviceType,
        pendingEvent.event.eventDate,
        pendingEvent.reasonLabel
    )
}

internal fun dashboardEventTalkBackLabel(event: Event, clientName: String?, context: Context): String {
    return clientName
        ?.takeIf { it.isNotBlank() }
        ?.let {
            context.getString(
                R.string.dashboard_a11y_event_with_client,
                it,
                event.serviceType,
                event.eventDate,
                statusLabel(event.status, context)
            )
        }
        ?: context.getString(
            R.string.dashboard_a11y_event,
            event.serviceType,
            event.eventDate,
            statusLabel(event.status, context)
        )
}

internal fun inventoryAlertTalkBackLabel(item: InventoryItem, context: Context): String {
    return context.getString(
        R.string.dashboard_a11y_inventory_alert,
        item.ingredientName,
        item.currentStock.toString(),
        item.unit
    )
}

private fun currentAppLocale(context: Context): Locale {
    return context.resources.configuration.locales[0] ?: Locale.getDefault()
}

private fun formatAxisCurrencyLabel(value: Double, locale: Locale): String {
    val currencySymbol = Currency.getInstance("MXN").getSymbol(locale)
    if (value == 0.0) return "${currencySymbol}0"
    val absValue = kotlin.math.abs(value)
    val (divisor, suffix) = when {
        absValue >= 1_000_000 -> 1_000_000.0 to "M"
        absValue >= 1_000 -> 1_000.0 to "K"
        else -> 1.0 to ""
    }
    val formatter = NumberFormat.getNumberInstance(locale).apply {
        maximumFractionDigits = if (divisor == 1.0 || absValue / divisor >= 10) 0 else 1
        minimumFractionDigits = 0
    }

    return "$currencySymbol${formatter.format(value / divisor)}$suffix"
}
