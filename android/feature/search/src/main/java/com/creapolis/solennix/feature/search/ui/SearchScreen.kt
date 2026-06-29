package com.creapolis.solennix.feature.search.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.component.StatusBadge
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveCenteredContent
import com.creapolis.solennix.core.designsystem.theme.LocalIsWideScreen
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.InventoryItem
import com.creapolis.solennix.core.model.Product
import com.creapolis.solennix.feature.clients.ui.ClientListItem
import com.creapolis.solennix.feature.search.R
import com.creapolis.solennix.feature.search.viewmodel.SearchViewModel
import com.creapolis.solennix.feature.search.viewmodel.SearchScope

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SearchScreen(
    viewModel: SearchViewModel,
    initialQuery: String? = null,
    onNavigateBack: () -> Unit,
    onClientClick: (String) -> Unit,
    onEventClick: (String) -> Unit,
    onProductClick: (String) -> Unit,
    onInventoryClick: (String) -> Unit,
    showBackButton: Boolean = true
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val selectedScope by viewModel.selectedScope.collectAsStateWithLifecycle()
    val recentQueries by viewModel.recentQueries.collectAsStateWithLifecycle()
    val isWideScreen = LocalIsWideScreen.current

    val handleClientClick = { id: String ->
        if (uiState.query.isNotBlank()) {
            viewModel.saveRecentQuery(uiState.query.trim())
        }
        onClientClick(id)
    }
    val handleEventClick = { id: String ->
        if (uiState.query.isNotBlank()) {
            viewModel.saveRecentQuery(uiState.query.trim())
        }
        onEventClick(id)
    }
    val handleProductClick = { id: String ->
        if (uiState.query.isNotBlank()) {
            viewModel.saveRecentQuery(uiState.query.trim())
        }
        onProductClick(id)
    }
    val handleInventoryClick = { id: String ->
        if (uiState.query.isNotBlank()) {
            viewModel.saveRecentQuery(uiState.query.trim())
        }
        onInventoryClick(id)
    }

    val filteredState = viewModel.getFilteredResults()

    LaunchedEffect(Unit) {
        if (!initialQuery.isNullOrBlank()) {
            viewModel.onQueryChange(initialQuery)
        }
    }

    val hasNoResults = filteredState.query.isNotBlank() &&
        !filteredState.isLoading &&
        filteredState.clients.isEmpty() &&
        filteredState.events.isEmpty() &&
        filteredState.products.isEmpty() &&
        filteredState.inventory.isEmpty() &&
        filteredState.error == null

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = { Text(stringResource(R.string.search_title)) },
                navigationIcon = {
                    if (showBackButton) {
                        IconButton(onClick = onNavigateBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.search_back))
                        }
                    }
                }
            )
        }
    ) { padding ->
        AdaptiveCenteredContent(
            modifier = Modifier.padding(padding),
            maxWidth = 800.dp
        ) {
        Column(modifier = Modifier.fillMaxSize()) {
            OutlinedTextField(
                value = uiState.query,
                onValueChange = { viewModel.onQueryChange(it) },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                placeholder = { Text(stringResource(R.string.search_placeholder)) },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                shape = MaterialTheme.shapes.medium,
                singleLine = true,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                keyboardActions = KeyboardActions(
                    onSearch = {
                        if (uiState.query.isNotBlank()) {
                            viewModel.saveRecentQuery(uiState.query.trim())
                        }
                    }
                )
            )

            // Scope filters
            val scopeOptions = listOf(
                SearchScope.ALL to stringResource(R.string.search_scope_all),
                SearchScope.CLIENTS to stringResource(R.string.search_scope_clients),
                SearchScope.EVENTS to stringResource(R.string.search_scope_events),
                SearchScope.PRODUCTS to stringResource(R.string.search_scope_products),
                SearchScope.INVENTORY to stringResource(R.string.search_scope_inventory)
            )

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                scopeOptions.forEach { (scope, label) ->
                    FilterChip(
                        selected = selectedScope == scope,
                        onClick = { viewModel.updateScope(scope) },
                        label = { Text(label, style = MaterialTheme.typography.labelSmall) },
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            // Recent queries section (show only when query is empty)
            if (filteredState.query.isBlank() && recentQueries.isNotEmpty()) {
                Column(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = stringResource(R.string.search_recent_title),
                            style = MaterialTheme.typography.titleSmall,
                            color = SolennixTheme.colors.secondaryText
                        )
                        TextButton(onClick = { viewModel.clearRecentQueries() }) {
                            Text(
                                text = stringResource(R.string.search_recent_clear),
                                style = MaterialTheme.typography.labelSmall
                            )
                        }
                    }
                    FlowRow(
                        modifier = Modifier.padding(horizontal = 16.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        recentQueries.forEach { query ->
                            FilterChip(
                                selected = false,
                                onClick = {
                                    viewModel.onQueryChange(query)
                                    viewModel.saveRecentQuery(query)
                                },
                                label = { Text(query, style = MaterialTheme.typography.bodySmall) },
                                leadingIcon = {
                                    Icon(
                                        Icons.Default.History,
                                        contentDescription = null,
                                        modifier = Modifier.size(16.dp)
                                    )
                                }
                            )
                        }
                    }
                }
            }

            if (uiState.isLoading) {
                Box(
                    modifier = Modifier.fillMaxWidth().padding(16.dp),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(modifier = Modifier.size(24.dp))
                }
            }

            if (uiState.error != null) {
                Text(
                    text = uiState.error.orEmpty(),
                    color = SolennixTheme.colors.error,
                    modifier = Modifier.padding(16.dp),
                    style = MaterialTheme.typography.bodyMedium
                )
            }

            if (isWideScreen) {
                // Tablet: 2x2 grid of category sections
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                        .verticalScroll(rememberScrollState())
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        // Left column: Clientes + Productos
                        Column(modifier = Modifier.weight(1f)) {
                            if (filteredState.clients.isNotEmpty()) {
                                Text(
                                    text = stringResource(R.string.search_section_clients),
                                    modifier = Modifier.padding(16.dp),
                                    style = MaterialTheme.typography.titleMedium,
                                    color = SolennixTheme.colors.primary
                                )
                                filteredState.clients.forEach { client ->
                                    ClientListItem(client = client, onClick = { handleClientClick(client.id) })
                                }
                            }
                            if (filteredState.products.isNotEmpty()) {
                                Text(
                                    text = stringResource(R.string.search_section_products),
                                    modifier = Modifier.padding(16.dp),
                                    style = MaterialTheme.typography.titleMedium,
                                    color = SolennixTheme.colors.primary
                                )
                                filteredState.products.forEach { product ->
                                    SearchProductListItem(
                                        product = product,
                                        onClick = { handleProductClick(product.id) }
                                    )
                                }
                            }
                        }
                        // Right column: Eventos + Inventario
                        Column(modifier = Modifier.weight(1f)) {
                            if (filteredState.events.isNotEmpty()) {
                                Text(
                                    text = stringResource(R.string.search_section_events),
                                    modifier = Modifier.padding(16.dp),
                                    style = MaterialTheme.typography.titleMedium,
                                    color = SolennixTheme.colors.primary
                                )
                                filteredState.events.forEach { event ->
                                    SearchEventListItem(
                                        event = event,
                                        onClick = { handleEventClick(event.id) }
                                    )
                                }
                            }
                            if (filteredState.inventory.isNotEmpty()) {
                                Text(
                                    text = stringResource(R.string.search_section_inventory),
                                    modifier = Modifier.padding(16.dp),
                                    style = MaterialTheme.typography.titleMedium,
                                    color = SolennixTheme.colors.primary
                                )
                                filteredState.inventory.forEach { item ->
                                    SearchInventoryListItem(
                                        item = item,
                                        onClick = { handleInventoryClick(item.id) }
                                    )
                                }
                            }
                        }
                    }

                    if (hasNoResults) {
                        Box(
                            modifier = Modifier.fillMaxWidth(),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = stringResource(R.string.search_no_results),
                                color = SolennixTheme.colors.secondaryText,
                                modifier = Modifier.padding(32.dp)
                            )
                        }
                    }
                }
            } else {
                // Phone: single column list
                LazyColumn(modifier = Modifier.fillMaxWidth().weight(1f)) {
                    // Clientes
                    if (filteredState.clients.isNotEmpty()) {
                        item {
                            Text(
                                text = stringResource(R.string.search_section_clients),
                                modifier = Modifier.padding(16.dp),
                                style = MaterialTheme.typography.titleMedium,
                                color = SolennixTheme.colors.primary
                            )
                        }
                        items(filteredState.clients) { client ->
                            ClientListItem(client = client, onClick = { handleClientClick(client.id) })
                        }
                    }

                    // Eventos
                    if (filteredState.events.isNotEmpty()) {
                        item {
                            Text(
                                text = stringResource(R.string.search_section_events),
                                modifier = Modifier.padding(16.dp),
                                style = MaterialTheme.typography.titleMedium,
                                color = SolennixTheme.colors.primary
                            )
                        }
                        items(filteredState.events) { event ->
                            SearchEventListItem(
                                event = event,
                                onClick = { handleEventClick(event.id) }
                            )
                        }
                    }

                    // Productos
                    if (filteredState.products.isNotEmpty()) {
                        item {
                            Text(
                                text = stringResource(R.string.search_section_products),
                                modifier = Modifier.padding(16.dp),
                                style = MaterialTheme.typography.titleMedium,
                                color = SolennixTheme.colors.primary
                            )
                        }
                        items(filteredState.products) { product ->
                            SearchProductListItem(
                                product = product,
                                onClick = { handleProductClick(product.id) }
                            )
                        }
                    }

                    // Inventario
                    if (filteredState.inventory.isNotEmpty()) {
                        item {
                            Text(
                                text = stringResource(R.string.search_section_inventory),
                                modifier = Modifier.padding(16.dp),
                                style = MaterialTheme.typography.titleMedium,
                                color = SolennixTheme.colors.primary
                            )
                        }
                        items(filteredState.inventory) { item ->
                            SearchInventoryListItem(
                                item = item,
                                onClick = { handleInventoryClick(item.id) }
                            )
                        }
                    }

                    // No results
                    if (hasNoResults) {
                        item {
                            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                Text(
                                    text = stringResource(R.string.search_no_results),
                                    color = SolennixTheme.colors.secondaryText,
                                    modifier = Modifier.padding(32.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
        }
    }
}

@Composable
fun SearchEventListItem(event: Event, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp)
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.medium
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = event.serviceType,
                    style = MaterialTheme.typography.titleSmall,
                    color = SolennixTheme.colors.primaryText
                )
                val formattedDate = remember(event.eventDate) {
                    try {
                        val parsed = java.time.LocalDate.parse(event.eventDate)
                        parsed.format(java.time.format.DateTimeFormatter.ofPattern("d MMM yyyy", java.util.Locale("es", "MX")))
                    } catch (e: Exception) {
                        event.eventDate
                    }
                }
                Text(
                    text = formattedDate,
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText
                )
            }
            StatusBadge(status = event.status.name)
        }
    }
}

@Composable
fun SearchProductListItem(product: Product, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp)
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.medium
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = product.name,
                    style = MaterialTheme.typography.titleSmall,
                    color = SolennixTheme.colors.primaryText
                )
                Text(
                    text = product.category,
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText
                )
            }
            Text(
                text = "$${product.basePrice}",
                style = MaterialTheme.typography.titleSmall,
                color = SolennixTheme.colors.primary
            )
        }
    }
}

@Composable
fun SearchInventoryListItem(item: InventoryItem, onClick: () -> Unit) {
    val isLowStock = item.minimumStock > 0 && item.currentStock < item.minimumStock

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp)
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.medium
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = item.ingredientName,
                    style = MaterialTheme.typography.titleSmall,
                    color = SolennixTheme.colors.primaryText
                )
                Text(
                    text = stringResource(R.string.search_inventory_stock, item.currentStock, item.unit),
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText
                )
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
                            text = stringResource(R.string.search_low_stock),
                            style = MaterialTheme.typography.labelSmall,
                            color = SolennixTheme.colors.warning
                        )
                    }
                }
            }
        }
    }
}
