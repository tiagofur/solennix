package com.creapolis.solennix.feature.events.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddCircle
import androidx.compose.material.icons.filled.Checklist
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Groups
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.RemoveCircle
import androidx.compose.material.icons.filled.StarOutline
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import com.creapolis.solennix.core.designsystem.component.SolennixTextField
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveCenteredContent
import com.creapolis.solennix.core.designsystem.theme.LocalIsWideScreen
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.EventExtra
import com.creapolis.solennix.core.model.EventProduct
import com.creapolis.solennix.core.model.Product
import com.creapolis.solennix.core.model.extensions.asMXN
import com.creapolis.solennix.feature.events.R
import com.creapolis.solennix.feature.events.viewmodel.EventFormViewModel

fun ProductSelectionItem(
    index: Int,
    item: EventProduct,
    availableProducts: List<Product>,
    onQuantityChange: (Double) -> Unit,
    onDiscountChange: (Double) -> Unit,
    onRemove: () -> Unit,
) {
    val product = availableProducts.find { it.id == item.productId } ?: return
    var discountText by remember(item.id) {
        mutableStateOf(if (item.discount > 0) formatDiscountClean(item.discount) else "")
    }
    var showDeleteDialog by remember { mutableStateOf(false) }
    val effectivePrice = item.unitPrice - item.discount
    val lineTotal = effectivePrice * item.quantity

    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text(stringResource(R.string.events_form_products_delete_named, product.name)) },
            confirmButton = {
                TextButton(
                    onClick = {
                        showDeleteDialog = false
                        onRemove()
                    }
                ) {
                    Text(stringResource(R.string.events_form_products_delete), color = SolennixTheme.colors.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) { Text(stringResource(R.string.events_form_cancel)) }
            }
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
                Text(
                    stringResource(R.string.events_form_products_row_title, index + 1),
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = SolennixTheme.colors.secondaryText,
                    modifier = Modifier.weight(1f),
                )
                IconButton(onClick = { showDeleteDialog = true }, modifier = Modifier.size(32.dp)) {
                    Icon(
                        Icons.Default.Delete,
                        contentDescription = stringResource(R.string.events_form_products_delete_a11y),
                        tint = SolennixTheme.colors.error,
                        modifier = Modifier.size(18.dp),
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        product.name,
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.Medium,
                    )
                    Text(
                        stringResource(R.string.events_form_products_unit_price, item.unitPrice.asMXN()),
                        style = MaterialTheme.typography.bodyMedium,
                        color = SolennixTheme.colors.primary,
                    )
                    product.staffTeamId?.takeIf { it.isNotBlank() }?.let {
                        Spacer(modifier = Modifier.height(4.dp))
                        AssistChip(
                            onClick = {},
                            enabled = false,
                            label = {
                                Text(
                                    stringResource(R.string.events_form_products_includes_team),
                                    style = MaterialTheme.typography.labelSmall
                                )
                            },
                            leadingIcon = {
                                Icon(
                                    Icons.Default.Groups,
                                    contentDescription = null,
                                    modifier = Modifier.size(14.dp)
                                )
                            },
                            colors = AssistChipDefaults.assistChipColors(
                                disabledContainerColor = SolennixTheme.colors.primary.copy(alpha = 0.08f),
                                disabledLabelColor = SolennixTheme.colors.primary,
                                disabledLeadingIconContentColor = SolennixTheme.colors.primary
                            ),
                            border = null,
                            modifier = Modifier.height(24.dp)
                        )
                    }
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(0.dp)
                ) {
                    IconButton(
                        onClick = { onQuantityChange(item.quantity - 1.0) },
                        enabled = item.quantity > 1,
                        modifier = Modifier.size(44.dp),
                    ) {
                        Icon(
                            Icons.Default.RemoveCircle,
                            contentDescription = stringResource(R.string.events_form_products_decrease_a11y),
                            tint = if (item.quantity > 1) SolennixTheme.colors.primary else SolennixTheme.colors.secondaryText,
                            modifier = Modifier.size(26.dp),
                        )
                    }
                    EditableQuantityField(
                        value = item.quantity.toInt(),
                        onValueChange = { onQuantityChange(it.toDouble()) },
                        minValue = 1,
                        key = item.productId,
                        width = 36.dp,
                        textStyle = MaterialTheme.typography.bodyLarge.copy(
                            fontWeight = FontWeight.SemiBold,
                        ),
                    )
                    IconButton(
                        onClick = { onQuantityChange(item.quantity + 1.0) },
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
            }

            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                OutlinedTextField(
                    value = discountText,
                    onValueChange = { raw ->
                        val normalized = raw.replace(',', '.')
                        if (normalized.isEmpty() || normalized.matches(Regex("""^\d*\.?\d*$"""))) {
                            discountText = normalized
                            onDiscountChange(normalized.toDoubleOrNull() ?: 0.0)
                        }
                    },
                    label = { Text(stringResource(R.string.events_form_products_discount)) },
                    placeholder = { Text("0") },
                    modifier = Modifier.width(140.dp),
                    singleLine = true,
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal),
                    shape = MaterialTheme.shapes.small,
                )
                Spacer(modifier = Modifier.width(12.dp))
                Text(
                    text = stringResource(R.string.events_form_products_total, lineTotal.asMXN()),
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold,
                    color = if (item.discount > 0) SolennixTheme.colors.success else SolennixTheme.colors.primaryText
                )
            }
        }
    }
}

@Composable
