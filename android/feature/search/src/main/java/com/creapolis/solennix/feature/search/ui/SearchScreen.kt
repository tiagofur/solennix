package com.creapolis.solennix.feature.search.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
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
import com.creapolis.solennix.feature.search.viewmodel.SearchViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SearchScreen(
    viewModel: SearchViewModel,
    initialQuery: String? = null,
    onNavigateBack: () -> Unit,
    onClientClick: (String) -> Unit,
    onEventClick: (String) -> Unit,
    onProductClick: (String) -> Unit,
    onInventoryClick: (String) -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val isWideScreen = LocalIsWideScreen.current

    LaunchedEffect(Unit) {
        if (!initialQuery.isNullOrBlank()) {
            viewModel.onQueryChange(initialQuery)
        }
    }

    val hasNoResults = uiState.query.isNotBlank() &&
        !uiState.isLoading &&
        uiState.clients.isEmpty() &&
        uiState.events.isEmpty() &&
        uiState.products.isEmpty() &&
        uiState.inventory.isEmpty() &&
        uiState.error == null

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = { Text("Buscar") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Volver")
                    }
                }
            )
        }
    ) { padding ->
        AdaptiveCenteredContent(
            modifier = Modifier.padding(padding),
            maxWidth = 800.dp
        ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            OutlinedTextField(
                value = uiState.query,
                onValueChange = { viewModel.onQueryChange(it) },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                placeholder = { Text("Buscar eventos, clientes, productos...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                shape = MaterialTheme.shapes.medium,
                singleLine = true
            )

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
                        .fillMaxSize()
                        .verticalScroll(rememberScrollState())
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        // Left column: Clientes + Productos
                        Column(modifier = Modifier.weight(1f)) {
                            if (uiState.clients.isNotEmpty()) {
                                Text(
                                    text = "Clientes",
                                    modifier = Modifier.padding(16.dp),
                                    style = MaterialTheme.typography.titleMedium,
                                    color = SolennixTheme.colors.primary
                                )
                                uiState.clients.forEach { client ->
                                    ClientListItem(client = client, onClick = { onClientClick(client.id) })
                                }
                            }
                            if (uiState.products.isNotEmpty()) {
                                Text(
                                    text = "Productos",
                                    modifier = Modifier.padding(16.dp),
                                    style = MaterialTheme.typography.titleMedium,
                                    color = SolennixTheme.colors.primary
                                )
                                uiState.products.forEach { product ->
                                    SearchProductListItem(
                                        product = product,
                                        onClick = { onProductClick(product.id) }
                                    )
                                }
                            }
                        }
                        // Right column: Eventos + Inventario
                        Column(modifier = Modifier.weight(1f)) {
                            if (uiState.events.isNotEmpty()) {
                                Text(
                                    text = "Eventos",
                                    modifier = Modifier.padding(16.dp),
                                    style = MaterialTheme.typography.titleMedium,
                                    color = SolennixTheme.colors.primary
                                )
                                uiState.events.forEach { event ->
                                    SearchEventListItem(
                                        event = event,
                                        onClick = { onEventClick(event.id) }
                                    )
                                }
                            }
                            if (uiState.inventory.isNotEmpty()) {
                                Text(
                                    text = "Inventario",
                                    modifier = Modifier.padding(16.dp),
                                    style = MaterialTheme.typography.titleMedium,
                                    color = SolennixTheme.colors.primary
                                )
                                uiState.inventory.forEach { item ->
                                    SearchInventoryListItem(
                                        item = item,
                                        onClick = { onInventoryClick(item.id) }
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
                                text = "No se encontraron resultados",
                                color = SolennixTheme.colors.secondaryText,
                                modifier = Modifier.padding(32.dp)
                            )
                        }
                    }
                }
            } else {
                // Phone: single column list
                LazyColumn(modifier = Modifier.fillMaxSize()) {
                    // Clientes
                    if (uiState.clients.isNotEmpty()) {
                        item {
                            Text(
                                text = "Clientes",
                                modifier = Modifier.padding(16.dp),
                                style = MaterialTheme.typography.titleMedium,
                                color = SolennixTheme.colors.primary
                            )
                        }
                        items(uiState.clients) { client ->
                            ClientListItem(client = client, onClick = { onClientClick(client.id) })
                        }
                    }

                    // Eventos
                    if (uiState.events.isNotEmpty()) {
                        item {
                            Text(
                                text = "Eventos",
                                modifier = Modifier.padding(16.dp),
                                style = MaterialTheme.typography.titleMedium,
                                color = SolennixTheme.colors.primary
                            )
                        }
                        items(uiState.events) { event ->
                            SearchEventListItem(
                                event = event,
                                onClick = { onEventClick(event.id) }
                            )
                        }
                    }

                    // Productos
                    if (uiState.products.isNotEmpty()) {
                        item {
                            Text(
                                text = "Productos",
                                modifier = Modifier.padding(16.dp),
                                style = MaterialTheme.typography.titleMedium,
                                color = SolennixTheme.colors.primary
                            )
                        }
                        items(uiState.products) { product ->
                            SearchProductListItem(
                                product = product,
                                onClick = { onProductClick(product.id) }
                            )
                        }
                    }

                    // Inventario
                    if (uiState.inventory.isNotEmpty()) {
                        item {
                            Text(
                                text = "Inventario",
                                modifier = Modifier.padding(16.dp),
                                style = MaterialTheme.typography.titleMedium,
                                color = SolennixTheme.colors.primary
                            )
                        }
                        items(uiState.inventory) { item ->
                            SearchInventoryListItem(
                                item = item,
                                onClick = { onInventoryClick(item.id) }
                            )
                        }
                    }

                    // No results
                    if (hasNoResults) {
                        item {
                            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                                Text(
                                    text = "No se encontraron resultados",
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
                Text(
                    text = event.eventDate,
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
                    text = "Stock: ${item.currentStock} ${item.unit}",
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
                            text = "Bajo",
                            style = MaterialTheme.typography.labelSmall,
                            color = SolennixTheme.colors.warning
                        )
                    }
                }
            }
        }
    }
}
