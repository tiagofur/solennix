package com.creapolis.solennix.feature.events.ui

import android.widget.Toast
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.Savings
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.component.PaymentModal
import com.creapolis.solennix.core.designsystem.component.PremiumButton
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.DiscountType
import com.creapolis.solennix.core.model.extensions.asMXN
import com.creapolis.solennix.core.model.extensions.toPaymentMethodLabel
import com.creapolis.solennix.feature.events.R
import com.creapolis.solennix.feature.events.viewmodel.EventDetailViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EventFinancesScreen(
    viewModel: EventDetailViewModel,
    onNavigateBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = { Text(stringResource(R.string.events_detail_finances_title)) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.events_detail_back))
                    }
                }
            )
        }
    ) { padding ->
        val event = uiState.event
        if (event == null) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
            return@Scaffold
        }

        val netSales = event.totalAmount - event.taxAmount
        val supplyCost = uiState.supplies.sumOf { it.quantity * it.unitCost }
        val profit = netSales - supplyCost
        val margin = if (netSales > 0) (profit / netSales) * 100 else 0.0
        val totalPaid = uiState.totalPaid
        val remaining = (event.totalAmount - totalPaid).coerceAtLeast(0.0)
        val progress = if (event.totalAmount > 0) (totalPaid / event.totalAmount).coerceIn(0.0, 1.0) else 0.0
        val depositAmount = event.totalAmount * ((event.depositPercent ?: 0.0) / 100)
        val isDepositMet = totalPaid >= (depositAmount - 0.1)

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                shape = MaterialTheme.shapes.medium
            ) {
                Column(
                    modifier = Modifier.padding(24.dp).fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(stringResource(R.string.events_detail_finances_total_charged).uppercase(), style = MaterialTheme.typography.labelSmall, color = SolennixTheme.colors.secondaryText)
                    Text(
                        event.totalAmount.asMXN(),
                        style = MaterialTheme.typography.headlineLarge,
                        fontWeight = FontWeight.Black,
                        color = SolennixTheme.colors.primary
                    )
                }
            }

            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                shape = MaterialTheme.shapes.medium
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    FinancialMetricRow(stringResource(R.string.events_detail_finances_gross_sales), netSales.asMXN())

                    if (event.taxAmount > 0) {
                        FinancialMetricRow(stringResource(R.string.events_detail_finances_tax, event.taxRate.toInt()), event.taxAmount.asMXN())
                    }

                    FinancialMetricRow(stringResource(R.string.events_detail_finances_total_charged), event.totalAmount.asMXN(), SolennixTheme.colors.primary, true)

                    if (event.depositPercent != null && event.depositPercent!! > 0) {
                        FinancialMetricRow(
                            stringResource(R.string.events_detail_finances_deposit, event.depositPercent!!.toInt()),
                            depositAmount.asMXN(),
                            if (isDepositMet) SolennixTheme.colors.success else SolennixTheme.colors.warning
                        )
                    }

                    if (event.discount > 0) {
                        val discountLabel = if (event.discountType == DiscountType.PERCENT)
                            stringResource(R.string.events_detail_finances_discount_percent, event.discount.toInt()) else stringResource(R.string.events_detail_finances_discount)
                        val discountAmount = if (event.discountType == DiscountType.PERCENT)
                            netSales * event.discount / 100 else event.discount
                        FinancialMetricRow(discountLabel, "-${discountAmount.asMXN()}", SolennixTheme.colors.error)
                    }

                    HorizontalDivider(
                        modifier = Modifier.padding(vertical = 8.dp),
                        color = SolennixTheme.colors.secondaryText.copy(alpha = 0.2f)
                    )

                    FinancialMetricRow(stringResource(R.string.events_detail_finances_costs), supplyCost.asMXN(), SolennixTheme.colors.error)
                    FinancialMetricRow(stringResource(R.string.events_detail_finances_net_profit), profit.asMXN(), SolennixTheme.colors.success, true)
                    FinancialMetricRow(stringResource(R.string.events_detail_finances_margin), "${margin.toInt()}%", SolennixTheme.colors.info, true)

                    HorizontalDivider(
                        modifier = Modifier.padding(vertical = 8.dp),
                        color = SolennixTheme.colors.secondaryText.copy(alpha = 0.2f)
                    )

                    FinancialMetricRow(stringResource(R.string.events_detail_finances_paid), totalPaid.asMXN(), SolennixTheme.colors.success)
                    FinancialMetricRow(
                        stringResource(R.string.events_detail_finances_pending),
                        remaining.asMXN(),
                        if (remaining > 0) SolennixTheme.colors.error else SolennixTheme.colors.success,
                        true
                    )
                }
            }

            if (event.totalAmount > 0) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                    shape = MaterialTheme.shapes.medium
                ) {
                    Column(modifier = Modifier.padding(20.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(stringResource(R.string.events_detail_finances_progress), style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                            Text("${(progress * 100).toInt()}%", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = SolennixTheme.colors.primary)
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        LinearProgressIndicator(
                            progress = { progress.toFloat() },
                            modifier = Modifier.fillMaxWidth().height(12.dp),
                            color = SolennixTheme.colors.primary,
                            trackColor = SolennixTheme.colors.secondaryText.copy(alpha = 0.15f),
                            strokeCap = androidx.compose.ui.graphics.StrokeCap.Round
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text(totalPaid.asMXN(), style = MaterialTheme.typography.bodySmall, color = SolennixTheme.colors.success)
                            Text(event.totalAmount.asMXN(), style = MaterialTheme.typography.bodySmall, color = SolennixTheme.colors.secondaryText)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun FinancialMetricRow(
    label: String,
    value: String,
    valueColor: Color = SolennixTheme.colors.primaryText,
    isBold: Boolean = false
) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            label,
            style = if (isBold) MaterialTheme.typography.bodyMedium else MaterialTheme.typography.bodySmall,
            fontWeight = if (isBold) FontWeight.SemiBold else FontWeight.Normal,
            color = SolennixTheme.colors.secondaryText
        )
        Text(
            value,
            style = if (isBold) MaterialTheme.typography.bodyMedium else MaterialTheme.typography.bodySmall,
            fontWeight = if (isBold) FontWeight.Bold else FontWeight.Medium,
            color = valueColor
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
