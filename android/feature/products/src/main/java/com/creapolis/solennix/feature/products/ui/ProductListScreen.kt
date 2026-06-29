package com.creapolis.solennix.feature.products.ui

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.ArrowDownward
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.SortByAlpha
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.text.style.TextOverflow
import com.creapolis.solennix.core.designsystem.theme.Spacing
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.stringResource
import androidx.lifecycle.compose.LifecycleResumeEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil3.compose.AsyncImage
import com.creapolis.solennix.core.designsystem.R as DesignSystemR
import com.creapolis.solennix.core.designsystem.component.SkeletonLoading
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.component.SwipeRevealActions
import com.creapolis.solennix.core.designsystem.component.UpgradeBanner
import com.creapolis.solennix.core.designsystem.component.UpgradeBannerStyle
import com.creapolis.solennix.core.designsystem.component.UpgradePlanDialog
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveCardGrid
import com.creapolis.solennix.core.designsystem.event.UiEventSnackbarHandler
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.Product
import com.creapolis.solennix.core.model.extensions.asMXN
import com.creapolis.solennix.core.network.UrlResolver
import com.creapolis.solennix.feature.products.ProductStrings
import com.creapolis.solennix.feature.products.viewmodel.ProductListViewModel
import com.creapolis.solennix.feature.products.viewmodel.ProductSortKey

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun ProductListScreen(
    viewModel: ProductListViewModel,
    onNavigateBack: () -> Unit,
    onProductClick: (String) -> Unit,
    onAddProductClick: () -> Unit,
    onEditProduct: (String) -> Unit = {},
    onSearchClick: () -> Unit = {},
    onUpgradeClick: () -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var showLimitDialog by remember { mutableStateOf(false) }
    val snackbarHostState = remember { SnackbarHostState() }
    val haptic = LocalHapticFeedback.current
    val hapticFeedback = com.creapolis.solennix.core.designsystem.util.rememberHapticFeedback()
    var rowActionsProduct by remember { mutableStateOf<Product?>(null) }
    var deleteConfirmProduct by remember { mutableStateOf<Product?>(null) }
    var showFilterBottomSheet by remember { mutableStateOf(false) }

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
                title = { Text(ProductStrings.title) },
                onSearchClick = onSearchClick,
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(DesignSystemR.string.cd_back)
                        )
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
        floatingActionButton = {
            FloatingActionButton(
                onClick = {
                    if (viewModel.isLimitReached) showLimitDialog = true
                    else onAddProductClick()
                },
                containerColor = SolennixTheme.colors.primary,
                contentColor = Color.White
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
                    placeholder = {
                        Text(
                            text = ProductStrings.searchPlaceholder,
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
                    trailingIcon = {
                        IconButton(onClick = { showFilterBottomSheet = true }) {
                            Icon(
                                Icons.Default.Tune,
                                contentDescription = stringResource(DesignSystemR.string.cd_tune)
                            )
                        }
                    },
                    shape = MaterialTheme.shapes.medium,
                    singleLine = true
                )

                if (uiState.allCategories.isNotEmpty()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState())
                            .padding(horizontal = Spacing.md, vertical = Spacing.xs),
                        horizontalArrangement = Arrangement.spacedBy(Spacing.sm)
                    ) {
                        FilterChip(
                            selected = uiState.selectedCategory == null,
                            onClick = { viewModel.onCategoryFilterChange(null) },
                            label = { Text(ProductStrings.filterAll) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = SolennixTheme.colors.primaryLight,
                                selectedLabelColor = SolennixTheme.colors.primary
                            )
                        )
                        uiState.allCategories.forEach { category ->
                            FilterChip(
                                selected = uiState.selectedCategory == category,
                                onClick = { viewModel.onCategoryFilterChange(category) },
                                label = { Text(category) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = SolennixTheme.colors.primaryLight,
                                    selectedLabelColor = SolennixTheme.colors.primary
                                )
                            )
                        }
                    }
                }

                if (uiState.isLoading && uiState.products.isEmpty()) {
                    ProductSkeletonList()
                } else if (uiState.products.isEmpty()) {
                    val hasActiveFilter = uiState.searchQuery.isNotEmpty() || uiState.selectedCategory != null
                    com.creapolis.solennix.core.designsystem.component.EmptyState(
                        icon = Icons.Default.ShoppingCart,
                        title = if (hasActiveFilter) ProductStrings.emptySearchTitle else ProductStrings.emptyTitle,
                        message = if (hasActiveFilter) ProductStrings.emptySearchMessage else ProductStrings.emptyMessage,
                        actionText = if (hasActiveFilter) null else ProductStrings.emptyAction,
                        onAction = if (hasActiveFilter) null else onAddProductClick
                    )
                } else {
                    AdaptiveCardGrid(
                        contentPadding = PaddingValues(bottom = Spacing.xxxl),
                        gridContent = {
                            items(uiState.products, key = { it.id }) { product ->
                                ProductGridItem(
                                    product = product,
                                    onClick = { onProductClick(product.id) },
                                    onLongClick = {
                                        haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                        rowActionsProduct = product
                                    }
                                )
                            }
                        },
                        listContent = {
                            items(uiState.products, key = { it.id }) { product ->
                                SwipeRevealActions(
                                    onEdit = { onEditProduct(product.id) },
                                    onDelete = {
                                        hapticFeedback(com.creapolis.solennix.core.designsystem.util.HapticFeedbackType.WARNING)
                                        deleteConfirmProduct = product
                                    }
                                ) {
                                    Surface(color = SolennixTheme.colors.card) {
                                        ProductListItem(
                                            product = product,
                                            onClick = { onProductClick(product.id) },
                                            onLongClick = {
                                                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                                rowActionsProduct = product
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

    rowActionsProduct?.let { product ->
        ProductRowActionsBottomSheet(
            product = product,
            onDetails = {
                rowActionsProduct = null
                onProductClick(product.id)
            },
            onEdit = {
                rowActionsProduct = null
                onEditProduct(product.id)
            },
            onDelete = {
                hapticFeedback(com.creapolis.solennix.core.designsystem.util.HapticFeedbackType.WARNING)
                deleteConfirmProduct = product
                rowActionsProduct = null
            },
            onDismiss = { rowActionsProduct = null }
        )
    }

    if (showFilterBottomSheet) {
        ProductFilterBottomSheet(
            sortKey = uiState.sortKey,
            sortAscending = uiState.sortAscending,
            showInactive = uiState.showInactive,
            onSortKeyChange = { viewModel.onSortChange(it) },
            onSortAscendingChange = { viewModel.onSortAscendingChange(it) },
            onShowInactiveChange = { viewModel.onShowInactiveChange(it) },
            onDismiss = { showFilterBottomSheet = false }
        )
    }

    deleteConfirmProduct?.let { product ->
        AlertDialog(
            onDismissRequest = { deleteConfirmProduct = null },
            title = { Text(ProductStrings.deleteTitle) },
            text = { Text(ProductStrings.deleteDescription(product.name)) },
            confirmButton = {
                TextButton(onClick = {
                    hapticFeedback(com.creapolis.solennix.core.designsystem.util.HapticFeedbackType.SUCCESS)
                    viewModel.deleteProduct(product.id)
                    deleteConfirmProduct = null
                }) {
                    Text(ProductStrings.deleteConfirm, color = SolennixTheme.colors.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { deleteConfirmProduct = null }) {
                    Text(ProductStrings.deleteCancel)
                }
            }
        )
    }
}

@Composable
private fun ProductSkeletonList() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = Spacing.md, vertical = Spacing.sm)
    ) {
        Surface(
            shape = MaterialTheme.shapes.medium,
            color = SolennixTheme.colors.card
        ) {
            Column {
                repeat(5) { index ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(Spacing.md),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        SkeletonLoading(
                            modifier = Modifier
                                .size(60.dp)
                                .clip(MaterialTheme.shapes.medium)
                        )
                        Spacer(modifier = Modifier.width(Spacing.md))
                        Column(modifier = Modifier.weight(1f)) {
                            SkeletonLoading(
                                modifier = Modifier
                                    .height(14.dp)
                                    .fillMaxWidth(0.5f)
                                    .clip(MaterialTheme.shapes.small)
                            )
                            Spacer(modifier = Modifier.height(Spacing.xs))
                            SkeletonLoading(
                                modifier = Modifier
                                    .height(11.dp)
                                    .fillMaxWidth(0.3f)
                                    .clip(MaterialTheme.shapes.small)
                            )
                        }
                        SkeletonLoading(
                            modifier = Modifier
                                .height(14.dp)
                                .width(56.dp)
                                .clip(MaterialTheme.shapes.small)
                        )
                    }
                    if (index < 4) {
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
fun ProductGridItem(
    product: Product,
    onClick: () -> Unit,
    onLongClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .combinedClickable(
                onClick = onClick,
                onLongClick = onLongClick
            )
            .alpha(if (product.isActive) 1f else 0.5f),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.medium
    ) {
        Column {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(140.dp),
                contentAlignment = Alignment.Center
            ) {
                if (product.imageUrl != null) {
                    AsyncImage(
                        model = UrlResolver.resolve(product.imageUrl),
                        contentDescription = product.name,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop
                    )
                } else {
                    Text(
                        text = product.name.take(1).uppercase(),
                        style = MaterialTheme.typography.headlineLarge,
                        color = SolennixTheme.colors.secondaryText
                    )
                }
            }
            Column(modifier = Modifier.padding(Spacing.xxl)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = product.name,
                        style = MaterialTheme.typography.titleMedium,
                        color = if (product.isActive) SolennixTheme.colors.primaryText else SolennixTheme.colors.secondaryText,
                        maxLines = 1,
                        modifier = Modifier.weight(1f)
                    )
                    if (!product.isActive) {
                        Spacer(modifier = Modifier.width(Spacing.xs))
                        Box(
                            modifier = Modifier.background(
                                color = SolennixTheme.colors.error.copy(alpha = 0.1f),
                                shape = MaterialTheme.shapes.extraSmall
                            ).padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = ProductStrings.inactive.uppercase(),
                                style = MaterialTheme.typography.labelSmall,
                                color = SolennixTheme.colors.error,
                                fontWeight = androidx.compose.ui.text.font.FontWeight.Bold
                            )
                        }
                    }
                }
                Text(
                    text = product.category,
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = product.basePrice.asMXN(),
                    style = MaterialTheme.typography.titleMedium,
                    color = SolennixTheme.colors.primary,
                    fontWeight = androidx.compose.ui.text.font.FontWeight.Bold
                )
            }
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun ProductListItem(
    product: Product,
    onClick: () -> Unit,
    onLongClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .combinedClickable(
                onClick = onClick,
                onLongClick = onLongClick
            )
            .padding(Spacing.md)
            .alpha(if (product.isActive) 1f else 0.5f),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Card(
            modifier = Modifier.size(60.dp),
            shape = MaterialTheme.shapes.medium
        ) {
            if (product.imageUrl != null) {
                AsyncImage(
                    model = UrlResolver.resolve(product.imageUrl),
                    contentDescription = product.name,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop
                )
            } else {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(product.name.take(1).uppercase(), style = MaterialTheme.typography.titleLarge)
                }
            }
        }

        Spacer(modifier = Modifier.width(Spacing.md))

        Column(modifier = Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = product.name,
                    style = MaterialTheme.typography.titleMedium,
                    color = if (product.isActive) SolennixTheme.colors.primaryText else SolennixTheme.colors.secondaryText,
                    modifier = Modifier.weight(1f, fill = false)
                )
                if (!product.isActive) {
                    Spacer(modifier = Modifier.width(Spacing.sm))
                    Box(
                        modifier = Modifier.background(
                            color = SolennixTheme.colors.error.copy(alpha = 0.1f),
                            shape = MaterialTheme.shapes.extraSmall
                        ).padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = ProductStrings.inactive.uppercase(),
                            style = MaterialTheme.typography.labelSmall,
                            color = SolennixTheme.colors.error,
                            fontWeight = androidx.compose.ui.text.font.FontWeight.Bold
                        )
                    }
                }
            }
            Text(
                text = product.category,
                style = MaterialTheme.typography.bodySmall,
                color = SolennixTheme.colors.secondaryText
            )
        }

        Text(
            text = product.basePrice.asMXN(),
            style = MaterialTheme.typography.titleMedium,
            color = SolennixTheme.colors.primary,
            fontWeight = androidx.compose.ui.text.font.FontWeight.Bold
        )
    }
}
