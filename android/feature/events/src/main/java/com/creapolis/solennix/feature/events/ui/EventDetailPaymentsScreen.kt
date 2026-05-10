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

fun EventPaymentsScreen(
    viewModel: EventDetailViewModel,
    onNavigateBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current
    var showPaymentModal by remember { mutableStateOf(false) }
    var paymentInitialAmount by remember { mutableStateOf<Double?>(null) }
    var pendingDeletePaymentId by remember { mutableStateOf<String?>(null) }

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = { Text(stringResource(R.string.events_detail_payments_title)) },
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

        val totalPaid = uiState.totalPaid
        val remaining = (event.totalAmount - totalPaid).coerceAtLeast(0.0)
        val progress = if (event.totalAmount > 0) (totalPaid / event.totalAmount).coerceIn(0.0, 1.0) else 0.0

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                KpiCard(stringResource(R.string.events_detail_payments_kpi_total), event.totalAmount.asMXN(), SolennixTheme.colors.primary, Modifier.weight(1f))
                KpiCard(stringResource(R.string.events_detail_payments_kpi_paid), totalPaid.asMXN(), SolennixTheme.colors.success, Modifier.weight(1f))
                KpiCard(stringResource(R.string.events_detail_payments_kpi_balance), remaining.asMXN(), if (remaining <= 0.01) SolennixTheme.colors.success else SolennixTheme.colors.error, Modifier.weight(1f))
            }

            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                shape = MaterialTheme.shapes.medium
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    LinearProgressIndicator(
                        progress = { progress.toFloat() },
                        modifier = Modifier.fillMaxWidth().height(12.dp),
                        color = SolennixTheme.colors.primary,
                        trackColor = SolennixTheme.colors.secondaryText.copy(alpha = 0.15f),
                        strokeCap = androidx.compose.ui.graphics.StrokeCap.Round
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(stringResource(R.string.events_detail_payments_progress, (progress * 100).toInt()), style = MaterialTheme.typography.bodySmall, color = SolennixTheme.colors.secondaryText)
                }
            }

            if (remaining > 0.01) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        PremiumButton(
                            text = stringResource(R.string.events_detail_payments_record),
                            onClick = {
                                paymentInitialAmount = null
                                showPaymentModal = true
                            },
                            modifier = Modifier.weight(1f),
                            icon = Icons.Default.Add
                        )

                        PremiumButton(
                            text = stringResource(R.string.events_detail_payments_settle, remaining.asMXN()),
                            onClick = {
                                paymentInitialAmount = remaining
                                showPaymentModal = true
                            },
                            modifier = Modifier.weight(1f),
                            icon = Icons.Default.Check
                        )
                    }

                    val depositPct = event.depositPercent
                    if (depositPct != null && depositPct > 0) {
                        val depositTarget = event.totalAmount * depositPct / 100
                        val depositRemaining = (depositTarget - totalPaid).coerceAtLeast(0.0)
                        if (depositRemaining > 0) {
                            OutlinedButton(
                                onClick = {
                                    paymentInitialAmount = depositRemaining
                                    showPaymentModal = true
                                },
                                modifier = Modifier.fillMaxWidth(),
                                shape = MaterialTheme.shapes.medium
                            ) {
                                Icon(Icons.Default.Savings, contentDescription = null, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(stringResource(R.string.events_detail_payments_deposit, depositRemaining.asMXN()))
                            }
                        }
                    }
                }
            }

            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                shape = MaterialTheme.shapes.medium
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text(stringResource(R.string.events_detail_payments_history), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                    Spacer(modifier = Modifier.height(12.dp))

                    if (uiState.payments.isEmpty()) {
                        Column(
                            modifier = Modifier.fillMaxWidth().padding(vertical = 24.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(Icons.Default.Payments, contentDescription = null, tint = SolennixTheme.colors.secondaryText, modifier = Modifier.size(48.dp))
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(stringResource(R.string.events_detail_payments_empty), style = MaterialTheme.typography.bodyMedium, color = SolennixTheme.colors.secondaryText)
                        }
                    } else {
                        uiState.payments.forEach { payment ->
                            Card(
                                modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
                                colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.surface),
                                shape = MaterialTheme.shapes.medium
                            ) {
                                Row(
                                    modifier = Modifier.padding(16.dp).fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(payment.paymentDate, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
                                        Text(
                                            payment.paymentMethod.toPaymentMethodLabel(),
                                            style = MaterialTheme.typography.bodySmall,
                                            color = SolennixTheme.colors.secondaryText
                                        )
                                        if (!payment.notes.isNullOrEmpty()) {
                                            Text(payment.notes.orEmpty(), style = MaterialTheme.typography.bodySmall, color = SolennixTheme.colors.secondaryText)
                                        }
                                    }
                                    Text(payment.amount.asMXN(), style = MaterialTheme.typography.titleMedium, color = SolennixTheme.colors.success, fontWeight = FontWeight.Bold)
                                    Spacer(modifier = Modifier.width(8.dp))
                                    IconButton(
                                        onClick = { pendingDeletePaymentId = payment.id },
                                        modifier = Modifier.size(32.dp)
                                    ) {
                                        Icon(Icons.Default.Delete, contentDescription = stringResource(R.string.events_detail_payments_delete_a11y), tint = SolennixTheme.colors.error, modifier = Modifier.size(18.dp))
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        if (showPaymentModal) {
            PaymentModal(
                remaining = remaining,
                initialAmount = paymentInitialAmount,
                onDismiss = {
                    showPaymentModal = false
                    paymentInitialAmount = null
                },
                onConfirm = { amount, method, notes, date ->
                    viewModel.addPayment(amount, method, notes, date)
                    showPaymentModal = false
                    paymentInitialAmount = null
                    Toast.makeText(context, context.getString(R.string.events_detail_payments_add_success), Toast.LENGTH_SHORT).show()
                }
            )
        }

        pendingDeletePaymentId?.let { paymentId ->
            AlertDialog(
                onDismissRequest = { pendingDeletePaymentId = null },
                title = { Text(stringResource(R.string.events_detail_payments_delete_title)) },
                text = { Text(stringResource(R.string.events_detail_payments_delete_message)) },
                confirmButton = {
                    TextButton(
                        onClick = {
                            viewModel.deletePayment(paymentId)
                            pendingDeletePaymentId = null
                            Toast.makeText(context, context.getString(R.string.events_detail_payments_delete_success), Toast.LENGTH_SHORT).show()
                        }
                    ) {
                        Text(stringResource(R.string.events_detail_payments_delete), color = SolennixTheme.colors.error)
                    }
                },
                dismissButton = {
                    TextButton(onClick = { pendingDeletePaymentId = null }) { Text(stringResource(R.string.events_list_cancel)) }
                }
            )
        }
    }
}

@Composable
fun KpiCard(
    label: String,
    value: String,
    color: Color,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier,
        shape = MaterialTheme.shapes.medium,
        color = color.copy(alpha = 0.1f)
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(value, style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, color = color, maxLines = 1)
            Text(label, style = MaterialTheme.typography.labelSmall, color = SolennixTheme.colors.secondaryText)
        }
    }
}
