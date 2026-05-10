package com.creapolis.solennix.feature.events.ui

import androidx.compose.foundation.background
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.component.SolennixTextField
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveCenteredContent
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.extensions.asMXN
import com.creapolis.solennix.feature.events.R
import com.creapolis.solennix.feature.events.viewmodel.DiscountType
import com.creapolis.solennix.feature.events.viewmodel.EventFormViewModel

@Composable
fun StepSummary(viewModel: EventFormViewModel, isEditMode: Boolean) {
    val depositPct = viewModel.depositPercent.toDoubleOrNull() ?: 0.0
    val depositAmount = viewModel.total * depositPct / 100

    AdaptiveCenteredContent(maxWidth = 800.dp) {
        Column(
            modifier = Modifier
                .padding(24.dp)
                .verticalScroll(rememberScrollState())
                .imePadding()
        ) {
            Spacer(modifier = Modifier.height(20.dp))

            Text(stringResource(R.string.events_form_summary_discount_title), style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Row(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(SolennixTheme.colors.surfaceAlt),
                ) {
                    DiscountTypeButton(
                        label = "%",
                        selected = viewModel.discountType == DiscountType.PERCENT,
                        onClick = { viewModel.discountType = DiscountType.PERCENT },
                    )
                    DiscountTypeButton(
                        label = "$",
                        selected = viewModel.discountType == DiscountType.FIXED,
                        onClick = { viewModel.discountType = DiscountType.FIXED },
                    )
                }
                SolennixTextField(
                    value = viewModel.discount,
                    onValueChange = { viewModel.discount = it },
                    label = if (viewModel.discountType == DiscountType.PERCENT) stringResource(R.string.events_form_summary_discount_percent) else stringResource(R.string.events_form_summary_discount_amount),
                    keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal,
                    modifier = Modifier.weight(1f),
                )
            }

            Spacer(modifier = Modifier.height(20.dp))

            Text(stringResource(R.string.events_form_summary_invoice_title), style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(stringResource(R.string.events_form_summary_invoice_required), style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
                Switch(
                    checked = viewModel.requiresInvoice,
                    onCheckedChange = { viewModel.requiresInvoice = it }
                )
            }
            if (viewModel.requiresInvoice) {
                Spacer(modifier = Modifier.height(8.dp))
                SolennixTextField(
                    value = viewModel.taxRate,
                    onValueChange = { viewModel.taxRate = it },
                    label = stringResource(R.string.events_form_summary_tax_rate),
                    keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal
                )
            }

            Spacer(modifier = Modifier.height(20.dp))

            Text(stringResource(R.string.events_form_summary_deposit_title), style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                SolennixTextField(
                    value = viewModel.depositPercent,
                    onValueChange = { viewModel.depositPercent = it },
                    label = stringResource(R.string.events_form_summary_deposit_percent),
                    keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal,
                    modifier = Modifier.weight(1f),
                )
                Text(
                    stringResource(R.string.events_form_summary_deposit_amount, depositAmount.asMXN()),
                    style = MaterialTheme.typography.titleSmall,
                    color = SolennixTheme.colors.primary,
                    fontWeight = FontWeight.SemiBold,
                )
            }

            Spacer(modifier = Modifier.height(20.dp))

            Text(stringResource(R.string.events_form_summary_cancellation_title), style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.Top,
            ) {
                Box(modifier = Modifier.weight(1f)) {
                    SolennixTextField(
                        value = viewModel.cancellationDays,
                        onValueChange = { viewModel.cancellationDays = it },
                        label = stringResource(R.string.events_form_summary_cancellation_days),
                        keyboardType = androidx.compose.ui.text.input.KeyboardType.Number,
                    )
                }
                Box(modifier = Modifier.weight(1f)) {
                    SolennixTextField(
                        value = viewModel.refundPercent,
                        onValueChange = { viewModel.refundPercent = it },
                        label = stringResource(R.string.events_form_summary_refund_percent),
                        keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal,
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            Text(stringResource(R.string.events_form_summary_notes_title), style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedTextField(
                value = viewModel.notes,
                onValueChange = { viewModel.notes = it },
                label = { Text(stringResource(R.string.events_form_summary_notes_label)) },
                placeholder = { Text(stringResource(R.string.events_form_summary_notes_placeholder)) },
                modifier = Modifier.fillMaxWidth(),
                minLines = 3,
                maxLines = 6,
                shape = MaterialTheme.shapes.small,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = SolennixTheme.colors.primary,
                    focusedLabelColor = SolennixTheme.colors.primary,
                    cursorColor = SolennixTheme.colors.primary,
                ),
            )

            Spacer(modifier = Modifier.height(24.dp))

            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                border = androidx.compose.foundation.BorderStroke(1.5.dp, SolennixTheme.colors.primary),
                shape = MaterialTheme.shapes.medium
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(stringResource(R.string.events_form_summary_summary), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(12.dp))

                    if (viewModel.hasPendingProductCosts) {
                        Text(
                            stringResource(R.string.events_form_summary_pending_costs),
                            style = MaterialTheme.typography.bodySmall,
                            color = SolennixTheme.colors.warning
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                    }

                    SummaryRow(stringResource(R.string.events_form_summary_subtotal_products), viewModel.subtotalProducts.asMXN())
                    SummaryRow(stringResource(R.string.events_form_summary_subtotal_extras), viewModel.subtotalExtras.asMXN())

                    if (viewModel.discountAmount > 0) {
                        SummaryRow(stringResource(R.string.events_form_summary_discount_title), "-${viewModel.discountAmount.asMXN()}", valueColor = SolennixTheme.colors.error)
                    }

                    if (viewModel.requiresInvoice && viewModel.taxAmount > 0) {
                        val rate = viewModel.taxRate.toDoubleOrNull() ?: 0.0
                        SummaryRow(stringResource(R.string.events_form_summary_tax_value, String.format("%.0f", rate)), "+${viewModel.taxAmount.asMXN()}")
                    }

                    HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = SolennixTheme.colors.borderLight)

                    Row(modifier = Modifier.fillMaxWidth()) {
                        Text(stringResource(R.string.events_form_summary_total), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                        Text(viewModel.total.asMXN(), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = SolennixTheme.colors.primary)
                    }

                    Spacer(modifier = Modifier.height(4.dp))
                    SummaryRow(stringResource(R.string.events_form_summary_deposit_value, String.format("%.0f", depositPct)), depositAmount.asMXN(), valueColor = SolennixTheme.colors.primary)

                    HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = SolennixTheme.colors.borderLight)

                    Text(stringResource(R.string.events_form_summary_profitability), style = MaterialTheme.typography.labelMedium, color = SolennixTheme.colors.secondaryText)
                    Spacer(modifier = Modifier.height(6.dp))
                    SummaryRow(stringResource(R.string.events_form_summary_total_costs), viewModel.totalCosts.asMXN())
                    SummaryRow(
                        stringResource(R.string.events_form_summary_net_profit),
                        viewModel.netProfit.asMXN(),
                        valueColor = if (viewModel.netProfit >= 0) SolennixTheme.colors.success else SolennixTheme.colors.error
                    )
                    SummaryRow(
                        stringResource(R.string.events_form_summary_margin),
                        "${String.format("%.1f", viewModel.profitMargin)}%",
                        valueColor = if (viewModel.profitMargin >= 20) SolennixTheme.colors.success else SolennixTheme.colors.warning
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@Composable
private fun SummaryRow(
    label: String,
    value: String,
    valueColor: Color = Color.Unspecified
) {
    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp)) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = SolennixTheme.colors.secondaryText, modifier = Modifier.weight(1f))
        Text(value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium, color = valueColor)
    }
}

@Composable
private fun DiscountTypeButton(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    Box(
        modifier = Modifier
            .size(width = 44.dp, height = 56.dp)
            .clickable { onClick() }
            .background(
                if (selected) SolennixTheme.colors.primary
                else Color.Transparent
            ),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            label,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = if (selected) Color.White else SolennixTheme.colors.secondaryText,
        )
    }
}