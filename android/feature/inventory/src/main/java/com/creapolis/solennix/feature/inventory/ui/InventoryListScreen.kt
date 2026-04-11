package com.creapolis.solennix.feature.inventory.ui

import androidx.compose.animation.core.Spring
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.Build
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.R as DesignSystemR
import com.creapolis.solennix.core.designsystem.component.SkeletonLoading
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveCardGrid
import com.creapolis.solennix.core.designsystem.event.UiEventSnackbarHandler
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.InventoryItem
import com.creapolis.solennix.core.model.extensions.asMXN
import com.creapolis.solennix.feature.inventory.viewmodel.InventoryListViewModel
import com.creapolis.solennix.feature.inventory.viewmodel.InventorySortKey

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun InventoryListScreen(
    viewModel: InventoryListViewModel,
    onNavigateBack: () -> Unit,
    onItemClick: (String) -> Unit,
    onEditItem: (String) -> Unit = {},
    onSearchClick: () -> Unit = {},
    onAddItemClick: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var pendingDeleteId by remember { mutableStateOf<String?>(null) }
    var adjustingItem by remember { mutableStateOf<InventoryItem?>(null) }
    var adjustmentInput by remember { mutableStateOf("") }
    val snackbarHostState = remember { SnackbarHostState() }

    UiEventSnackbarHandler(
        events = viewModel.uiEvents,
        snackbarHostState = snackbarHostState,
        onRetry = viewModel::onRetry,
    )

    // Delete confirmation dialog (triggered from long-press menu)
    if (pendingDeleteId != null) {
        AlertDialog(
            onDismissRequest = { pendingDeleteId = null },
            title = { Text("Eliminar ítem") },
            text = { Text("Esta acción no se puede deshacer.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        pendingDeleteId?.let { viewModel.deleteItem(it) }
                        pendingDeleteId = null
                    },
                    colors = ButtonDefaults.textButtonColors(contentColor = SolennixTheme.colors.error)
                ) { Text("Eliminar") }
            },
            dismissButton = {
                TextButton(onClick = { pendingDeleteId = null }) { Text("Cancelar") }
            }
        )
    }

    // Stock adjustment bottom sheet
    if (adjustingItem != null) {
        val item = adjustingItem!!
        ModalBottomSheet(
            onDismissRequest = { adjustingItem = null; adjustmentInput = "" },
            containerColor = SolennixTheme.colors.card
        ) {
            Column(
                modifier = Modifier.padding(start = 24.dp, end = 24.dp, bottom = 40.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text("Ajustar Stock", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Text(
                    "${item.ingredientName} — ${item.currentStock} ${item.unit}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = SolennixTheme.colors.secondaryText
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                    listOf(-10.0, -1.0, 1.0, 10.0).forEach { delta ->
                        OutlinedButton(
                            onClick = {
                                viewModel.adjustStock(item, delta)
                                adjustingItem = null
                                adjustmentInput = ""
                            },
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.outlinedButtonColors(
                                contentColor = if (delta < 0) SolennixTheme.colors.error else SolennixTheme.colors.primary
                            )
                        ) {
                            Text(if (delta > 0) "+${delta.toInt()}" else "${delta.toInt()}")
                        }
                    }
                }
                OutlinedTextField(
                    value = adjustmentInput,
                    onValueChange = { adjustmentInput = it },
                    label = { Text("Cantidad (+ suma, − resta)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = SolennixTheme.colors.primary,
                        focusedLabelColor = SolennixTheme.colors.primary
                    )
                )
                Button(
                    onClick = {
                        adjustmentInput.toDoubleOrNull()?.let { viewModel.adjustStock(item, it) }
                        adjustingItem = null
                        adjustmentInput = ""
                    },
                    enabled = adjustmentInput.toDoubleOrNull() != null,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = SolennixTheme.colors.primary)
                ) { Text("Confirmar") }
            }
        }
    }

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = { Text("Inventario") },
                onSearchClick = onSearchClick,
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(DesignSystemR.string.cd_back)
                        )
                    }
                },
                actions = {
                    FilterChip(
                        selected = uiState.lowStockOnly,
                        onClick = { viewModel.onLowStockToggle(!uiState.lowStockOnly) },
                        label = { Text("Stock bajo") },
                        leadingIcon = if (uiState.lowStockOnly) {
                            {
                                Icon(
                                    Icons.Default.Warning,
                                    contentDescription = stringResource(DesignSystemR.string.cd_warning),
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                        } else null,
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = SolennixTheme.colors.error.copy(alpha = 0.1f),
                            selectedLabelColor = SolennixTheme.colors.error
                        ),
                        modifier = Modifier.height(32.dp)
                    )
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
        floatingActionButton = {
            FloatingActionButton(
                onClick = onAddItemClick,
                containerColor = SolennixTheme.colors.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary
            ) {
                Icon(
                    Icons.Default.Add,
                    contentDescription = stringResource(DesignSystemR.string.cd_add)
                )
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
                OutlinedTextField(
                    value = uiState.searchQuery,
                    onValueChange = { viewModel.onSearchQueryChange(it) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    placeholder = { Text("Filtrar inventario por nombre...") },
                    leadingIcon = {
                        Icon(
                            Icons.Default.Search,
                            contentDescription = stringResource(DesignSystemR.string.cd_search)
                        )
                    },
                    shape = MaterialTheme.shapes.medium,
                    singleLine = true
                )

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState())
                        .padding(horizontal = 16.dp, vertical = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = Icons.Default.SortByAlpha,
                        contentDescription = stringResource(DesignSystemR.string.cd_tune),
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
                                        imageVector = if (uiState.sortAscending) Icons.Default.ArrowUpward else Icons.Default.ArrowDownward,
                                        contentDescription = stringResource(DesignSystemR.string.cd_tune),
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
                    InventorySkeletonList()
                } else if (!hasItems) {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Text(
                            text = if (uiState.searchQuery.isNotBlank() || uiState.lowStockOnly)
                                "Sin resultados para el filtro" else "Sin inventario",
                            style = MaterialTheme.typography.bodyLarge,
                            color = SolennixTheme.colors.secondaryText
                        )
                    }
                } else {
                    val allSections = buildList {
                        if (uiState.ingredientItems.isNotEmpty())
                            add(Triple("Consumibles", Icons.Default.ShoppingBasket, uiState.ingredientItems))
                        if (uiState.supplyItems.isNotEmpty())
                            add(Triple("Insumos por Evento", Icons.Default.Kitchen, uiState.supplyItems))
                        if (uiState.equipmentItems.isNotEmpty())
                            add(Triple("Equipos", Icons.Outlined.Build, uiState.equipmentItems))
                    }

                    AdaptiveCardGrid(
                        gridContent = {
                            allSections.forEach { (title, icon, sectionItems) ->
                                item(span = { GridItemSpan(maxLineSpan) }) {
                                    InventorySectionHeader(title = title, icon = icon, itemCount = sectionItems.size)
                                }
                                items(items = sectionItems, key = { it.id }) { item ->
                                    InventoryGridCard(
                                        item = item,
                                        onClick = { onItemClick(item.id) },
                                        onEdit = { onEditItem(item.id) },
                                        onAdjust = { adjustingItem = item },
                                        onDelete = { pendingDeleteId = item.id }
                                    )
                                }
                            }
                            item(span = { GridItemSpan(maxLineSpan) }) {
                                Spacer(modifier = Modifier.height(80.dp))
                            }
                        },
                        listContent = {
                            if (uiState.ingredientItems.isNotEmpty()) {
                                item {
                                    InventorySection(
                                        title = "Consumibles",
                                        icon = Icons.Default.ShoppingBasket,
                                        itemCount = uiState.ingredientItems.size,
                                        items = uiState.ingredientItems,
                                        onItemClick = onItemClick,
                                        onEditItem = onEditItem,
                                        onAdjustItem = { adjustingItem = it },
                                        onDeleteItem = { viewModel.deleteItem(it) },
                                        onDeleteWithConfirm = { pendingDeleteId = it }
                                    )
                                }
                            }
                            if (uiState.supplyItems.isNotEmpty()) {
                                item {
                                    InventorySection(
                                        title = "Insumos por Evento",
                                        icon = Icons.Default.Kitchen,
                                        itemCount = uiState.supplyItems.size,
                                        items = uiState.supplyItems,
                                        onItemClick = onItemClick,
                                        onEditItem = onEditItem,
                                        onAdjustItem = { adjustingItem = it },
                                        onDeleteItem = { viewModel.deleteItem(it) },
                                        onDeleteWithConfirm = { pendingDeleteId = it }
                                    )
                                }
                            }
                            if (uiState.equipmentItems.isNotEmpty()) {
                                item {
                                    InventorySection(
                                        title = "Equipos",
                                        icon = Icons.Outlined.Build,
                                        itemCount = uiState.equipmentItems.size,
                                        items = uiState.equipmentItems,
                                        onItemClick = onItemClick,
                                        onEditItem = onEditItem,
                                        onAdjustItem = { adjustingItem = it },
                                        onDeleteItem = { viewModel.deleteItem(it) },
                                        onDeleteWithConfirm = { pendingDeleteId = it }
                                    )
                                }
                            }
                            item { Spacer(modifier = Modifier.height(80.dp)) }
                        }
                    )
                }
            }
        }
    }
}

// MARK: - Skeleton Loading

@Composable
private fun InventorySkeletonList() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Surface(
            shape = MaterialTheme.shapes.medium,
            color = SolennixTheme.colors.card,
            tonalElevation = 1.dp
        ) {
            Column {
                repeat(5) { index ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            SkeletonLoading(
                                modifier = Modifier
                                    .height(14.dp)
                                    .fillMaxWidth(0.55f)
                                    .clip(MaterialTheme.shapes.small)
                            )
                            SkeletonLoading(
                                modifier = Modifier
                                    .height(11.dp)
                                    .fillMaxWidth(0.35f)
                                    .clip(MaterialTheme.shapes.small)
                            )
                        }
                        SkeletonLoading(
                            modifier = Modifier
                                .height(11.dp)
                                .width(48.dp)
                                .clip(MaterialTheme.shapes.small)
                        )
                    }
                    if (index < 4) {
                        HorizontalDivider(
                            modifier = Modifier.padding(horizontal = 16.dp),
                            color = SolennixTheme.colors.divider.copy(alpha = 0.2f)
                        )
                    }
                }
            }
        }
    }
}

// MARK: - List Section (Phone)

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
private fun InventorySection(
    title: String,
    icon: ImageVector,
    itemCount: Int,
    items: List<InventoryItem>,
    onItemClick: (String) -> Unit,
    onEditItem: (String) -> Unit,
    onAdjustItem: (InventoryItem) -> Unit,
    onDeleteItem: (String) -> Unit,    // immediate (swipe)
    onDeleteWithConfirm: (String) -> Unit  // confirmation dialog (menu)
) {
    Surface(
        shape = MaterialTheme.shapes.medium,
        color = SolennixTheme.colors.card,
        tonalElevation = 1.dp
    ) {
        Column(
            modifier = Modifier.animateContentSize(
                animationSpec = spring(
                    dampingRatio = Spring.DampingRatioNoBouncy,
                    stiffness = Spring.StiffnessLow
                )
            )
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(icon, contentDescription = null, modifier = Modifier.size(20.dp), tint = SolennixTheme.colors.primary)
                Spacer(modifier = Modifier.width(8.dp))
                Text(text = title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold, color = SolennixTheme.colors.primaryText)
                Spacer(modifier = Modifier.weight(1f))
                Surface(shape = MaterialTheme.shapes.extraSmall, color = SolennixTheme.colors.primary.copy(alpha = 0.1f)) {
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

            items.forEachIndexed { index, item ->
                key(item.id) {
                    val dismissState = rememberSwipeToDismissBoxState(
                        confirmValueChange = { value ->
                            if (value == SwipeToDismissBoxValue.EndToStart) {
                                onDeleteItem(item.id)
                                true
                            } else false
                        }
                    )
                    SwipeToDismissBox(
                        state = dismissState,
                        enableDismissFromStartToEnd = false,
                        backgroundContent = {
                            InventorySwipeDeleteBackground(progress = dismissState.progress)
                        }
                    ) {
                        InventoryListItem(
                            item = item,
                            onClick = { onItemClick(item.id) },
                            onEdit = { onEditItem(item.id) },
                            onAdjust = { onAdjustItem(item) },
                            onDelete = { onDeleteWithConfirm(item.id) }
                        )
                    }
                }
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
private fun InventorySwipeDeleteBackground(progress: Float) {
    val animatedProgress by animateFloatAsState(
        targetValue = progress.coerceIn(0f, 1f),
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessLow
        ),
        label = "inventorySwipeDeleteProgress"
    )

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = SolennixTheme.colors.error.copy(alpha = 0.14f + (animatedProgress * 0.72f))
    ) {
        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.CenterEnd
        ) {
            Icon(
                Icons.Default.Delete,
                contentDescription = "Eliminar",
                tint = Color.White,
                modifier = Modifier
                    .padding(end = 20.dp - (animatedProgress * 8).dp)
                    .offset(x = ((1f - animatedProgress) * 14f).dp)
                    .scale(0.82f + (animatedProgress * 0.28f))
                    .alpha(0.45f + (animatedProgress * 0.55f))
            )
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun InventoryListItem(
    item: InventoryItem,
    onClick: () -> Unit,
    onEdit: () -> Unit,
    onAdjust: () -> Unit,
    onDelete: () -> Unit
) {
    val isLowStock = item.minimumStock > 0 && item.currentStock < item.minimumStock
    var showMenu by remember { mutableStateOf(false) }

    Box {
        Row(
            modifier = Modifier
                .combinedClickable(
                    onClick = onClick,
                    onLongClick = { showMenu = true }
                )
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(text = item.ingredientName, style = MaterialTheme.typography.titleMedium, color = SolennixTheme.colors.primaryText)
                Text(
                    text = "Stock: ${item.currentStock} ${item.unit}",
                    style = MaterialTheme.typography.bodySmall,
                    color = if (isLowStock) SolennixTheme.colors.error else SolennixTheme.colors.secondaryText
                )
            }
            if (item.unitCost != null && item.unitCost!! > 0) {
                Text(text = item.unitCost!!.asMXN(), style = MaterialTheme.typography.bodySmall, color = SolennixTheme.colors.secondaryText, modifier = Modifier.padding(end = 8.dp))
            }
            if (isLowStock) {
                Surface(color = SolennixTheme.colors.error.copy(alpha = 0.1f), shape = MaterialTheme.shapes.extraSmall) {
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

        DropdownMenu(expanded = showMenu, onDismissRequest = { showMenu = false }) {
            DropdownMenuItem(
                text = { Text("Ver Detalles") },
                leadingIcon = { Icon(Icons.Default.Visibility, contentDescription = null) },
                onClick = { showMenu = false; onClick() }
            )
            DropdownMenuItem(
                text = { Text("Ajustar Stock") },
                leadingIcon = { Icon(Icons.Default.Tune, contentDescription = null) },
                onClick = { showMenu = false; onAdjust() }
            )
            DropdownMenuItem(
                text = { Text("Editar") },
                leadingIcon = { Icon(Icons.Default.Edit, contentDescription = null) },
                onClick = { showMenu = false; onEdit() }
            )
            HorizontalDivider()
            DropdownMenuItem(
                text = { Text("Eliminar", color = SolennixTheme.colors.error) },
                leadingIcon = { Icon(Icons.Default.Delete, contentDescription = null, tint = SolennixTheme.colors.error) },
                onClick = { showMenu = false; onDelete() }
            )
        }
    }
}

// MARK: - Grid Components (Tablet)

@Composable
private fun InventorySectionHeader(title: String, icon: ImageVector, itemCount: Int) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, contentDescription = null, modifier = Modifier.size(20.dp), tint = SolennixTheme.colors.primary)
        Spacer(modifier = Modifier.width(8.dp))
        Text(text = title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold, color = SolennixTheme.colors.primaryText)
        Spacer(modifier = Modifier.weight(1f))
        Surface(shape = MaterialTheme.shapes.extraSmall, color = SolennixTheme.colors.primary.copy(alpha = 0.1f)) {
            Text(
                text = "$itemCount",
                modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                style = MaterialTheme.typography.labelSmall,
                color = SolennixTheme.colors.primary,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun InventoryGridCard(
    item: InventoryItem,
    onClick: () -> Unit,
    onEdit: () -> Unit,
    onAdjust: () -> Unit,
    onDelete: () -> Unit
) {
    val isLowStock = item.minimumStock > 0 && item.currentStock < item.minimumStock
    var showMenu by remember { mutableStateOf(false) }

    Box {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .combinedClickable(
                    onClick = onClick,
                    onLongClick = { showMenu = true }
                ),
            shape = MaterialTheme.shapes.medium,
            color = SolennixTheme.colors.card,
            tonalElevation = 1.dp
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(text = item.ingredientName, style = MaterialTheme.typography.titleMedium, color = SolennixTheme.colors.primaryText)
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Stock: ${item.currentStock} ${item.unit}",
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.secondaryText
                    )
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        if (item.unitCost != null && item.unitCost!! > 0) {
                            Text(text = item.unitCost!!.asMXN(), style = MaterialTheme.typography.bodySmall, color = SolennixTheme.colors.secondaryText)
                        }
                        if (isLowStock) {
                            Surface(
                                color = SolennixTheme.colors.error.copy(alpha = 0.08f),
                                shape = MaterialTheme.shapes.extraSmall
                            ) {
                                Text(
                                    text = "Bajo",
                                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
                                    color = SolennixTheme.colors.error,
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }
                    }
                }
            }
        }

        DropdownMenu(expanded = showMenu, onDismissRequest = { showMenu = false }) {
            DropdownMenuItem(
                text = { Text("Ver Detalles") },
                leadingIcon = { Icon(Icons.Default.Visibility, contentDescription = null) },
                onClick = { showMenu = false; onClick() }
            )
            DropdownMenuItem(
                text = { Text("Ajustar Stock") },
                leadingIcon = { Icon(Icons.Default.Tune, contentDescription = null) },
                onClick = { showMenu = false; onAdjust() }
            )
            DropdownMenuItem(
                text = { Text("Editar") },
                leadingIcon = { Icon(Icons.Default.Edit, contentDescription = null) },
                onClick = { showMenu = false; onEdit() }
            )
            HorizontalDivider()
            DropdownMenuItem(
                text = { Text("Eliminar", color = SolennixTheme.colors.error) },
                leadingIcon = { Icon(Icons.Default.Delete, contentDescription = null, tint = SolennixTheme.colors.error) },
                onClick = { showMenu = false; onDelete() }
            )
        }
    }
}
