package com.creapolis.solennix.feature.events.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.component.SolennixTextField
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.extensions.asMXN
import com.creapolis.solennix.feature.events.R
import com.creapolis.solennix.feature.events.viewmodel.EventFormViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun EquipmentPickerSheet(
    viewModel: EventFormViewModel,
    onDismiss: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var searchQuery by remember { mutableStateOf("") }
    val equipment by viewModel.availableEquipment.collectAsStateWithLifecycle()
    val filtered = remember(searchQuery, equipment) {
        if (searchQuery.isBlank()) equipment
        else equipment.filter { it.ingredientName.contains(searchQuery, ignoreCase = true) }
    }
    val selectedIds = remember(viewModel.selectedEquipment.size) {
        viewModel.selectedEquipment.map { it.inventoryId }.toSet()
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = SolennixTheme.colors.card
    ) {
        Column(modifier = Modifier.padding(horizontal = 16.dp).padding(bottom = 16.dp)) {
            Text(stringResource(R.string.events_form_inventory_select_equipment), style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(bottom = 12.dp))
            SolennixTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                label = stringResource(R.string.events_form_inventory_search_equipment),
                leadingIcon = Icons.Default.Search,
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(modifier = Modifier.height(12.dp))
            LazyColumn(modifier = Modifier.heightIn(max = 400.dp)) {
                items(filtered.size) { index ->
                    val item = filtered[index]
                    val isSelected = selectedIds.contains(item.id)
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 3.dp)
                            .clickable {
                                if (!isSelected) {
                                    viewModel.addEquipment(item, 1)
                                }
                                onDismiss()
                            },
                        colors = CardDefaults.cardColors(
                            containerColor = if (isSelected) SolennixTheme.colors.primary.copy(alpha = 0.08f)
                            else SolennixTheme.colors.card
                        ),
                        shape = MaterialTheme.shapes.medium
                    ) {
                        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(item.ingredientName, style = MaterialTheme.typography.bodyLarge)
                                Text(
                                    stringResource(R.string.events_form_inventory_available_value, item.currentStock.toInt().toString(), item.unit),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = SolennixTheme.colors.secondaryText
                                )
                            }
                            if (isSelected) {
                                Icon(Icons.Default.CheckCircle, contentDescription = stringResource(R.string.events_form_products_selected_a11y), tint = SolennixTheme.colors.success, modifier = Modifier.size(20.dp))
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
internal fun SupplyPickerSheet(
    viewModel: EventFormViewModel,
    onDismiss: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var searchQuery by remember { mutableStateOf("") }
    val supplies by viewModel.availableSupplies.collectAsStateWithLifecycle()
    val filtered = remember(searchQuery, supplies) {
        if (searchQuery.isBlank()) supplies
        else supplies.filter { it.ingredientName.contains(searchQuery, ignoreCase = true) }
    }
    val selectedIds = remember(viewModel.selectedSupplies.size) {
        viewModel.selectedSupplies.map { it.inventoryId }.toSet()
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = SolennixTheme.colors.card
    ) {
        Column(modifier = Modifier.padding(horizontal = 16.dp).padding(bottom = 16.dp)) {
            Text(stringResource(R.string.events_form_inventory_select_supply), style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(bottom = 12.dp))
            SolennixTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                label = stringResource(R.string.events_form_inventory_search_supply),
                leadingIcon = Icons.Default.Search,
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(modifier = Modifier.height(12.dp))
            LazyColumn(modifier = Modifier.heightIn(max = 400.dp)) {
                items(filtered.size) { index ->
                    val item = filtered[index]
                    val isSelected = selectedIds.contains(item.id)
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 3.dp)
                            .clickable {
                                if (!isSelected) {
                                    viewModel.addSupply(item, 1.0)
                                }
                                onDismiss()
                            },
                        colors = CardDefaults.cardColors(
                            containerColor = if (isSelected) SolennixTheme.colors.primary.copy(alpha = 0.08f)
                            else SolennixTheme.colors.card
                        ),
                        shape = MaterialTheme.shapes.medium
                    ) {
                        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(item.ingredientName, style = MaterialTheme.typography.bodyLarge)
                                Row(horizontalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(12.dp)) {
                                    Text(
                                        stringResource(R.string.events_form_inventory_stock_value, String.format("%.1f", item.currentStock), item.unit),
                                        style = MaterialTheme.typography.bodySmall,
                                        color = SolennixTheme.colors.secondaryText
                                    )
                                    val unitCost = item.unitCost
                                    if (unitCost != null) {
                                        Text(
                                            stringResource(R.string.events_form_inventory_unit_cost_value, unitCost.asMXN(), item.unit),
                                            style = MaterialTheme.typography.bodySmall,
                                            color = SolennixTheme.colors.primary
                                        )
                                    }
                                }
                            }
                            if (isSelected) {
                                Icon(Icons.Default.CheckCircle, contentDescription = stringResource(R.string.events_form_products_selected_a11y), tint = SolennixTheme.colors.success, modifier = Modifier.size(20.dp))
                            }
                        }
                    }
                }
            }
        }
    }
}
