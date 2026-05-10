package com.creapolis.solennix.feature.events.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
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
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.SupplySource
import com.creapolis.solennix.core.model.extensions.asMXN
import com.creapolis.solennix.core.model.extensions.formatQuantity
import com.creapolis.solennix.feature.events.R
import com.creapolis.solennix.feature.events.viewmodel.EventDetailViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EventSuppliesScreen(
    viewModel: EventDetailViewModel,
    onNavigateBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = { Text(stringResource(R.string.events_detail_supplies_title)) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.events_detail_back))
                    }
                }
            )
        }
    ) { padding ->
        val supplies = uiState.supplies
        val totalCost = supplies.sumOf { it.quantity * it.unitCost }
        val stockCount = supplies.count { it.source == SupplySource.STOCK }
        val purchaseCount = supplies.count { it.source == SupplySource.PURCHASE }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            if (supplies.isEmpty()) {
                Box(Modifier.fillMaxWidth().padding(vertical = 48.dp), contentAlignment = Alignment.Center) {
                    Text(stringResource(R.string.events_detail_supplies_empty), style = MaterialTheme.typography.bodyMedium, color = SolennixTheme.colors.secondaryText)
                }
            } else {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    KpiCard(stringResource(R.string.events_detail_supplies_kpi_total), "${supplies.size}", SolennixTheme.colors.warning, Modifier.weight(1f))
                    KpiCard(stringResource(R.string.events_detail_supplies_kpi_stock), "$stockCount", SolennixTheme.colors.success, Modifier.weight(1f))
                    KpiCard(stringResource(R.string.events_detail_supplies_kpi_purchase), "$purchaseCount", SolennixTheme.colors.error, Modifier.weight(1f))
                    KpiCard(stringResource(R.string.events_detail_supplies_kpi_cost), totalCost.asMXN(), SolennixTheme.colors.warning, Modifier.weight(1f))
                }

                supplies.forEach { supply ->
                    val sourceLabel = when (supply.source) {
                        SupplySource.STOCK -> stringResource(R.string.events_detail_supplies_source_stock)
                        SupplySource.PURCHASE -> stringResource(R.string.events_detail_supplies_source_purchase)
                    }
                    val sourceColor = when (supply.source) {
                        SupplySource.STOCK -> SolennixTheme.colors.success
                        SupplySource.PURCHASE -> SolennixTheme.colors.warning
                    }

                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                        shape = MaterialTheme.shapes.medium
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp).fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(supply.supplyName ?: stringResource(R.string.events_detail_supplies_fallback), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                                Surface(shape = MaterialTheme.shapes.small, color = sourceColor.copy(alpha = 0.12f)) {
                                    Text(sourceLabel, modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp), style = MaterialTheme.typography.labelSmall, color = sourceColor)
                                }
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text((supply.quantity * supply.unitCost).asMXN(), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Bold)
                                Text("${supply.quantity.formatQuantity()} x ${supply.unitCost.asMXN()}", style = MaterialTheme.typography.bodySmall, color = SolennixTheme.colors.secondaryText)
                            }
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EventEquipmentScreen(
    viewModel: EventDetailViewModel,
    onNavigateBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = { Text(stringResource(R.string.events_detail_equipment_title)) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.events_detail_back))
                    }
                }
            )
        }
    ) { padding ->
        val equipment = uiState.equipment

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            if (equipment.isEmpty()) {
                Box(Modifier.fillMaxWidth().padding(vertical = 48.dp), contentAlignment = Alignment.Center) {
                    Text(stringResource(R.string.events_detail_equipment_empty), style = MaterialTheme.typography.bodyMedium, color = SolennixTheme.colors.secondaryText)
                }
            } else {
                Surface(shape = MaterialTheme.shapes.medium, color = SolennixTheme.colors.success.copy(alpha = 0.1f)) {
                    Text(
                        stringResource(
                            if (equipment.size == 1) R.string.events_detail_equipment_count_one else R.string.events_detail_equipment_count_other,
                            equipment.size
                        ),
                        modifier = Modifier.fillMaxWidth().padding(16.dp),
                        style = MaterialTheme.typography.bodyMedium,
                        color = SolennixTheme.colors.secondaryText
                    )
                }

                equipment.forEach { item ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                        shape = MaterialTheme.shapes.medium
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp).fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(item.equipmentName ?: stringResource(R.string.events_detail_equipment_fallback), style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                                if (!item.notes.isNullOrEmpty()) {
                                    Text(item.notes!!, style = MaterialTheme.typography.bodySmall, color = SolennixTheme.colors.secondaryText)
                                }
                            }
                            Surface(shape = MaterialTheme.shapes.small, color = SolennixTheme.colors.success.copy(alpha = 0.1f)) {
                                Text(
                                    "x${item.quantity}",
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = SolennixTheme.colors.success
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
