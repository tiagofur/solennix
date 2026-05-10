package com.creapolis.solennix.feature.events.ui

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddCircle
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.Lightbulb
import androidx.compose.material.icons.filled.RemoveCircle
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.theme.LocalIsWideScreen
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.EventSupply
import com.creapolis.solennix.core.model.SupplySource
import com.creapolis.solennix.core.model.extensions.asMXN
import com.creapolis.solennix.feature.events.R
import com.creapolis.solennix.feature.events.viewmodel.EventFormViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SuppliesSection(viewModel: EventFormViewModel) {
    var showSupplyPicker by remember { mutableStateOf(false) }
    val suggestions by viewModel.supplySuggestions.collectAsStateWithLifecycle()
    val isWideScreen = LocalIsWideScreen.current

    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            stringResource(R.string.events_form_inventory_supplies),
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = SolennixTheme.colors.primaryText,
        )
        Spacer(modifier = Modifier.height(12.dp))

        if (suggestions.isNotEmpty()) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.warning.copy(alpha = 0.08f)),
                shape = MaterialTheme.shapes.medium
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Lightbulb, contentDescription = null, tint = SolennixTheme.colors.warning, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(stringResource(R.string.events_form_inventory_suggestions), style = MaterialTheme.typography.labelMedium, color = SolennixTheme.colors.warning)
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        suggestions.forEach { suggestion ->
                            val alreadyAdded = viewModel.selectedSupplies.any { it.inventoryId == suggestion.id }
                            FilterChip(
                                selected = alreadyAdded,
                                onClick = { if (!alreadyAdded) viewModel.addSupplyFromSuggestion(suggestion) },
                                label = { Text("${suggestion.ingredientName} (${String.format("%.1f", suggestion.suggestedQuantity)})") },
                                leadingIcon = if (alreadyAdded) { { Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp)) } } else null
                            )
                        }
                    }
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
        }

        AddItemCard(label = stringResource(R.string.events_form_inventory_add_supply)) { showSupplyPicker = true }

        Spacer(modifier = Modifier.height(16.dp))

        if (viewModel.selectedSupplies.isEmpty()) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Icon(
                    Icons.Default.Inventory2,
                    contentDescription = null,
                    tint = SolennixTheme.colors.secondaryText,
                    modifier = Modifier.size(48.dp),
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    stringResource(R.string.events_form_inventory_empty_supplies_title),
                    style = MaterialTheme.typography.titleSmall,
                    color = SolennixTheme.colors.secondaryText,
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    stringResource(R.string.events_form_inventory_empty_supplies_desc),
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText,
                )
            }
        } else {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                if (isWideScreen) {
                    viewModel.selectedSupplies.chunked(2).forEach { pair ->
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                            Box(modifier = Modifier.weight(1f)) {
                                SupplyCard(
                                    supply = pair[0],
                                    onQuantityChange = { viewModel.updateSupplyQuantity(pair[0].inventoryId, it) },
                                    onSourceChange = { viewModel.updateSupplySource(pair[0].inventoryId, it) },
                                    onExcludeCostChange = { viewModel.updateSupplyExcludeCost(pair[0].inventoryId, it) },
                                    onRemove = { viewModel.removeSupply(pair[0].inventoryId) }
                                )
                            }
                            if (pair.size > 1) {
                                Box(modifier = Modifier.weight(1f)) {
                                    SupplyCard(
                                        supply = pair[1],
                                        onQuantityChange = { viewModel.updateSupplyQuantity(pair[1].inventoryId, it) },
                                        onSourceChange = { viewModel.updateSupplySource(pair[1].inventoryId, it) },
                                        onExcludeCostChange = { viewModel.updateSupplyExcludeCost(pair[1].inventoryId, it) },
                                        onRemove = { viewModel.removeSupply(pair[1].inventoryId) }
                                    )
                                }
                            } else {
                                Spacer(modifier = Modifier.weight(1f))
                            }
                        }
                    }
                } else {
                    viewModel.selectedSupplies.forEach { supply ->
                        SupplyCard(
                            supply = supply,
                            onQuantityChange = { viewModel.updateSupplyQuantity(supply.inventoryId, it) },
                            onSourceChange = { viewModel.updateSupplySource(supply.inventoryId, it) },
                            onExcludeCostChange = { viewModel.updateSupplyExcludeCost(supply.inventoryId, it) },
                            onRemove = { viewModel.removeSupply(supply.inventoryId) }
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(12.dp))
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.surfaceAlt),
                shape = MaterialTheme.shapes.medium,
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        stringResource(R.string.events_form_inventory_supplies_cost),
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium,
                        color = SolennixTheme.colors.secondaryText,
                        modifier = Modifier.weight(1f),
                    )
                    Text(
                        viewModel.costSupplies.asMXN(),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = SolennixTheme.colors.primary,
                    )
                }
            }
        }
    }

    if (showSupplyPicker) {
        SupplyPickerSheet(
            viewModel = viewModel,
            onDismiss = { showSupplyPicker = false }
        )
    }
}

@Composable
private fun SupplyCard(
    supply: EventSupply,
    onQuantityChange: (Double) -> Unit,
    onSourceChange: (SupplySource) -> Unit,
    onExcludeCostChange: (Boolean) -> Unit,
    onRemove: () -> Unit
) {
    val isInteger = isIntegerSupplyUnit(supply.unit)
    var qtyText by remember(supply.inventoryId, isInteger) {
        mutableStateOf(
            if (isInteger) supply.quantity.toInt().toString()
            else if (supply.quantity > 0) "%.1f".format(supply.quantity) else ""
        )
    }

    Card(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        border = androidx.compose.foundation.BorderStroke(1.dp, SolennixTheme.colors.borderLight),
        shape = MaterialTheme.shapes.medium
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(supply.supplyName ?: stringResource(R.string.events_detail_supplies_fallback), style = MaterialTheme.typography.titleSmall)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        val unit = supply.unit
                        if (unit != null) {
                            Text(stringResource(R.string.events_form_inventory_unit_value, unit), style = MaterialTheme.typography.bodySmall, color = SolennixTheme.colors.secondaryText)
                        }
                        val currentStock = supply.currentStock
                        if (currentStock != null) {
                            Text(
                                stringResource(R.string.events_form_inventory_stock_only_value, String.format("%.1f", currentStock)),
                                style = MaterialTheme.typography.bodySmall,
                                color = if (currentStock >= supply.quantity) SolennixTheme.colors.success else SolennixTheme.colors.error
                            )
                        }
                    }
                    Text(
                        stringResource(R.string.events_form_inventory_cost_formula, supply.unitCost.asMXN(), String.format("%.1f", supply.quantity), (supply.unitCost * supply.quantity).asMXN()),
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.primary
                    )
                }
                IconButton(onClick = onRemove) {
                    Icon(
                        Icons.Default.Delete,
                        contentDescription = stringResource(R.string.events_form_products_delete_a11y),
                        tint = SolennixTheme.colors.error,
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (isInteger) {
                    IconButton(
                        onClick = { onQuantityChange((supply.quantity - 1).coerceAtLeast(1.0)) },
                        enabled = supply.quantity > 1,
                        modifier = Modifier.size(36.dp)
                    ) {
                        Icon(
                            Icons.Default.RemoveCircle,
                            contentDescription = stringResource(R.string.events_form_products_decrease_a11y),
                            tint = if (supply.quantity > 1) SolennixTheme.colors.primary else SolennixTheme.colors.secondaryText,
                            modifier = Modifier.size(22.dp),
                        )
                    }
                    EditableQuantityField(
                        value = supply.quantity.toInt(),
                        onValueChange = { onQuantityChange(it.toDouble()) },
                        minValue = 1,
                        key = supply.inventoryId,
                        width = 32.dp,
                        textStyle = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.Bold,
                        ),
                    )
                    IconButton(
                        onClick = { onQuantityChange(supply.quantity + 1) },
                        modifier = Modifier.size(36.dp)
                    ) {
                        Icon(
                            Icons.Default.AddCircle,
                            contentDescription = stringResource(R.string.events_form_products_increase_a11y),
                            tint = SolennixTheme.colors.primary,
                            modifier = Modifier.size(22.dp),
                        )
                    }
                } else {
                    OutlinedTextField(
                        value = qtyText,
                        onValueChange = { raw ->
                            val normalized = raw.replace(',', '.')
                            if (normalized.isEmpty() || normalized.matches(Regex("""^\d*\.?\d*$"""))) {
                                qtyText = normalized
                                onQuantityChange(normalized.toDoubleOrNull() ?: 0.0)
                            }
                        },
                        label = { Text(stringResource(R.string.events_form_inventory_quantity)) },
                        placeholder = { Text("0.0") },
                        modifier = Modifier.width(110.dp),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal),
                        shape = MaterialTheme.shapes.small,
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                FilterChip(
                    selected = supply.source == SupplySource.STOCK,
                    onClick = { onSourceChange(SupplySource.STOCK) },
                    label = { Text(stringResource(R.string.events_form_inventory_source_stock)) }
                )
                FilterChip(
                    selected = supply.source == SupplySource.PURCHASE,
                    onClick = { onSourceChange(SupplySource.PURCHASE) },
                    label = { Text(stringResource(R.string.events_form_inventory_source_purchase)) }
                )
            }

            if (supply.source == SupplySource.STOCK) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        stringResource(R.string.events_form_inventory_exclude_cost),
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.secondaryText,
                        modifier = Modifier.weight(1f),
                    )
                    Switch(
                        checked = supply.excludeCost,
                        onCheckedChange = { onExcludeCostChange(it) },
                        colors = androidx.compose.material3.SwitchDefaults.colors(
                            checkedThumbColor = SolennixTheme.colors.primary,
                            checkedTrackColor = SolennixTheme.colors.primary.copy(alpha = 0.5f),
                        ),
                    )
                }
            }
        }
    }
}

private fun isIntegerSupplyUnit(unit: String?): Boolean {
    val normalized = unit?.trim()?.lowercase().orEmpty()
    if (normalized.isEmpty()) return true
    return normalized in setOf(
        "unidad", "unidades", "u", "ud", "uds",
        "pz", "pza", "pzas", "pieza", "piezas",
        "bolsa", "bolsas",
        "caja", "cajas",
        "botella", "botellas",
        "pack", "packs",
    )
}
