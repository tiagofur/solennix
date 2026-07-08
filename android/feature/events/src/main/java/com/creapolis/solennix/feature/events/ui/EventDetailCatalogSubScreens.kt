package com.creapolis.solennix.feature.events.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.extensions.asCurrency
import com.creapolis.solennix.core.model.extensions.formatQuantity
import com.creapolis.solennix.feature.events.R
import com.creapolis.solennix.feature.events.viewmodel.EventDetailViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EventProductsScreen(
    viewModel: EventDetailViewModel,
    onNavigateBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = { Text(stringResource(R.string.events_catalog_products_title)) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.events_common_back))
                    }
                }
            )
        }
    ) { padding ->
        val products = uiState.products
        val subtotal = products.sumOf { it.totalPrice ?: (it.quantity * it.unitPrice) }
        val currencyCode = uiState.event?.currencyCode ?: "MXN"

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            if (products.isEmpty()) {
                Box(Modifier.fillMaxWidth().padding(vertical = 48.dp), contentAlignment = Alignment.Center) {
                    Text(stringResource(R.string.events_catalog_products_empty), style = MaterialTheme.typography.bodyMedium, color = SolennixTheme.colors.secondaryText)
                }
            } else {
                Surface(shape = MaterialTheme.shapes.medium, color = SolennixTheme.colors.primary.copy(alpha = 0.1f)) {
                    Row(modifier = Modifier.fillMaxWidth().padding(16.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(pluralStringResource(R.plurals.events_catalog_products_count, products.size, products.size), style = MaterialTheme.typography.bodyMedium, color = SolennixTheme.colors.secondaryText)
                        Text(stringResource(R.string.events_catalog_subtotal_value, subtotal.asCurrency(currencyCode)), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold, color = SolennixTheme.colors.primary)
                    }
                }

                products.forEach { product ->
                    val name = product.productName ?: stringResource(R.string.events_catalog_product_fallback)
                    val total = product.totalPrice ?: (product.quantity * product.unitPrice)
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                        shape = MaterialTheme.shapes.medium
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp).fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(name, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                                Text(stringResource(R.string.events_catalog_quantity_price, product.quantity.formatQuantity(), product.unitPrice.asCurrency(currencyCode)), style = MaterialTheme.typography.bodySmall, color = SolennixTheme.colors.secondaryText)
                            }
                            Text(total.asCurrency(currencyCode), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EventExtrasScreen(
    viewModel: EventDetailViewModel,
    onNavigateBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = { Text(stringResource(R.string.events_catalog_extras_title)) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.events_common_back))
                    }
                }
            )
        }
    ) { padding ->
        val extras = uiState.extras
        val subtotal = extras.sumOf { it.price }
        val currencyCode = uiState.event?.currencyCode ?: "MXN"

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            if (extras.isEmpty()) {
                Box(Modifier.fillMaxWidth().padding(vertical = 48.dp), contentAlignment = Alignment.Center) {
                    Text(stringResource(R.string.events_catalog_extras_empty), style = MaterialTheme.typography.bodyMedium, color = SolennixTheme.colors.secondaryText)
                }
            } else {
                Surface(shape = MaterialTheme.shapes.medium, color = SolennixTheme.colors.info.copy(alpha = 0.1f)) {
                    Row(modifier = Modifier.fillMaxWidth().padding(16.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(pluralStringResource(R.plurals.events_catalog_extras_count, extras.size, extras.size), style = MaterialTheme.typography.bodyMedium, color = SolennixTheme.colors.secondaryText)
                        Text(stringResource(R.string.events_catalog_subtotal_value, subtotal.asCurrency(currencyCode)), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold, color = SolennixTheme.colors.info)
                    }
                }

                extras.forEach { extra ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                        shape = MaterialTheme.shapes.medium
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp).fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(extra.description, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(extra.price.asCurrency(currencyCode), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
    }
}
