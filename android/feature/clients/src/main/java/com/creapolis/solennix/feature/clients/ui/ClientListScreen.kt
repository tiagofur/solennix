package com.creapolis.solennix.feature.clients.ui

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.FileDownload
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import com.creapolis.solennix.core.designsystem.theme.Spacing
import androidx.lifecycle.compose.LifecycleResumeEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.component.Avatar
import com.creapolis.solennix.core.designsystem.component.EmptyState
import com.creapolis.solennix.core.designsystem.component.SkeletonLoading
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.component.SwipeRevealActions
import com.creapolis.solennix.core.designsystem.component.UpgradeBanner
import com.creapolis.solennix.core.designsystem.component.UpgradeBannerStyle
import com.creapolis.solennix.core.designsystem.component.UpgradePlanDialog
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveCardGrid
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.network.UrlResolver
import com.creapolis.solennix.core.model.Client
import com.creapolis.solennix.core.model.extensions.asMXN
import com.creapolis.solennix.feature.clients.R
import com.creapolis.solennix.feature.clients.viewmodel.ClientListViewModel
import com.creapolis.solennix.feature.clients.viewmodel.ClientSortOption
import java.io.File

private fun exportClientsCsv(context: Context, csvContent: String) {
    try {
        val file = File(context.cacheDir, "clientes.csv")
        file.writeText(csvContent)
        val uri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            file
        )
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "text/csv"
            putExtra(Intent.EXTRA_STREAM, uri)
            putExtra(Intent.EXTRA_SUBJECT, context.getString(R.string.clients_export_subject))
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(intent, context.getString(R.string.clients_export_chooser)))
    } catch (e: Exception) {
        Toast.makeText(
            context,
            context.getString(R.string.clients_export_error, e.message ?: ""),
            Toast.LENGTH_SHORT
        ).show()
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClientListScreen(
    viewModel: ClientListViewModel,
    onClientClick: (String) -> Unit,
    onClientEdit: (String) -> Unit,
    onAddClientClick: () -> Unit,
    onSearchClick: () -> Unit = {},
    onUpgradeClick: () -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current
    var showLimitDialog by remember { mutableStateOf(false) }
    var rowActionsClient by remember { mutableStateOf<Client?>(null) }
    var deleteConfirmClient by remember { mutableStateOf<Client?>(null) }
    val haptic = LocalHapticFeedback.current
    val hapticFeedback = com.creapolis.solennix.core.designsystem.util.rememberHapticFeedback()

    LifecycleResumeEffect(viewModel) {
        viewModel.refresh()
        onPauseOrDispose { }
    }

    // Show limit reached dialog
    if (showLimitDialog && viewModel.limitReachedMessage != null) {
        UpgradePlanDialog(
            message = viewModel.limitReachedMessage!!,
            onUpgradeClick = {
                showLimitDialog = false
                onUpgradeClick()
            },
            onDismiss = { showLimitDialog = false }
        )
    }

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = { Text(stringResource(R.string.clients_title)) },
                onSearchClick = onSearchClick,
                actions = {
                    IconButton(onClick = {
                        val csv = viewModel.generateCsvContent()
                        exportClientsCsv(context, csv)
                    }) {
                        Icon(Icons.Default.FileDownload, contentDescription = stringResource(R.string.clients_export_csv))
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = {
                    if (viewModel.isLimitReached) showLimitDialog = true
                    else onAddClientClick()
                },
                containerColor = SolennixTheme.colors.primary,
                contentColor = Color.White
            ) {
                Icon(Icons.Default.Add, contentDescription = stringResource(R.string.clients_add_client))
            }
        },
        contentWindowInsets = WindowInsets(0)
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = uiState.isRefreshing,
            onRefresh = { viewModel.refresh() },
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // Near-limit warning banner
                viewModel.nearLimitMessage?.let { message ->
                    UpgradeBanner(
                        message = message,
                        style = UpgradeBannerStyle.WARNING,
                        onUpgradeClick = onUpgradeClick
                    )
                }
                OutlinedTextField(
                    value = uiState.searchQuery,
                    onValueChange = { viewModel.onSearchQueryChange(it) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(Spacing.md),
                    placeholder = { Text(stringResource(R.string.clients_search_placeholder)) },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                    shape = MaterialTheme.shapes.medium,
                    singleLine = true
                )

                // Sort chips
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState())
                        .padding(horizontal = Spacing.md, vertical = Spacing.xs),
                    horizontalArrangement = Arrangement.spacedBy(Spacing.sm)
                ) {
                    ClientSortOption.entries.forEach { option ->
                        FilterChip(
                            selected = uiState.sortOption == option,
                            onClick = {
                                hapticFeedback(com.creapolis.solennix.core.designsystem.util.HapticFeedbackType.SELECTION_CHANGED)
                                viewModel.onSortOptionChange(option)
                            },
                            label = { Text(stringResource(option.labelRes)) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = SolennixTheme.colors.primaryLight,
                                selectedLabelColor = SolennixTheme.colors.primary
                            )
                        )
                    }
                }

                if (uiState.isLoading && uiState.clients.isEmpty()) {
                    ClientListSkeleton()
                } else if (uiState.clients.isEmpty()) {
                    val hasActiveFilter = uiState.searchQuery.isNotEmpty()
                    EmptyState(
                        icon = Icons.Default.People,
                        title = if (hasActiveFilter) stringResource(R.string.clients_empty_search_title)
                                else stringResource(R.string.clients_empty_title),
                        message = if (hasActiveFilter) stringResource(R.string.clients_empty_search_message)
                                  else stringResource(R.string.clients_empty_message),
                        actionText = if (hasActiveFilter) null else stringResource(R.string.clients_empty_action),
                        onAction = if (hasActiveFilter) null else onAddClientClick
                    )
                } else {
                    AdaptiveCardGrid(
                        gridContent = {
                            items(uiState.clients, key = { it.id }) { client ->
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                                    shape = MaterialTheme.shapes.medium
                                ) {
                                    ClientListItem(
                                        client = client,
                                        onClick = { onClientClick(client.id) },
                                        onLongClick = {
                                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                            rowActionsClient = client
                                        }
                                    )
                                }
                            }
                        },
                        listContent = {
                            items(uiState.clients, key = { it.id }) { client ->
                                SwipeRevealActions(
                                    onEdit = { onClientEdit(client.id) },
                                    onDelete = {
                                        hapticFeedback(com.creapolis.solennix.core.designsystem.util.HapticFeedbackType.WARNING)
                                        deleteConfirmClient = client
                                    }
                                ) {
                                    Surface(color = SolennixTheme.colors.card) {
                                        ClientListItem(
                                            client = client,
                                            onClick = { onClientClick(client.id) },
                                            onLongClick = {
                                                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                                rowActionsClient = client
                                            }
                                        )
                                    }
                                }
                                HorizontalDivider(
                                    modifier = Modifier.padding(horizontal = Spacing.md),
                                    color = SolennixTheme.colors.divider.copy(alpha = 0.5f)
                                )
                            }
                        }
                    )
                }
            }
        }
    }

    rowActionsClient?.let { client ->
        ClientRowActionsBottomSheet(
            client = client,
            onEdit = {
                rowActionsClient = null
                onClientEdit(client.id)
            },
            onCall = {
                rowActionsClient = null
                try {
                    val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:${client.phone}"))
                    context.startActivity(intent)
                } catch (e: Exception) {
                    Toast.makeText(context, "No se pudo realizar la llamada", Toast.LENGTH_SHORT).show()
                }
            },
            onEmail = {
                rowActionsClient = null
                try {
                    val intent = Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:${client.email}"))
                    context.startActivity(intent)
                } catch (e: Exception) {
                    Toast.makeText(context, "No se pudo enviar el correo", Toast.LENGTH_SHORT).show()
                }
            },
            onDelete = {
                hapticFeedback(com.creapolis.solennix.core.designsystem.util.HapticFeedbackType.WARNING)
                rowActionsClient = null
                deleteConfirmClient = client
            },
            onDismiss = { rowActionsClient = null }
        )
    }

    deleteConfirmClient?.let { client ->
        AlertDialog(
            onDismissRequest = { deleteConfirmClient = null },
            title = { Text(stringResource(R.string.clients_delete_title)) },
            text = { Text(stringResource(R.string.clients_delete_message)) },
            confirmButton = {
                TextButton(onClick = {
                    hapticFeedback(com.creapolis.solennix.core.designsystem.util.HapticFeedbackType.SUCCESS)
                    viewModel.deleteClient(client.id)
                    deleteConfirmClient = null
                }) {
                    Text(stringResource(R.string.clients_delete_confirm), color = SolennixTheme.colors.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { deleteConfirmClient = null }) {
                    Text(stringResource(R.string.clients_delete_cancel))
                }
            }
        )
    }

    viewModel.deleteErrorMessage?.let { errorMsg ->
        AlertDialog(
            onDismissRequest = { viewModel.clearDeleteError() },
            title = { Text(stringResource(R.string.clients_delete_title)) },
            text = { Text(errorMsg) },
            confirmButton = {
                TextButton(onClick = { viewModel.clearDeleteError() }) {
                    Text(stringResource(R.string.clients_ok))
                }
            }
        )
    }
}

@Composable
private fun ClientListSkeleton() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = Spacing.md, vertical = Spacing.sm)
            .semantics {
                contentDescription = "Cargando clientes..."
                liveRegion = LiveRegionMode.Polite
            }
    ) {
        Surface(
            shape = MaterialTheme.shapes.medium,
            color = SolennixTheme.colors.card
        ) {
            Column {
                repeat(6) { index ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(Spacing.md),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Avatar placeholder
                        SkeletonLoading(
                            modifier = Modifier
                                .size(Spacing.xxxl)
                                .clip(MaterialTheme.shapes.medium)
                        )
                        Spacer(modifier = Modifier.width(Spacing.md))
                        Column(modifier = Modifier.weight(1f)) {
                            SkeletonLoading(
                                modifier = Modifier
                                    .height(Spacing.md)
                                    .fillMaxWidth(0.5f)
                                    .clip(MaterialTheme.shapes.small)
                            )
                            Spacer(modifier = Modifier.height(Spacing.xxs))
                            SkeletonLoading(
                                modifier = Modifier
                                    .height(Spacing.xl)
                                    .fillMaxWidth(0.35f)
                                    .clip(MaterialTheme.shapes.small)
                            )
                        }
                    }
                    if (index < 5) {
                        HorizontalDivider(
                            modifier = Modifier.padding(horizontal = Spacing.md),
                            color = SolennixTheme.colors.divider.copy(alpha = 0.3f)
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun ClientListItem(
    client: Client,
    onClick: () -> Unit,
    onLongClick: (() -> Unit)? = null
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .combinedClickable(
                onClick = onClick,
                onLongClick = onLongClick
            )
            .padding(Spacing.md),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Avatar(name = client.name, photoUrl = UrlResolver.resolve(client.photoUrl), size = 48.dp)
        Spacer(modifier = Modifier.width(Spacing.md))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = client.name,
                style = MaterialTheme.typography.titleMedium,
                color = SolennixTheme.colors.primaryText
            )
            Text(
                text = client.phone,
                style = MaterialTheme.typography.bodySmall,
                color = SolennixTheme.colors.secondaryText
            )
            // Spend anchor — show total events + total spent as separate
            // metrics for quick scanning (matches iOS spend anchor pattern).
            // Events count in secondary, spend amount in primary bold.
            client.totalEvents?.let { events ->
                if (events > 0) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = pluralStringResource(R.plurals.clients_event_count, events, events),
                            style = MaterialTheme.typography.labelSmall,
                            color = SolennixTheme.colors.secondaryText
                        )
                        client.totalSpent?.let { spent ->
                            if (spent > 0.0) {
                                Text(
                                    text = spent.asMXN(),
                                    style = MaterialTheme.typography.labelMedium,
                                    fontWeight = FontWeight.SemiBold,
                                    color = SolennixTheme.colors.primary
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
