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

fun StepExtras(viewModel: EventFormViewModel) {
    AdaptiveCenteredContent(maxWidth = 800.dp) {
        Column(
            modifier = Modifier
                .padding(24.dp)
                .verticalScroll(rememberScrollState())
                .imePadding()
        ) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { viewModel.addBlankExtra() },
                colors = CardDefaults.cardColors(
                    containerColor = SolennixTheme.colors.primaryLight,
                ),
                border = androidx.compose.foundation.BorderStroke(
                    1.dp,
                    SolennixTheme.colors.primary.copy(alpha = 0.3f),
                ),
                shape = MaterialTheme.shapes.medium,
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        Icons.Default.AddCircle,
                        contentDescription = null,
                        tint = SolennixTheme.colors.primary,
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        stringResource(R.string.events_form_extras_add),
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.Medium,
                        color = SolennixTheme.colors.primary,
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            if (viewModel.eventExtras.isEmpty()) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 48.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Icon(
                        Icons.Default.StarOutline,
                        contentDescription = null,
                        tint = SolennixTheme.colors.secondaryText,
                        modifier = Modifier.size(48.dp),
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        stringResource(R.string.events_form_extras_empty_title),
                        style = MaterialTheme.typography.titleMedium,
                        color = SolennixTheme.colors.secondaryText,
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        stringResource(R.string.events_form_extras_empty_desc),
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.secondaryText,
                    )
                }
            } else {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    viewModel.eventExtras.forEachIndexed { index, extra ->
                        EditableExtraCard(
                            index = index,
                            extra = extra,
                            onDescriptionChange = { viewModel.updateExtraFields(extra.id, description = it) },
                            onCostChange = { viewModel.updateExtraFields(extra.id, cost = it) },
                            onPriceChange = { viewModel.updateExtraFields(extra.id, price = it) },
                            onExcludeUtilityChange = { viewModel.updateExtraFields(extra.id, excludeUtility = it) },
                            onIncludeInChecklistChange = { viewModel.updateExtraFields(extra.id, includeInChecklist = it) },
                            onRemove = { viewModel.removeExtra(extra.id) },
                        )
                    }

                    Spacer(modifier = Modifier.height(4.dp))
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = SolennixTheme.colors.surfaceAlt,
                        ),
                        shape = MaterialTheme.shapes.medium,
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                stringResource(R.string.events_form_extras_subtotal),
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Medium,
                                color = SolennixTheme.colors.secondaryText,
                                modifier = Modifier.weight(1f),
                            )
                            Text(
                                viewModel.subtotalExtras.asMXN(),
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.SemiBold,
                                color = SolennixTheme.colors.primary,
                            )
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditableExtraCard(
    index: Int,
    extra: EventExtra,
    onDescriptionChange: (String) -> Unit,
    onCostChange: (Double) -> Unit,
    onPriceChange: (Double) -> Unit,
    onExcludeUtilityChange: (Boolean) -> Unit,
    onIncludeInChecklistChange: (Boolean) -> Unit,
    onRemove: () -> Unit,
) {
    var costText by remember(extra.id) {
        mutableStateOf(if (extra.cost > 0) formatDiscountClean(extra.cost) else "")
    }
    var priceText by remember(extra.id) {
        mutableStateOf(if (extra.price > 0) formatDiscountClean(extra.price) else "")
    }
    val displayedPriceText = if (extra.excludeUtility) costText else priceText

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        border = androidx.compose.foundation.BorderStroke(1.dp, SolennixTheme.colors.borderLight),
        shape = MaterialTheme.shapes.medium,
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    stringResource(R.string.events_form_extras_row_title, index + 1),
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = SolennixTheme.colors.secondaryText,
                    modifier = Modifier.weight(1f),
                )
                IconButton(onClick = onRemove, modifier = Modifier.size(32.dp)) {
                    Icon(
                        Icons.Default.Delete,
                        contentDescription = stringResource(R.string.events_form_extras_delete_a11y),
                        tint = SolennixTheme.colors.error,
                        modifier = Modifier.size(18.dp),
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            SolennixTextField(
                value = extra.description,
                onValueChange = onDescriptionChange,
                label = stringResource(R.string.events_form_extras_description),
                placeholder = stringResource(R.string.events_form_extras_description_placeholder),
                leadingIcon = Icons.Default.Description,
            )

            Spacer(modifier = Modifier.height(8.dp))

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = costText,
                    onValueChange = { raw ->
                        val normalized = raw.replace(',', '.')
                        if (normalized.isEmpty() || normalized.matches(Regex("""^\d*\.?\d*$"""))) {
                            costText = normalized
                            onCostChange(normalized.toDoubleOrNull() ?: 0.0)
                        }
                    },
                    label = { Text(stringResource(R.string.events_form_extras_cost)) },
                    placeholder = { Text("0.00") },
                    leadingIcon = { Text("$", color = SolennixTheme.colors.secondaryText) },
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal),
                    singleLine = true,
                    shape = MaterialTheme.shapes.small,
                    modifier = Modifier.weight(1f),
                )
                OutlinedTextField(
                    value = displayedPriceText,
                    onValueChange = { raw ->
                        if (!extra.excludeUtility) {
                            val normalized = raw.replace(',', '.')
                            if (normalized.isEmpty() || normalized.matches(Regex("""^\d*\.?\d*$"""))) {
                                priceText = normalized
                                onPriceChange(normalized.toDoubleOrNull() ?: 0.0)
                            }
                        }
                    },
                    label = { Text(stringResource(R.string.events_form_extras_price)) },
                    placeholder = { Text("0.00") },
                    leadingIcon = { Text("$", color = SolennixTheme.colors.secondaryText) },
                    enabled = !extra.excludeUtility,
                    keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal),
                    singleLine = true,
                    shape = MaterialTheme.shapes.small,
                    modifier = Modifier.weight(1f),
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    stringResource(R.string.events_form_extras_exclude_utility),
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText,
                    modifier = Modifier.weight(1f),
                )
                Switch(
                    checked = extra.excludeUtility,
                    onCheckedChange = onExcludeUtilityChange,
                )
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    Icons.Default.Checklist,
                    contentDescription = null,
                    tint = SolennixTheme.colors.secondaryText,
                    modifier = Modifier.size(16.dp),
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    stringResource(R.string.events_form_extras_include_checklist),
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText,
                    modifier = Modifier.weight(1f),
                )
                Switch(
                    checked = extra.includeInChecklist,
                    onCheckedChange = onIncludeInChecklistChange,
                )
            }
        }
    }
}
