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
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.text.style.TextOverflow
import com.creapolis.solennix.core.designsystem.theme.Spacing
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.lifecycle.compose.LifecycleResumeEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.R as DesignSystemR
import com.creapolis.solennix.core.designsystem.component.EmptyState
import com.creapolis.solennix.core.designsystem.component.SkeletonLoading
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.component.SwipeRevealActions
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveCardGrid
import com.creapolis.solennix.core.designsystem.event.UiEventSnackbarHandler
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.InventoryItem
import com.creapolis.solennix.core.model.extensions.asMXN
import com.creapolis.solennix.feature.inventory.InventoryStrings
import com.creapolis.solennix.feature.inventory.viewmodel.InventoryListViewModel
import com.creapolis.solennix.feature.inventory.viewmodel.InventoryScope
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
    var adjustingItem by remember { mutableStateOf<InventoryItem?>(null) }
    var adjustmentInput by remember { mutableStateOf("") }
    val snackbarHostState = remember { SnackbarHostState() }
    val haptic = LocalHapticFeedback.current
    val hapticFeedback = com.creapolis.solennix.core.designsystem.util.rememberHapticFeedback()
    var rowActionsInventoryItem by remember { mutableStateOf<InventoryItem?>(null) }

    LifecycleResumeEffect(viewModel) {
        viewModel.refresh()
        onPauseOrDispose { }
    }

    UiEventSnackbarHandler(
        events = viewModel.uiEvents,
        snackbarHostState = snackbarHostState,
        onRetry = viewModel::onRetry,
        onUndo = viewModel::undoDelete,
    )

    // Stock adjustment bottom sheet
    if (adjustingItem != null) {
        val item = adjustingItem!!
        ModalBottomSheet(
            onDismissRequest = { adjustingItem = null; adjustmentInput = "" },
            containerColor = SolennixTheme.colors.card
        ) {
            Column(
                modifier = Modifier.padding(start = Spacing.xxxl, end = Spacing.xxxl, bottom = Spacing.xxxl),
                verticalArrangement = Arrangement.spacedBy(Spacing.md)
            ) {
                Text(InventoryStrings.adjustStock, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Text(
                    InventoryStrings.currentStockWithUnit(item.ingredientName, item.currentStock, item.unit),
                    style = MaterialTheme.typography.bodyMedium,
                    color = SolennixTheme.colors.secondaryText
                )
                Row(horizontalArrangement = Arrangement.spacedBy(Spacing.sm), modifier = Modifier.fillMaxWidth()) {
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
                    label = { Text(InventoryStrings.quantityAdjustHint) },
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
                ) { Text(InventoryStrings.confirm) }
            }
        }
    }

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = { Text(InventoryStrings.title) },
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
                        label = { Text(InventoryStrings.lowStock) },
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
                            selectedContainerColor = SolennixTheme.colors.warning.copy(alpha = 0.12f),
                            selectedLabelColor = SolennixTheme.colors.warning
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
                        .padding(Spacing.md),
                    placeholder = {
                        Text(
                            text = InventoryStrings.searchPlaceholder,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    },
                    leadingIcon = {
                        Icon(
                            Icons.Default.Search,
                            contentDescription = stringResource(DesignSystemR.string.cd_search)
                        )
                    },
                    shape = MaterialTheme.shapes.medium,
                    singleLine = true
                )

                // Scope filter chips (All / Ingredients / Equipment / Supplies)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState())
                        .padding(horizontal = Spacing.md, vertical = Spacing.xs)
                        .semantics { contentDescription = InventoryStrings.cdScopeFilter },
                    horizontalArrangement = Arrangement.spacedBy(Spacing.sm),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    InventoryScope.entries.forEach { scope ->
                        val label = when (scope) {
                            InventoryScope.ALL -> InventoryStrings.scopeAll
                            InventoryScope.INGREDIENT -> InventoryStrings.scopeIngredient
                            InventoryScope.EQUIPMENT -> InventoryStrings.scopeEquipment
                            InventoryScope.SUPPLY -> InventoryStrings.scopeSupply
                        }
                        val isSelected = uiState.scope == scope
                        FilterChip(
                            selected = isSelected,
                            onClick = {
                                hapticFeedback(com.creapolis.solennix.core.designsystem.util.HapticFeedbackType.SELECTION_CHANGED)
                                viewModel.onScopeChange(scope)
                            },
                            label = { Text(label) },
                            leadingIcon = if (isSelected) {
                                {
                                    Icon(
                                        imageVector = Icons.Default.Check,
                                        contentDescription = null,
                                        modifier = Modifier.size(14.dp)
                                    )
                                }
                            } else null,
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = SolennixTheme.colors.primaryLight,
                                selectedLabelColor = SolennixTheme.colors.primary
                            ),
                            modifier = Modifier.semantics {
                                stateDescription = if (isSelected) "seleccionado" else "no seleccionado"
                            }
                        )
                    }
                }

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState())
                        .padding(horizontal = Spacing.md, vertical = Spacing.xs),
                    horizontalArrangement = Arrangement.spacedBy(Spacing.sm),
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
                            InventorySortKey.NAME -> InventoryStrings.sortName
                            InventorySortKey.CURRENT_STOCK -> InventoryStrings.sortStock
                            InventorySortKey.MINIMUM_STOCK -> InventoryStrings.sortMinimum
                            InventorySortKey.UNIT_COST -> InventoryStrings.sortCost
                        }
                        val isSelected = uiState.sortKey == key
                        FilterChip(
                            selected = isSelected,
                            onClick = {
                                hapticFeedback(com.creapolis.solennix.core.designsystem.util.HapticFeedbackType.SELECTION_CHANGED)
                                viewModel.onSortChange(key)
                            },
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

                val hasItems = uiState.items.isNotEmpty()

                if (uiState.isLoading && !hasItems) {
                    InventorySkeletonList()
                } else if (!hasItems) {
                    val hasActiveFilter = uiState.searchQuery.isNotBlank() || uiState.lowStockOnly
                    val emptyTitle = when {
                        hasActiveFilter -> InventoryStrings.emptyFiltered
                        uiState.scope == InventoryScope.INGREDIENT -> InventoryStrings.emptyScopeIngredient
                        uiState.scope == InventoryScope.EQUIPMENT -> InventoryStrings.emptyScopeEquipment
                        uiState.scope == InventoryScope.SUPPLY -> InventoryStrings.emptyScopeSupply
                        else -> InventoryStrings.emptyInventory
                    }
                    EmptyState(
                        icon = Icons.Default.Inventory2,
                        title = emptyTitle,
                        message = ""
                    )
                } else {
                    AdaptiveCardGrid(
                        gridContent = {
                            items(items = uiState.items, key = { it.id }) { item ->
                                InventoryGridCard(
                                    item = item,
                                    showTypeBadge = uiState.scope == InventoryScope.ALL,
                                    onClick = { onItemClick(item.id) },
                                    onLongClick = {
                                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                        rowActionsInventoryItem = item
                                    }
                                )
                            }
                            item(span = { GridItemSpan(maxLineSpan) }) {
                                Spacer(modifier = Modifier.height(Spacing.xxxl))
                            }
                        },
                        listContent = {
                            item {
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
                                        uiState.items.forEachIndexed { index, item ->
                                            key(item.id) {
                                                SwipeRevealActions(
                                                    onEdit = { onEditItem(item.id) },
                                                    onDelete = { viewModel.deleteItem(item.id) }
                                                ) {
                                                    InventoryListItem(
                                                        item = item,
                                                        showTypeBadge = uiState.scope == InventoryScope.ALL,
                                                        onClick = { onItemClick(item.id) },
                                                        onLongClick = {
                                                            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                                            rowActionsInventoryItem = item
                                                        }
                                                    )
                                                }
                                            }
                                            if (index < uiState.items.lastIndex) {
                                                HorizontalDivider(
                                                    modifier = Modifier.padding(horizontal = Spacing.md),
                                                    color = SolennixTheme.colors.divider.copy(alpha = 0.2f)
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                            item { Spacer(modifier = Modifier.height(Spacing.xxxl)) }
                        }
                    )
                }
            }
        }
    }

    rowActionsInventoryItem?.let { item ->
        InventoryRowActionsBottomSheet(
            item = item,
            onDetails = {
                rowActionsInventoryItem = null
                onItemClick(item.id)
            },
            onAdjustStock = {
                rowActionsInventoryItem = null
                adjustingItem = item
            },
            onEdit = {
                rowActionsInventoryItem = null
                onEditItem(item.id)
            },
            onDelete = {
                hapticFeedback(com.creapolis.solennix.core.designsystem.util.HapticFeedbackType.WARNING)
                rowActionsInventoryItem = null
                viewModel.deleteItem(item.id)
            },
            onDismiss = { rowActionsInventoryItem = null }
        )
    }
}

// MARK: - Skeleton Loading

@Composable
private fun InventorySkeletonList() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = Spacing.md, vertical = Spacing.sm),
        verticalArrangement = Arrangement.spacedBy(Spacing.xxl)
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
                            .padding(horizontal = Spacing.md, vertical = 14.dp),
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
                            modifier = Modifier.padding(horizontal = Spacing.md),
                            color = SolennixTheme.colors.divider.copy(alpha = 0.2f)
                        )
                    }
                }
            }
        }
    }
}

// MARK: - Row Components

@Composable
private fun InventoryTypeBadge(
    type: com.creapolis.solennix.core.model.InventoryType,
    modifier: Modifier = Modifier
) {
    val label = when (type) {
        com.creapolis.solennix.core.model.InventoryType.INGREDIENT -> InventoryStrings.scopeIngredient
        com.creapolis.solennix.core.model.InventoryType.EQUIPMENT -> InventoryStrings.scopeEquipment
        com.creapolis.solennix.core.model.InventoryType.SUPPLY -> InventoryStrings.scopeSupply
    }
    val icon = when (type) {
        com.creapolis.solennix.core.model.InventoryType.INGREDIENT -> Icons.Default.ShoppingBasket
        com.creapolis.solennix.core.model.InventoryType.EQUIPMENT -> Icons.Outlined.Build
        com.creapolis.solennix.core.model.InventoryType.SUPPLY -> Icons.Default.Kitchen
    }
    val color = when (type) {
        com.creapolis.solennix.core.model.InventoryType.INGREDIENT -> SolennixTheme.colors.success
        com.creapolis.solennix.core.model.InventoryType.EQUIPMENT -> SolennixTheme.colors.primary
        com.creapolis.solennix.core.model.InventoryType.SUPPLY -> SolennixTheme.colors.info
    }

    Surface(
        color = color.copy(alpha = 0.12f),
        contentColor = color,
        shape = MaterialTheme.shapes.extraSmall,
        modifier = modifier
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(Spacing.xs)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(12.dp),
                tint = color
            )
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.Medium
            )
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun InventoryListItem(
    item: InventoryItem,
    showTypeBadge: Boolean,
    onClick: () -> Unit,
    onLongClick: () -> Unit
) {
    val isLowStock = item.minimumStock > 0 && item.currentStock < item.minimumStock

    Row(
        modifier = Modifier
            .background(SolennixTheme.colors.card)
            .combinedClickable(
                onClick = onClick,
                onLongClick = onLongClick
            )
            .fillMaxWidth()
            .padding(horizontal = Spacing.md, vertical = Spacing.xxl),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(Spacing.sm)
            ) {
                Text(
                    text = item.ingredientName,
                    style = MaterialTheme.typography.titleMedium,
                    color = SolennixTheme.colors.primaryText,
                    modifier = Modifier.weight(1f, fill = false)
                )
                if (showTypeBadge) {
                    InventoryTypeBadge(type = item.type)
                }
            }
            Text(
                text = InventoryStrings.stockLabel(item.currentStock, item.unit),
                style = MaterialTheme.typography.bodySmall,
                color = if (isLowStock) SolennixTheme.colors.error else SolennixTheme.colors.secondaryText
            )
        }
        if (item.unitCost != null && item.unitCost!! > 0) {
            Text(text = item.unitCost!!.asMXN(), style = MaterialTheme.typography.bodySmall, color = SolennixTheme.colors.secondaryText, modifier = Modifier.padding(end = Spacing.sm))
        }
        if (isLowStock) {
            Surface(color = SolennixTheme.colors.warning.copy(alpha = 0.10f), shape = MaterialTheme.shapes.extraSmall) {
                Row(
                    modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(3.dp)
                ) {
                    Icon(
                        Icons.Default.Warning,
                        contentDescription = null,
                        modifier = Modifier.size(10.dp),
                        tint = SolennixTheme.colors.warning
                    )
                    Text(
                        text = InventoryStrings.lowStock,
                        color = SolennixTheme.colors.warning,
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }
    }
}

// MARK: - Grid Components (Tablet)

@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun InventoryGridCard(
    item: InventoryItem,
    showTypeBadge: Boolean,
    onClick: () -> Unit,
    onLongClick: () -> Unit
) {
    val isLowStock = item.minimumStock > 0 && item.currentStock < item.minimumStock

    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .combinedClickable(
                onClick = onClick,
                onLongClick = onLongClick
            ),
        shape = MaterialTheme.shapes.medium,
        color = SolennixTheme.colors.card,
        tonalElevation = 1.dp
    ) {
        Column(modifier = Modifier.padding(Spacing.md)) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(Spacing.sm)
            ) {
                Text(
                    text = item.ingredientName,
                    style = MaterialTheme.typography.titleMedium,
                    color = SolennixTheme.colors.primaryText,
                    modifier = Modifier.weight(1f, fill = false)
                )
                if (showTypeBadge) {
                    InventoryTypeBadge(type = item.type)
                }
            }
            Spacer(modifier = Modifier.height(Spacing.sm))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = InventoryStrings.stockLabel(item.currentStock, item.unit),
                    style = MaterialTheme.typography.bodySmall,
                    color = if (isLowStock) SolennixTheme.colors.error else SolennixTheme.colors.secondaryText
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
                            color = SolennixTheme.colors.warning.copy(alpha = 0.10f),
                            shape = MaterialTheme.shapes.extraSmall
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(3.dp)
                            ) {
                                Icon(
                                    Icons.Default.Warning,
                                    contentDescription = null,
                                    modifier = Modifier.size(10.dp),
                                    tint = SolennixTheme.colors.warning
                                )
                                Text(
                                    text = InventoryStrings.lowBadge,
                                    color = SolennixTheme.colors.warning,
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Medium
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
