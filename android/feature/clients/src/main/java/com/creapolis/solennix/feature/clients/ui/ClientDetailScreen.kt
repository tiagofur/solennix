package com.creapolis.solennix.feature.clients.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.TrendingUp
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.theme.Spacing
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.R as DesignSystemR
import com.creapolis.solennix.core.designsystem.component.Avatar
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.component.KPICard
import com.creapolis.solennix.core.designsystem.component.StatusBadge
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveDetailLayout
import com.creapolis.solennix.core.designsystem.theme.LocalIsWideScreen
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.network.UrlResolver
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.extensions.asMXN
import com.creapolis.solennix.core.model.extensions.toFormattedDate
import com.creapolis.solennix.feature.clients.R
import com.creapolis.solennix.feature.clients.viewmodel.ClientDetailViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClientDetailScreen(
    viewModel: ClientDetailViewModel,
    onNavigateBack: () -> Unit,
    onEditClick: (String) -> Unit,
    onSearchClick: () -> Unit = {},
    onEventClick: (String) -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val scrollState = rememberScrollState()
    var showDeleteDialog by remember { mutableStateOf(false) }
    val snackbarHostState = remember { SnackbarHostState() }

    val lifecycleOwner = androidx.lifecycle.compose.LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                viewModel.refresh()
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    // Navigate back on delete success; consume flag so re-entry doesn't re-fire.
    LaunchedEffect(viewModel.deleteSuccess) {
        if (viewModel.deleteSuccess) {
            viewModel.consumeDeleteSuccess()
            onNavigateBack()
        }
    }

    // Surface post-load errors (e.g. failed delete) via Snackbar when client is loaded.
    // Guard with client != null so we don't race with the full-screen error on initial load failure.
    LaunchedEffect(uiState.errorMessage) {
        val msg = uiState.errorMessage
        if (msg != null && uiState.client != null) {
            snackbarHostState.showSnackbar(msg)
            viewModel.onErrorShown()
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            SolennixTopAppBar(
                title = { Text(stringResource(R.string.clients_detail_title)) },
                onSearchClick = onSearchClick,
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(DesignSystemR.string.cd_back))
                    }
                },
                actions = {
                    uiState.client?.let { client ->
                        IconButton(onClick = { onEditClick(client.id) }) {
                            Icon(Icons.Default.Edit, contentDescription = stringResource(DesignSystemR.string.cd_edit))
                        }
                        IconButton(onClick = { showDeleteDialog = true }) {
                            Icon(Icons.Default.Delete, contentDescription = stringResource(DesignSystemR.string.cd_delete), tint = SolennixTheme.colors.error)
                        }
                    }
                }
            )
        }
    ) { padding ->
        if (uiState.isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else if (uiState.errorMessage != null && uiState.client == null) {
            // Full-screen error only on initial load failure (no client loaded yet).
            // Post-load errors (e.g. delete failure) surface via SnackbarHost above.
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Text(uiState.errorMessage.orEmpty(), color = SolennixTheme.colors.error)
            }
        } else if (uiState.client != null) {
            val client = uiState.client ?: return@Scaffold

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .verticalScroll(scrollState)
                    .padding(Spacing.md)
            ) {
                // --- Header: Avatar + Name ---
                val isWide = LocalIsWideScreen.current
                if (isWide) {
                    // Tablet: avatar inline with name
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Avatar(name = client.name, photoUrl = UrlResolver.resolve(client.photoUrl), size = 80.dp)
                        Spacer(modifier = Modifier.width(Spacing.lg))
                        Text(
                            text = client.name,
                            style = MaterialTheme.typography.headlineMedium,
                            color = SolennixTheme.colors.primaryText
                        )
                    }
                } else {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Avatar(name = client.name, photoUrl = UrlResolver.resolve(client.photoUrl), size = 100.dp)
                        Spacer(modifier = Modifier.height(Spacing.xxl))
                        Text(text = client.name, style = MaterialTheme.typography.headlineMedium, color = SolennixTheme.colors.primaryText)
                    }
                }

                Spacer(modifier = Modifier.height(Spacing.xl))

                // --- Contact Info + Stats: side by side on tablet ---
                AdaptiveDetailLayout(
                    left = {
                        // Contact Info Card
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                            shape = MaterialTheme.shapes.medium
                        ) {
                            Column(modifier = Modifier.padding(Spacing.lg)) {
                                Text(text = stringResource(R.string.clients_contact_info), style = MaterialTheme.typography.titleMedium, color = SolennixTheme.colors.primaryText)
                                Spacer(modifier = Modifier.height(Spacing.md))
                                InfoRow(icon = Icons.Default.Phone, label = stringResource(R.string.clients_label_phone), value = client.phone)
                                HorizontalDivider(modifier = Modifier.padding(vertical = Spacing.xxlg))
                                InfoRow(icon = Icons.Default.Email, label = stringResource(R.string.clients_label_email), value = client.email ?: stringResource(R.string.clients_not_provided))
                                val addr = client.address
                                if (!addr.isNullOrBlank()) {
                                    HorizontalDivider(modifier = Modifier.padding(vertical = Spacing.xxlg))
                                    InfoRow(icon = Icons.Default.LocationOn, label = stringResource(R.string.clients_label_address), value = addr)
                                }
                                val cCity = client.city
                                if (!cCity.isNullOrBlank()) {
                                    HorizontalDivider(modifier = Modifier.padding(vertical = Spacing.xxlg))
                                    InfoRow(icon = Icons.Default.LocationCity, label = stringResource(R.string.clients_label_city), value = cCity)
                                }
                            }
                        }

                        val cNotes = client.notes
                        if (!cNotes.isNullOrBlank()) {
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                                shape = MaterialTheme.shapes.medium
                            ) {
                                Column(modifier = Modifier.padding(Spacing.lg)) {
                                    Text(text = stringResource(R.string.clients_notes), style = MaterialTheme.typography.titleMedium, color = SolennixTheme.colors.primaryText)
                                    Spacer(modifier = Modifier.height(Spacing.sm))
                                    Text(text = cNotes, style = MaterialTheme.typography.bodyMedium, color = SolennixTheme.colors.secondaryText)
                                }
                            }
                        }
                    },
                    right = {
                        // Stats
                        Text(text = stringResource(R.string.clients_stats_title), style = MaterialTheme.typography.titleMedium, color = SolennixTheme.colors.primaryText)

                        if (uiState.isEventsLoading) {
                            Box(modifier = Modifier.fillMaxWidth().padding(vertical = Spacing.md), contentAlignment = Alignment.Center) {
                                CircularProgressIndicator(modifier = Modifier.size(24.dp))
                            }
                        } else {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Spacing.xxlg)) {
                                KPICard(title = stringResource(R.string.clients_csv_header_events), value = uiState.totalEvents.toString(), icon = Icons.Default.Event, iconColor = SolennixTheme.colors.kpiBlue, modifier = Modifier.weight(1f))
                                KPICard(title = stringResource(R.string.clients_stats_total_spent), value = uiState.totalSpent.asMXN(), icon = Icons.Default.AttachMoney, iconColor = SolennixTheme.colors.kpiGreen, modifier = Modifier.weight(1f))
                            }
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(Spacing.xxlg)) {
                                KPICard(title = stringResource(R.string.clients_stats_average), value = uiState.averagePerEvent.asMXN(), icon = Icons.AutoMirrored.Filled.TrendingUp, iconColor = SolennixTheme.colors.kpiOrange, modifier = Modifier.weight(1f))
                                val balance = uiState.pendingBalance
                                if (balance != null) {
                                    val isInFavor = balance < 0
                                    val absBalance = Math.abs(balance)
                                    val label = if (isInFavor) stringResource(R.string.clients_stats_in_favor) else stringResource(R.string.clients_stats_pending_balance)
                                    val cdText = if (isInFavor) stringResource(R.string.clients_cd_in_favor, absBalance.asMXN()) else stringResource(R.string.clients_cd_pending_balance, absBalance.asMXN())
                                    val iconColor = when {
                                        balance > 0 -> SolennixTheme.colors.warning
                                        balance < 0 -> SolennixTheme.colors.info
                                        else -> SolennixTheme.colors.success
                                    }
                                    KPICard(
                                        title = label,
                                        value = absBalance.asMXN(),
                                        icon = Icons.Default.AccountBalance,
                                        iconColor = iconColor,
                                        modifier = Modifier
                                            .weight(1f)
                                            .semantics { contentDescription = cdText }
                                    )
                                } else {
                                    Spacer(modifier = Modifier.weight(1f))
                                }
                            }
                        }
                    }
                )

                Spacer(modifier = Modifier.height(Spacing.xl))

                // --- Event History Section ---
                Text(
                    text = stringResource(R.string.clients_events_history),
                    style = MaterialTheme.typography.titleMedium,
                    color = SolennixTheme.colors.primaryText
                )
                Spacer(modifier = Modifier.height(Spacing.sm))

                if (uiState.isEventsLoading) {
                    Box(
                        modifier = Modifier.fillMaxWidth().padding(vertical = Spacing.md),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp))
                    }
                } else if (uiState.eventsLoadFailed) {
                    // Events fetch failed — surface inline error with retry so the user
                    // can distinguish a network error from a genuinely empty history.
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = Spacing.sm),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = stringResource(R.string.clients_events_load_error),
                            style = MaterialTheme.typography.bodySmall,
                            color = SolennixTheme.colors.error
                        )
                        TextButton(onClick = { viewModel.retryLoadClientEvents() }) {
                            Text(stringResource(R.string.clients_retry))
                        }
                    }
                } else if (uiState.clientEvents.isEmpty()) {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                        shape = MaterialTheme.shapes.large
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(Spacing.xxxl),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                imageVector = Icons.Default.EventBusy,
                                contentDescription = null,
                                modifier = Modifier.size(48.dp),
                                tint = SolennixTheme.colors.secondaryText.copy(alpha = 0.5f)
                            )
                            Spacer(modifier = Modifier.height(Spacing.xxlg))
                            Text(
                                text = stringResource(R.string.clients_no_events),
                                style = MaterialTheme.typography.bodyMedium,
                                color = SolennixTheme.colors.secondaryText
                            )
                        }
                    }
                } else {
                    uiState.clientEvents.forEach { event ->
                        EventHistoryItem(
                            event = event,
                            onClick = { onEventClick(event.id) }
                        )
                        Spacer(modifier = Modifier.height(Spacing.sm))
                    }
                }

                Spacer(modifier = Modifier.height(Spacing.xxxl))
            }

            // Delete confirmation dialog
            if (showDeleteDialog) {
                AlertDialog(
                    onDismissRequest = { showDeleteDialog = false },
                    title = { Text(stringResource(R.string.clients_delete_title)) },
                    text = { Text(stringResource(R.string.clients_delete_message)) },
                    confirmButton = {
                        TextButton(
                            onClick = {
                                showDeleteDialog = false
                                viewModel.deleteClient()
                            },
                            colors = ButtonDefaults.textButtonColors(contentColor = SolennixTheme.colors.error)
                        ) {
                            Text(stringResource(R.string.clients_delete_confirm))
                        }
                    },
                    dismissButton = {
                        TextButton(onClick = { showDeleteDialog = false }) {
                            Text(stringResource(R.string.clients_delete_cancel))
                        }
                    }
                )
            }
        }
    }
}

@Composable
private fun EventHistoryItem(
    event: Event,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.medium
    ) {
        Column(modifier = Modifier.padding(Spacing.md)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                StatusBadge(status = event.status.name)
                Text(
                    text = event.eventDate.toFormattedDate(),
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText
                )
            }
            Spacer(modifier = Modifier.height(Spacing.sm))
            Text(
                text = event.serviceType,
                style = MaterialTheme.typography.titleSmall,
                color = SolennixTheme.colors.primaryText,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(Spacing.xs))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "${event.numPeople} ${stringResource(R.string.clients_people_suffix)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText
                )
                Text(
                    text = event.totalAmount.asMXN(),
                    style = MaterialTheme.typography.titleSmall,
                    color = SolennixTheme.colors.primary,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}

@Composable
fun InfoRow(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(imageVector = icon, contentDescription = null, tint = SolennixTheme.colors.primary)
        Spacer(modifier = Modifier.width(Spacing.md))
        Column {
            Text(text = label, style = MaterialTheme.typography.labelSmall, color = SolennixTheme.colors.secondaryText)
            Text(text = value, style = MaterialTheme.typography.bodyLarge, color = SolennixTheme.colors.primaryText)
        }
    }
}
