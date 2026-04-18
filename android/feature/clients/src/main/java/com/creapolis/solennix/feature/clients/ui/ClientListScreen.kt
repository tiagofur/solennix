package com.creapolis.solennix.feature.clients.ui

import android.content.Context
import android.content.Intent
import android.widget.Toast
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.FileDownload
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
import androidx.compose.ui.graphics.Color
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import androidx.lifecycle.compose.LifecycleResumeEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.component.Avatar
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.component.UpgradeBanner
import com.creapolis.solennix.core.designsystem.component.UpgradeBannerStyle
import com.creapolis.solennix.core.designsystem.component.UpgradePlanDialog
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveCardGrid
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.network.UrlResolver
import com.creapolis.solennix.core.model.Client
import com.creapolis.solennix.core.model.extensions.asMXN
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
            putExtra(Intent.EXTRA_SUBJECT, "Clientes - Exportación CSV")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(intent, "Exportar Clientes"))
    } catch (e: Exception) {
        Toast.makeText(context, "Error al exportar: ${e.message}", Toast.LENGTH_SHORT).show()
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ClientListScreen(
    viewModel: ClientListViewModel,
    onClientClick: (String) -> Unit,
    onAddClientClick: () -> Unit,
    onSearchClick: () -> Unit = {},
    onUpgradeClick: () -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current
    var showLimitDialog by remember { mutableStateOf(false) }

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
                title = { Text("Clientes") },
                onSearchClick = onSearchClick,
                actions = {
                    IconButton(onClick = {
                        val csv = viewModel.generateCsvContent()
                        exportClientsCsv(context, csv)
                    }) {
                        Icon(Icons.Default.FileDownload, contentDescription = "Exportar CSV")
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
                Icon(Icons.Default.Add, contentDescription = "Agregar Cliente")
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
                        .padding(16.dp),
                    placeholder = { Text("Filtrar clientes por nombre o teléfono...") },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                    shape = MaterialTheme.shapes.medium,
                    singleLine = true
                )

                // Sort chips
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState())
                        .padding(horizontal = 16.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    ClientSortOption.entries.forEach { option ->
                        FilterChip(
                            selected = uiState.sortOption == option,
                            onClick = { viewModel.onSortOptionChange(option) },
                            label = { Text(option.label) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = SolennixTheme.colors.primaryLight,
                                selectedLabelColor = SolennixTheme.colors.primary
                            )
                        )
                    }
                }

                if (uiState.isLoading && uiState.clients.isEmpty()) {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator()
                    }
                } else {
                    AdaptiveCardGrid(
                        gridContent = {
                            items(uiState.clients, key = { it.id }) { client ->
                                Card(
                                    onClick = { onClientClick(client.id) },
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                                    shape = MaterialTheme.shapes.medium
                                ) {
                                    ClientListItem(
                                        client = client,
                                        onClick = { onClientClick(client.id) }
                                    )
                                }
                            }
                        },
                        listContent = {
                            items(uiState.clients, key = { it.id }) { client ->
                                ClientListItem(
                                    client = client,
                                    onClick = { onClientClick(client.id) }
                                )
                                HorizontalDivider(
                                    modifier = Modifier.padding(horizontal = 16.dp),
                                    color = SolennixTheme.colors.divider.copy(alpha = 0.5f)
                                )
                            }
                        }
                    )
                }
            }
        }
    }
}

@Composable
fun ClientListItem(
    client: Client,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Avatar(name = client.name, photoUrl = UrlResolver.resolve(client.photoUrl), size = 48.dp)
        Spacer(modifier = Modifier.width(16.dp))
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
            val statsItems = mutableListOf<String>()
            client.totalEvents?.let { if (it > 0) statsItems.add("$it eventos") }
            client.totalSpent?.let { if (it > 0.0) statsItems.add(it.asMXN()) }
            if (statsItems.isNotEmpty()) {
                Text(
                    text = statsItems.joinToString(" · "),
                    style = MaterialTheme.typography.labelSmall,
                    color = SolennixTheme.colors.primary
                )
            }
        }
    }
}
