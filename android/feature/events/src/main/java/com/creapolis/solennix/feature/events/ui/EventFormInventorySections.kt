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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddCircle
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Lightbulb
import androidx.compose.material.icons.filled.RemoveCircle
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
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
import com.creapolis.solennix.core.model.EventEquipment
import com.creapolis.solennix.feature.events.R
import com.creapolis.solennix.feature.events.viewmodel.EventFormViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EquipmentSection(viewModel: EventFormViewModel) {
    var showEquipmentPicker by remember { mutableStateOf(false) }
    val suggestions by viewModel.equipmentSuggestions.collectAsStateWithLifecycle()
    val conflicts by viewModel.equipmentConflicts.collectAsStateWithLifecycle()
    val isWideScreen = LocalIsWideScreen.current

    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            stringResource(R.string.events_form_inventory_equipment),
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = SolennixTheme.colors.primaryText,
        )
        Spacer(modifier = Modifier.height(12.dp))

        if (conflicts.isNotEmpty()) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.error.copy(alpha = 0.08f)),
                border = androidx.compose.foundation.BorderStroke(1.dp, SolennixTheme.colors.error.copy(alpha = 0.3f)),
                shape = MaterialTheme.shapes.medium
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Warning, contentDescription = null, tint = SolennixTheme.colors.error, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(stringResource(R.string.events_form_inventory_conflicts), style = MaterialTheme.typography.labelMedium, color = SolennixTheme.colors.error)
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    conflicts.forEach { conflict ->
                        Text(
                            "${conflict.equipmentName} — ${conflict.serviceType}${if (!conflict.clientName.isNullOrBlank()) " (${conflict.clientName})" else ""}",
                            style = MaterialTheme.typography.bodySmall,
                            color = SolennixTheme.colors.error
                        )
                    }
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
        }

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
                            val alreadyAdded = viewModel.selectedEquipment.any { it.inventoryId == suggestion.id }
                            FilterChip(
                                selected = alreadyAdded,
                                onClick = { if (!alreadyAdded) viewModel.addEquipmentFromSuggestion(suggestion) },
                                label = { Text("${suggestion.ingredientName} (${suggestion.suggestedQuantity.toInt()})") },
                                leadingIcon = if (alreadyAdded) { { Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp)) } } else null
                            )
                        }
                    }
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
        }

        AddItemCard(label = stringResource(R.string.events_form_inventory_add_equipment)) { showEquipmentPicker = true }

        Spacer(modifier = Modifier.height(16.dp))

        if (viewModel.selectedEquipment.isEmpty()) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Icon(
                    Icons.Default.Build,
                    contentDescription = null,
                    tint = SolennixTheme.colors.secondaryText,
                    modifier = Modifier.size(48.dp),
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    stringResource(R.string.events_form_inventory_empty_equipment_title),
                    style = MaterialTheme.typography.titleSmall,
                    color = SolennixTheme.colors.secondaryText,
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    stringResource(R.string.events_form_inventory_empty_equipment_desc),
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
                    val chunked = viewModel.selectedEquipment.chunked(2)
                    chunked.forEach { pair ->
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                            Box(modifier = Modifier.weight(1f)) {
                                EquipmentCard(
                                    equipment = pair[0],
                                    onQuantityChange = { viewModel.updateEquipmentQuantity(pair[0].inventoryId, it) },
                                    onRemove = { viewModel.removeEquipment(pair[0].inventoryId) }
                                )
                            }
                            if (pair.size > 1) {
                                Box(modifier = Modifier.weight(1f)) {
                                    EquipmentCard(
                                        equipment = pair[1],
                                        onQuantityChange = { viewModel.updateEquipmentQuantity(pair[1].inventoryId, it) },
                                        onRemove = { viewModel.removeEquipment(pair[1].inventoryId) }
                                    )
                                }
                            } else {
                                Spacer(modifier = Modifier.weight(1f))
                            }
                        }
                    }
                } else {
                    viewModel.selectedEquipment.forEach { eq ->
                        EquipmentCard(
                            equipment = eq,
                            onQuantityChange = { viewModel.updateEquipmentQuantity(eq.inventoryId, it) },
                            onRemove = { viewModel.removeEquipment(eq.inventoryId) }
                        )
                    }
                }
            }
        }
    }

    if (showEquipmentPicker) {
        EquipmentPickerSheet(
            viewModel = viewModel,
            onDismiss = { showEquipmentPicker = false }
        )
    }
}

@Composable
private fun EquipmentCard(
    equipment: EventEquipment,
    onQuantityChange: (Int) -> Unit,
    onRemove: () -> Unit
) {
    val stock = equipment.currentStock
    val overstock = stock != null && stock > 0 && equipment.quantity > stock

    Card(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        border = androidx.compose.foundation.BorderStroke(1.dp, SolennixTheme.colors.borderLight),
        shape = MaterialTheme.shapes.medium
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    equipment.equipmentName ?: stringResource(R.string.events_detail_equipment_fallback),
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Medium,
                )
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    if (overstock) {
                        Icon(
                            Icons.Default.Warning,
                            contentDescription = null,
                            tint = SolennixTheme.colors.error,
                            modifier = Modifier.size(12.dp),
                        )
                    }
                    Text(
                        stockLabel(stock = stock, unit = equipment.unit),
                        style = MaterialTheme.typography.bodySmall,
                        color = if (overstock) SolennixTheme.colors.error else SolennixTheme.colors.secondaryText,
                    )
                }
            }

            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(
                    onClick = { onQuantityChange(equipment.quantity - 1) },
                    enabled = equipment.quantity > 1,
                    modifier = Modifier.size(44.dp),
                ) {
                    Icon(
                        Icons.Default.RemoveCircle,
                        contentDescription = stringResource(R.string.events_form_products_decrease_a11y),
                        tint = if (equipment.quantity > 1) SolennixTheme.colors.primary else SolennixTheme.colors.secondaryText,
                        modifier = Modifier.size(26.dp),
                    )
                }
                EditableQuantityField(
                    value = equipment.quantity,
                    onValueChange = { onQuantityChange(it) },
                    minValue = 1,
                    key = equipment.inventoryId,
                    width = 36.dp,
                    textStyle = MaterialTheme.typography.bodyLarge.copy(
                        fontWeight = FontWeight.SemiBold,
                    ),
                    colorOverride = if (overstock) SolennixTheme.colors.error else null,
                )
                IconButton(
                    onClick = { onQuantityChange(equipment.quantity + 1) },
                    modifier = Modifier.size(44.dp),
                ) {
                    Icon(
                        Icons.Default.AddCircle,
                        contentDescription = stringResource(R.string.events_form_products_increase_a11y),
                        tint = SolennixTheme.colors.primary,
                        modifier = Modifier.size(26.dp),
                    )
                }
            }

            IconButton(onClick = onRemove) {
                Icon(
                    Icons.Default.Delete,
                    contentDescription = stringResource(R.string.events_form_products_delete_a11y),
                    tint = SolennixTheme.colors.error,
                )
            }
        }
    }
}

@Composable
private fun stockLabel(stock: Double?, unit: String?): String {
    val stockStr = stock?.let {
        if (it % 1.0 == 0.0) it.toInt().toString() else "%.1f".format(it)
    } ?: stringResource(R.string.events_form_inventory_not_available)
    return if (unit.isNullOrBlank()) {
        stringResource(R.string.events_form_inventory_stock_only_value, stockStr)
    } else {
        stringResource(R.string.events_form_inventory_stock_value, stockStr, unit)
    }
}
