package com.creapolis.solennix.feature.events.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.DiscountType
import com.creapolis.solennix.core.model.extensions.asMXN

// ==================== Hub Summary Cards ====================

@Composable
fun FinanceSummaryCard(
    event: com.creapolis.solennix.core.model.Event,
    supplyCost: Double,
    onClick: () -> Unit
) {
    val netSales = event.totalAmount - event.taxAmount
    val profit = netSales - supplyCost
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
                    "Finanzas",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Spacer(modifier = Modifier.weight(1f))
                Icon(
                    Icons.Default.ChevronRight,
                    contentDescription = "Ver detalle",
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
                        "TOTAL",
                        style = MaterialTheme.typography.labelSmall,
                        color = SolennixTheme.colors.secondaryText
                    )
                    Text(
                        event.totalAmount.asMXN(),
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = SolennixTheme.colors.primary
                    )
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        "UTILIDAD",
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
                    "Descuento ${event.discount.toInt()}%"
                } else "Descuento"
                Text(discountLabel, style = MaterialTheme.typography.bodySmall, color = SolennixTheme.colors.error)
            }

            if (event.requiresInvoice) {
                Text(
                    "IVA ${event.taxRate.toInt()}%",
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
                    "Pagos",
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
                    contentDescription = "Ver detalle",
                    tint = SolennixTheme.colors.secondaryText,
                    modifier = Modifier.size(20.dp)
                )
            }

            Spacer(modifier = Modifier.height(12.dp))
            HorizontalDivider(color = SolennixTheme.colors.secondaryText.copy(alpha = 0.2f))
            Spacer(modifier = Modifier.height(12.dp))

            // Mini KPIs
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                MiniKpi(
                    label = "Pagado",
                    value = totalPaid.asMXN(),
                    color = SolennixTheme.colors.success,
                    modifier = Modifier.weight(1f)
                )
                MiniKpi(
                    label = "Saldo",
                    value = remaining.asMXN(),
                    color = if (remaining <= 0.01) SolennixTheme.colors.success else SolennixTheme.colors.error,
                    modifier = Modifier.weight(1f)
                )
            }

            // Progress bar
            Spacer(modifier = Modifier.height(8.dp))
            LinearProgressIndicator(
                progress = { progress.toFloat() },
                modifier = Modifier.fillMaxWidth().height(6.dp),
                color = SolennixTheme.colors.primary,
                trackColor = SolennixTheme.colors.secondaryText.copy(alpha = 0.15f),
                strokeCap = androidx.compose.ui.graphics.StrokeCap.Round
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                "${(progress * 100).toInt()}%",
                style = MaterialTheme.typography.labelSmall,
                color = SolennixTheme.colors.secondaryText,
                modifier = Modifier.align(Alignment.End)
            )

            // Deposit status
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
                        "Anticipo ${depositPct.toInt()}%: ${depositAmount.asMXN()}",
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

