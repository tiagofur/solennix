package com.creapolis.solennix.feature.events.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.DiscountType
import com.creapolis.solennix.core.model.extensions.asCurrency
import com.creapolis.solennix.feature.events.R

@Composable
fun FinanceSummaryCard(
    event: com.creapolis.solennix.core.model.Event,
    supplyCost: Double,
    onClick: () -> Unit
) {
    val netSales = event.totalAmount - event.taxAmount
    val profit = netSales - supplyCost
    // Margin denominator = adjustedRevenue (excludes pass-through extras that flow
    // to third parties). For the hub card we use netSales as-is because extras are
    // not loaded here. Product ingredient costs are not included in supplyCost
    // (that is passed in from EventDetailScreen which only sums EventSupply rows).
    // Both limitations are accepted as first-slice scope — full EventFinancials
    // parity requires products+extras on this card too.
    val margin = if (netSales > 0) (profit / netSales) * 100 else 0.0

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.medium
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.BarChart,
                    contentDescription = null,
                    tint = SolennixTheme.colors.primary,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    stringResource(R.string.events_detail_finances_title),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Spacer(modifier = Modifier.weight(1f))
                Icon(
                    Icons.Default.ChevronRight,
                    contentDescription = stringResource(R.string.events_detail_view_detail_a11y),
                    tint = SolennixTheme.colors.secondaryText,
                    modifier = Modifier.size(20.dp)
                )
            }

            Spacer(modifier = Modifier.height(12.dp))
            HorizontalDivider(color = SolennixTheme.colors.secondaryText.copy(alpha = 0.2f))
            Spacer(modifier = Modifier.height(12.dp))

            Row(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        stringResource(R.string.events_detail_summary_total),
                        style = MaterialTheme.typography.labelSmall,
                        color = SolennixTheme.colors.secondaryText
                    )
                    Text(
                        event.totalAmount.asCurrency(event.currencyCode),
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = SolennixTheme.colors.primary
                    )
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        stringResource(R.string.events_detail_summary_profit),
                        style = MaterialTheme.typography.labelSmall,
                        color = SolennixTheme.colors.secondaryText
                    )
                    Text(
                        "${margin.toInt()}%",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = SolennixTheme.colors.success
                    )
                }
            }

            if (event.discount > 0) {
                Spacer(modifier = Modifier.height(4.dp))
                val discountLabel = if (event.discountType == DiscountType.PERCENT) {
                    stringResource(R.string.events_detail_summary_discount_percent, event.discount.toInt())
                } else stringResource(R.string.events_detail_finances_discount)
                Text(discountLabel, style = MaterialTheme.typography.bodySmall, color = SolennixTheme.colors.error)
            }

            if (event.requiresInvoice) {
                Text(
                    stringResource(R.string.events_detail_summary_tax_percent, event.taxRate.toInt()),
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText
                )
            }
        }
    }
}

@Composable
fun PaymentSummaryCard(
    event: com.creapolis.solennix.core.model.Event,
    totalPaid: Double,
    paymentsCount: Int,
    onClick: () -> Unit
) {
    val remaining = (event.totalAmount - totalPaid).coerceAtLeast(0.0)
    val progress = if (event.totalAmount > 0) (totalPaid / event.totalAmount).coerceIn(0.0, 1.0) else 0.0

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.medium
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.Payments,
                    contentDescription = null,
                    tint = SolennixTheme.colors.success,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    stringResource(R.string.events_detail_payments_title),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Spacer(modifier = Modifier.weight(1f))
                if (paymentsCount > 0) {
                    Surface(
                        shape = MaterialTheme.shapes.small,
                        color = SolennixTheme.colors.primary.copy(alpha = 0.1f)
                    ) {
                        Text(
                            "$paymentsCount",
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = SolennixTheme.colors.primary
                        )
                    }
                    Spacer(modifier = Modifier.width(4.dp))
                }
                Icon(
                    Icons.Default.ChevronRight,
                    contentDescription = stringResource(R.string.events_detail_view_detail_a11y),
                    tint = SolennixTheme.colors.secondaryText,
                    modifier = Modifier.size(20.dp)
                )
            }

            Spacer(modifier = Modifier.height(12.dp))
            HorizontalDivider(color = SolennixTheme.colors.secondaryText.copy(alpha = 0.2f))
            Spacer(modifier = Modifier.height(12.dp))

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                MiniKpi(
                    label = stringResource(R.string.events_detail_finances_paid),
                    value = totalPaid.asCurrency(event.currencyCode),
                    color = SolennixTheme.colors.success,
                    modifier = Modifier.weight(1f)
                )
                MiniKpi(
                    label = stringResource(R.string.events_detail_payments_kpi_balance),
                    value = remaining.asCurrency(event.currencyCode),
                    color = if (remaining <= 0.01) SolennixTheme.colors.success else SolennixTheme.colors.error,
                    modifier = Modifier.weight(1f)
                )
            }

            Spacer(modifier = Modifier.height(8.dp))
            LinearProgressIndicator(
                progress = { progress.toFloat() },
                modifier = Modifier.fillMaxWidth().height(6.dp),
                color = SolennixTheme.colors.primary,
                trackColor = SolennixTheme.colors.secondaryText.copy(alpha = 0.15f),
                strokeCap = StrokeCap.Round
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                "${(progress * 100).toInt()}%",
                style = MaterialTheme.typography.labelSmall,
                color = SolennixTheme.colors.secondaryText,
                modifier = Modifier.align(Alignment.End)
            )

            val depositPct = event.depositPercent
            if (depositPct != null && depositPct > 0) {
                val depositAmount = event.totalAmount * depositPct / 100
                val isDepositMet = totalPaid >= (depositAmount - 0.1)
                Spacer(modifier = Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        if (isDepositMet) Icons.Default.CheckCircle else Icons.Default.Warning,
                        contentDescription = null,
                        tint = if (isDepositMet) SolennixTheme.colors.success else SolennixTheme.colors.warning,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        stringResource(R.string.events_detail_summary_deposit_amount, depositPct.toInt(), depositAmount.asCurrency(event.currencyCode)),
                        style = MaterialTheme.typography.bodySmall,
                        color = if (isDepositMet) SolennixTheme.colors.success else SolennixTheme.colors.warning
                    )
                }
            }
        }
    }
}

@Composable
fun MiniKpi(
    label: String,
    value: String,
    color: Color,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier,
        shape = MaterialTheme.shapes.small,
        color = color.copy(alpha = 0.1f)
    ) {
        Column(
            modifier = Modifier.padding(vertical = 8.dp, horizontal = 4.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                value,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Bold,
                color = color,
                maxLines = 1
            )
            Text(
                label,
                style = MaterialTheme.typography.labelSmall,
                color = SolennixTheme.colors.secondaryText
            )
        }
    }
}
