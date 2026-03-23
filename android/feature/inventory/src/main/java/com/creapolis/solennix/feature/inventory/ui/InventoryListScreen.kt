package com.creapolis.solennix.feature.inventory.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowDownward
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material.icons.filled.Kitchen
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.ShoppingBasket
import androidx.compose.material.icons.filled.SortByAlpha
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material.icons.outlined.Build
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.InventoryItem
import com.creapolis.solennix.core.model.extensions.asMXN
import com.creapolis.solennix.feature.inventory.viewmodel.InventoryListViewModel
import com.creapolis.solennix.feature.inventory.viewmodel.InventorySortKey

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InventoryListScreen(
    viewModel: InventoryListViewModel,
    onItemClick: (String) -> Unit,
    onAddItemClick: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Inventario") },
                actions = {
                    // Low stock filter
                    FilterChip(
                        selected = uiState.lowStockOnly,
                        onClick = { viewModel.onLowStockToggle(!uiState.lowStockOnly) },
                        label = { Text("Stock bajo") },
                        leadingIcon = if (uiState.lowStockOnly) {
                            { Icon(Icons.Default.Warning, contentDescription = null, modifier = Modifier.size(16.dp)) }
                        } else null,
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = SolennixTheme.colors.error.copy(alpha = 0.1f),
                            selectedLabelColor = SolennixTheme.colors.error
                        ),
                        modifier = Modifier.height(32.dp)
                    )
                    IconButton(onClick = onAddItemClick) {
                        Icon(Icons.Default.Add, contentDescription = "Agregar item")
                    }
                }
            )
        }
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = uiState.isRefreshing,
            onRefresh = { viewModel.refresh() },
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                OutlinedTextField(
                    value = uiState.searchQuery,
                    onValueChange = { viewModel.onSearchQueryChange(it) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    placeholder = { Text("Buscar en inventario...") },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                    shape = MaterialTheme.shapes.medium,
                    singleLine = true
                )

                // Sort options
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState())
                        .padding(horizontal = 16.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.SortByAlpha,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = SolennixTheme.colors.secondaryText
                    )
                    InventorySortKey.entries.forEach { key ->
                        val label = when (key) {
                            InventorySortKey.NAME -> "Nombre"
                            InventorySortKey.CURRENT_STOCK -> "Stock"
                            InventorySortKey.MINIMUM_STOCK -> "Mínimo"
                            InventorySortKey.UNIT_COST -> "Costo"
                        }
                        val isSelected = uiState.sortKey == key
                        FilterChip(
                            selected = isSelected,
                            onClick = { viewModel.onSortChange(key) },
                            label = { Text(label) },
                            trailingIcon = if (isSelected) {
                                {
                                    Icon(
                                        if (uiState.sortAscending) Icons.Default.ArrowUpward
                                        else Icons.Default.ArrowDownward,
                                        contentDescription = null,
                                        modifier = Modifier.size(14.dp)
                                    )
                                }
                            } else null,
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = SolennixTheme.colors.primaryLight,
                                selectedLabelColor = SolennixTheme.colors.primary
                            )
                        )
                    }
                }

                val hasItems = uiState.ingredientItems.isNotEmpty() ||
                    uiState.equipmentItems.isNotEmpty() ||
                    uiState.supplyItems.isNotEmpty()

                if (uiState.isLoading && !hasItems) {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator()
                    }
                } else if (!hasItems) {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text(
                            text = if (uiState.searchQuery.isNotBlank() || uiState.lowStockOnly)
                                "Sin resultados" else "Sin inventario",
                            style = MaterialTheme.typography.bodyLarge,
                            color = SolennixTheme.colors.secondaryText
                        )
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                        verticalArrangement = Arrangement.spacedBy(16.dp)
                    ) {
                        // Consumibles section
                        if (uiState.ingredientItems.isNotEmpty()) {
                            item {
                                InventorySection(
                                    title = "Consumibles",
                                    icon = Icons.Default.ShoppingBasket,
                                    itemCount = uiState.ingredientItems.size,
                                    items = uiState.ingredientItems,
                                    onItemClick = onItemClick
                                )
                            }
                        }

                        // Insumos por Evento section
                        if (uiState.supplyItems.isNotEmpty()) {
                            item {
                                InventorySection(
                                    title = "Insumos por Evento",
                                    icon = Icons.Default.Kitchen,
                                    itemCount = uiState.supplyItems.size,
                                    items = uiState.supplyItems,
                                    onItemClick = onItemClick
                                )
                            }
                        }

                        // Equipos section
                        if (uiState.equipmentItems.isNotEmpty()) {
                            item {
                                InventorySection(
                                    title = "Equipos",
                                    icon = Icons.Outlined.Build,
                                    itemCount = uiState.equipmentItems.size,
                                    items = uiState.equipmentItems,
                                    onItemClick = onItemClick
                                )
                            }
                        }

                        item { Spacer(modifier = Modifier.height(16.dp)) }
                    }
                }
            }
        }
    }
}

@Composable
private fun InventorySection(
    title: String,
    icon: ImageVector,
    itemCount: Int,
    items: List<InventoryItem>,
    onItemClick: (String) -> Unit
) {
    Surface(
        shape = MaterialTheme.shapes.medium,
        color = SolennixTheme.colors.card,
        tonalElevation = 1.dp
    ) {
        Column {
            // Section header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    icon,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp),
                    tint = SolennixTheme.colors.primary
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = SolennixTheme.colors.primaryText
                )
                Spacer(modifier = Modifier.weight(1f))
                Surface(
                    shape = MaterialTheme.shapes.extraSmall,
                    color = SolennixTheme.colors.primary.copy(alpha = 0.1f)
                ) {
                    Text(
                        text = "$itemCount",
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                        style = MaterialTheme.typography.labelSmall,
                        color = SolennixTheme.colors.primary,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            HorizontalDivider(color = SolennixTheme.colors.divider.copy(alpha = 0.3f))

            // Items
            items.forEachIndexed { index, item ->
                InventoryListItem(
                    item = item,
                    onClick = { onItemClick(item.id) }
                )
                if (index < items.lastIndex) {
                    HorizontalDivider(
                        modifier = Modifier.padding(horizontal = 16.dp),
                        color = SolennixTheme.colors.divider.copy(alpha = 0.2f)
                    )
                }
            }
        }
    }
}

@Composable
private fun InventoryListItem(
    item: InventoryItem,
    onClick: () -> Unit
) {
    val isLowStock = item.minimumStock > 0 && item.currentStock < item.minimumStock

    Row(
        modifier = Modifier
            .clickable(onClick = onClick)
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = item.ingredientName,
                style = MaterialTheme.typography.titleMedium,
                color = SolennixTheme.colors.primaryText
            )
            Text(
                text = "Stock: ${item.currentStock} ${item.unit}",
                style = MaterialTheme.typography.bodySmall,
                color = if (isLowStock) SolennixTheme.colors.error else SolennixTheme.colors.secondaryText
            )
        }

        if (item.unitCost != null && item.unitCost!! > 0) {
            Text(
                text = item.unitCost!!.asMXN(),
                style = MaterialTheme.typography.bodySmall,
                color = SolennixTheme.colors.secondaryText,
                modifier = Modifier.padding(end = 8.dp)
            )
        }

        if (isLowStock) {
            Surface(
                color = SolennixTheme.colors.error.copy(alpha = 0.1f),
                shape = MaterialTheme.shapes.extraSmall
            ) {
                Text(
                    text = "STOCK BAJO",
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                    color = SolennixTheme.colors.error,
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}
