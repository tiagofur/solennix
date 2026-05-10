package com.creapolis.solennix.feature.events.ui

import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.DiscountType
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.EventExtra
import com.creapolis.solennix.core.model.EventProduct
import com.creapolis.solennix.core.model.extensions.asMXN
import com.creapolis.solennix.core.model.extensions.toPaymentMethodLabel
import com.creapolis.solennix.feature.events.viewmodel.EventDetailUiState

@Composable
fun FinancialBreakdownCard(
    event: Event,
    products: List<EventProduct>,
    extras: List<EventExtra>,
    totalPaid: Double
) {
    val productsTotal = products.sumOf { it.totalPrice ?: (it.quantity * it.unitPrice) }
    val extrasTotal = extras.sumOf { it.price }
    val subtotal = productsTotal + extrasTotal
    val remaining = event.totalAmount - totalPaid

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.medium
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.AccountBalance,
                    contentDescription = null,
                    tint = SolennixTheme.colors.primary,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "Desglose Financiero",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
            }
            Spacer(modifier = Modifier.height(16.dp))

            if (products.isNotEmpty()) {
                FinancialRow("Subtotal Productos", productsTotal.asMXN())
            }

            if (extras.isNotEmpty()) {
                FinancialRow("Subtotal Extras", extrasTotal.asMXN())
            }

            if (products.isNotEmpty() && extras.isNotEmpty()) {
                FinancialRow("Subtotal", subtotal.asMXN())
            }

            if (event.discount > 0) {
                val discountLabel = if (event.discountType == DiscountType.PERCENT) {
                    "Descuento (${event.discount.toInt()}%)"
                } else {
                    "Descuento"
                }
                val discountAmount = if (event.discountType == DiscountType.PERCENT) {
                    subtotal * event.discount / 100
                } else {
                    event.discount
                }
                FinancialRow(
                    discountLabel,
                    "-${discountAmount.asMXN()}",
                    valueColor = SolennixTheme.colors.error
                )
            }

            if (event.requiresInvoice && event.taxRate > 0) {
                FinancialRow(
                    "IVA (${event.taxRate.toInt()}%)",
                    event.taxAmount.asMXN()
                )
            }

            HorizontalDivider(
                modifier = Modifier.padding(vertical = 8.dp),
                color = SolennixTheme.colors.secondaryText.copy(alpha = 0.3f)
            )

            Row(
                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "TOTAL",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = SolennixTheme.colors.primaryText
                )
                Text(
                    text = event.totalAmount.asMXN(),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = SolennixTheme.colors.primary
                )
            }

            FinancialRow(
                "Pagado",
                totalPaid.asMXN(),
                valueColor = SolennixTheme.colors.success
            )

            FinancialRow(
                "Restante",
                remaining.asMXN(),
                valueColor = if (remaining > 0) SolennixTheme.colors.error else SolennixTheme.colors.success
            )

            if (event.totalAmount > 0) {
                Spacer(modifier = Modifier.height(12.dp))
                val paymentProgress = (totalPaid / event.totalAmount).coerceIn(0.0, 1.0)
                val percentText = "${(paymentProgress * 100).toInt()}% pagado"
                Text(
                    text = percentText,
                    style = MaterialTheme.typography.labelMedium,
                    color = SolennixTheme.colors.secondaryText
                )
                Spacer(modifier = Modifier.height(4.dp))
                LinearProgressIndicator(
                    progress = { paymentProgress.toFloat() },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(8.dp),
                    color = SolennixTheme.colors.success,
                    trackColor = SolennixTheme.colors.secondaryText.copy(alpha = 0.2f),
                    strokeCap = StrokeCap.Round
                )
            }

            val depositPct = event.depositPercent
            if (depositPct != null && depositPct > 0) {
                Spacer(modifier = Modifier.height(8.dp))
                HorizontalDivider(
                    color = SolennixTheme.colors.secondaryText.copy(alpha = 0.2f)
                )
                Spacer(modifier = Modifier.height(8.dp))
                val depositAmount = event.totalAmount * depositPct / 100
                FinancialRow(
                    "Anticipo (${depositPct.toInt()}%)",
                    depositAmount.asMXN(),
                    valueColor = SolennixTheme.colors.primary
                )
            }
        }
    }
}

@Composable
fun FinancialRow(
    label: String,
    value: String,
    valueColor: androidx.compose.ui.graphics.Color = SolennixTheme.colors.primaryText
) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodyMedium,
            color = SolennixTheme.colors.secondaryText
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
            color = valueColor,
            fontWeight = FontWeight.Medium
        )
    }
}

@Composable
fun PaymentsSection(
    uiState: EventDetailUiState,
    onDeletePayment: (String) -> Unit = {}
) {
    var paymentToDelete by remember { mutableStateOf<String?>(null) }

    Text(
        text = "Historial de Pagos (${uiState.payments.size})",
        style = MaterialTheme.typography.titleMedium,
        fontWeight = FontWeight.SemiBold
    )
    uiState.payments.forEach { payment ->
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 4.dp),
            colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.surface),
            shape = MaterialTheme.shapes.medium
        ) {
            Row(
                modifier = Modifier.padding(16.dp).fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(payment.paymentDate, style = MaterialTheme.typography.bodySmall)
                    Text(
                        payment.paymentMethod.toPaymentMethodLabel(),
                        style = MaterialTheme.typography.labelMedium
                    )
                    if (!payment.notes.isNullOrEmpty()) {
                        Text(
                            payment.notes.orEmpty(),
                            style = MaterialTheme.typography.bodySmall,
                            color = SolennixTheme.colors.secondaryText
                        )
                    }
                }
                Text(
                    payment.amount.asMXN(),
                    style = MaterialTheme.typography.titleMedium,
                    color = SolennixTheme.colors.success
                )
                Spacer(modifier = Modifier.width(8.dp))
                IconButton(
                    onClick = { paymentToDelete = payment.id },
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(
                        Icons.Default.Delete,
                        contentDescription = "Eliminar pago",
                        tint = SolennixTheme.colors.secondaryText,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
        }
    }

    if (paymentToDelete != null) {
        AlertDialog(
            onDismissRequest = { paymentToDelete = null },
            title = { Text("Eliminar Pago") },
            text = { Text("¿Estás seguro de que deseas eliminar este pago? El saldo se actualizará automáticamente.") },
            confirmButton = {
                TextButton(
                    onClick = {
                        paymentToDelete?.let { onDeletePayment(it) }
                        paymentToDelete = null
                    },
                    colors = ButtonDefaults.textButtonColors(contentColor = SolennixTheme.colors.error)
                ) {
                    Text("Eliminar")
                }
            },
            dismissButton = {
                TextButton(onClick = { paymentToDelete = null }) {
                    Text("Cancelar")
                }
            }
        )
    }
}
