package com.creapolis.solennix.feature.products.ui

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.material.icons.filled.SortByAlpha
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
import androidx.compose.ui.res.stringResource
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
                title = { Text("Productos") },
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
                        .padding(16.dp),
                    placeholder = { Text("Filtrar productos por nombre o categoría...") },
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
                        Icons.Default.SortByAlpha,
                        contentDescription = stringResource(DesignSystemR.string.cd_tune),
                        modifier = Modifier.size(16.dp),
                        tint = SolennixTheme.colors.secondaryText
                    )
                    ProductSortKey.entries.forEach { key ->
                        val label = when (key) {
                            ProductSortKey.NAME -> "Nombre"
                            ProductSortKey.PRICE -> "Precio"
                            ProductSortKey.CATEGORY -> "Categoría"
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

                if (uiState.allCategories.isNotEmpty()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState())
                            .padding(horizontal = 16.dp, vertical = 4.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        FilterChip(
                            selected = uiState.selectedCategory == null,
                            onClick = { viewModel.onCategoryFilterChange(null) },
                            label = { Text("Todos") },
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
                } else {
                    AdaptiveCardGrid(
                        contentPadding = PaddingValues(bottom = 80.dp),
                        gridContent = {
                            items(uiState.products, key = { it.id }) { product ->
                                ProductGridItem(
                                    product = product,
                                    onClick = { onProductClick(product.id) },
                                    onEdit = { onEditProduct(product.id) },
                                    onDelete = { viewModel.deleteProduct(product.id) }
                                )
                            }
                        },
                        listContent = {
                            items(uiState.products, key = { it.id }) { product ->
                                SwipeRevealActions(
                                    onEdit = { onEditProduct(product.id) },
                                    onDelete = { viewModel.deleteProduct(product.id) }
                                ) {
                                    Surface(color = SolennixTheme.colors.card) {
                                        ProductListItem(
                                            product = product,
                                            onClick = { onProductClick(product.id) },
                                            onEdit = { onEditProduct(product.id) },
                                            onDelete = { viewModel.deleteProduct(product.id) }
                                        )
                                    }
                                }
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
private fun ProductSkeletonList() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp)
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
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        SkeletonLoading(
                            modifier = Modifier
                                .size(60.dp)
                                .clip(MaterialTheme.shapes.medium)
                        )
                        Spacer(modifier = Modifier.width(16.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            SkeletonLoading(
                                modifier = Modifier
                                    .height(14.dp)
                                    .fillMaxWidth(0.5f)
                                    .clip(MaterialTheme.shapes.small)
                            )
                            Spacer(modifier = Modifier.height(4.dp))
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
                            modifier = Modifier.padding(horizontal = 16.dp),
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
    onEdit: () -> Unit = {},
    onDelete: () -> Unit = {}
) {
    var menuExpanded by remember { mutableStateOf(false) }

    Box {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .combinedClickable(
                    onClick = onClick,
                    onLongClick = { menuExpanded = true }
                ),
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
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(
                        text = product.name,
                        style = MaterialTheme.typography.titleMedium,
                        color = SolennixTheme.colors.primaryText,
                        maxLines = 1
                    )
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

        DropdownMenu(
            expanded = menuExpanded,
            onDismissRequest = { menuExpanded = false }
        ) {
            DropdownMenuItem(
                text = { Text("Editar") },
                leadingIcon = {
                    Icon(
                        Icons.Default.Edit,
                        contentDescription = stringResource(DesignSystemR.string.cd_edit)
                    )
                },
                onClick = { menuExpanded = false; onEdit() }
            )
            DropdownMenuItem(
                text = { Text("Eliminar", color = MaterialTheme.colorScheme.error) },
                leadingIcon = {
                    Icon(
                        Icons.Default.Delete,
                        contentDescription = stringResource(DesignSystemR.string.cd_delete),
                        tint = MaterialTheme.colorScheme.error
                    )
                },
                onClick = { menuExpanded = false; onDelete() }
            )
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun ProductListItem(
    product: Product,
    onClick: () -> Unit,
    onEdit: () -> Unit = {},
    onDelete: () -> Unit = {}
) {
    var menuExpanded by remember { mutableStateOf(false) }

    Box {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .combinedClickable(
                    onClick = onClick,
                    onLongClick = { menuExpanded = true }
                )
                .padding(16.dp),
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

            Spacer(modifier = Modifier.width(16.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = product.name,
                    style = MaterialTheme.typography.titleMedium,
                    color = SolennixTheme.colors.primaryText
                )
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

        DropdownMenu(
            expanded = menuExpanded,
            onDismissRequest = { menuExpanded = false }
        ) {
            DropdownMenuItem(
                text = { Text("Detalles") },
                leadingIcon = {
                    Icon(
                        Icons.Default.Info,
                        contentDescription = stringResource(DesignSystemR.string.cd_visibility)
                    )
                },
                onClick = { menuExpanded = false; onClick() }
            )
            DropdownMenuItem(
                text = { Text("Editar") },
                leadingIcon = {
                    Icon(
                        Icons.Default.Edit,
                        contentDescription = stringResource(DesignSystemR.string.cd_edit)
                    )
                },
                onClick = { menuExpanded = false; onEdit() }
            )
            DropdownMenuItem(
                text = { Text("Eliminar", color = MaterialTheme.colorScheme.error) },
                leadingIcon = {
                    Icon(
                        Icons.Default.Delete,
                        contentDescription = stringResource(DesignSystemR.string.cd_delete),
                        tint = MaterialTheme.colorScheme.error
                    )
                },
                onClick = { menuExpanded = false; onDelete() }
            )
        }
    }
}
