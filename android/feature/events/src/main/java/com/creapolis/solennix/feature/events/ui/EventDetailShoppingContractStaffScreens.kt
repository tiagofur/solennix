package com.creapolis.solennix.feature.events.ui

import android.widget.Toast
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.AssignmentStatus
import com.creapolis.solennix.core.model.DiscountType
import com.creapolis.solennix.core.model.extensions.asMXN
import com.creapolis.solennix.core.model.extensions.formatQuantity
import com.creapolis.solennix.feature.events.R
import com.creapolis.solennix.feature.events.viewmodel.EventDetailViewModel
import kotlinx.coroutines.launch

// ==================== Shopping List Screen ====================

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EventShoppingListScreen(
    viewModel: EventDetailViewModel,
    onNavigateBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = { Text(stringResource(R.string.events_detail_shopping_title)) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.events_detail_back))
                    }
                }
            )
        }
    ) { padding ->
        val event = uiState.event
        val supplies = uiState.supplies
        val purchaseSupplies = supplies.filter { it.source == com.creapolis.solennix.core.model.SupplySource.PURCHASE }
        val stockSupplies = supplies.filter { it.source == com.creapolis.solennix.core.model.SupplySource.STOCK }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            if (event != null) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                    shape = MaterialTheme.shapes.medium
                ) {
                    Column(
                        modifier = Modifier.padding(20.dp).fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(stringResource(R.string.events_detail_shopping_header).uppercase(), style = MaterialTheme.typography.labelSmall, color = SolennixTheme.colors.secondaryText)
                        Text(event.serviceType, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text(event.eventDate, style = MaterialTheme.typography.bodySmall, color = SolennixTheme.colors.secondaryText)
                    }
                }
            }

            if (purchaseSupplies.isNotEmpty()) {
                Text(stringResource(R.string.events_detail_shopping_purchase), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                purchaseSupplies.forEach { supply ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.error.copy(alpha = 0.05f)),
                        shape = MaterialTheme.shapes.medium
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp).fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(supply.supplyName ?: stringResource(R.string.events_detail_supplies_fallback), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                                Text("${supply.quantity.formatQuantity()} ${supply.unit ?: stringResource(R.string.events_detail_unit_each)}", style = MaterialTheme.typography.bodySmall, color = SolennixTheme.colors.secondaryText)
                            }
                            Text(
                                (supply.quantity * supply.unitCost).asMXN(),
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Bold,
                                color = SolennixTheme.colors.warning
                            )
                        }
                    }
                }
            }

            if (stockSupplies.isNotEmpty()) {
                Text(stringResource(R.string.events_detail_shopping_stock), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                stockSupplies.forEach { supply ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                        shape = MaterialTheme.shapes.medium
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp).fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(supply.supplyName ?: stringResource(R.string.events_detail_supplies_fallback), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium, modifier = Modifier.weight(1f))
                            Text("x${supply.quantity.formatQuantity()}", style = MaterialTheme.typography.bodyMedium, color = SolennixTheme.colors.success, fontWeight = FontWeight.Medium)
                        }
                    }
                }
            }

            if (purchaseSupplies.isEmpty() && stockSupplies.isEmpty()) {
                Box(Modifier.fillMaxWidth().padding(vertical = 48.dp), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(Icons.Default.ShoppingCart, contentDescription = null, tint = SolennixTheme.colors.secondaryText, modifier = Modifier.size(48.dp))
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(stringResource(R.string.events_detail_shopping_empty), style = MaterialTheme.typography.bodyMedium, color = SolennixTheme.colors.secondaryText)
                    }
                }
            }
        }
    }
}

// ==================== Contract Preview Screen ====================

@OptIn(ExperimentalMaterial3Api::class)
@Composable
