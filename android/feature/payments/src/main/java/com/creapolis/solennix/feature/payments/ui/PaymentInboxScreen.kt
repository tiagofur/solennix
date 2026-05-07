package com.creapolis.solennix.feature.payments.ui

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Inbox
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.PaymentSubmission
import com.creapolis.solennix.feature.payments.viewmodel.PaymentInboxViewModel
import java.text.NumberFormat
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PaymentInboxScreen(
    viewModel: PaymentInboxViewModel,
    onNavigateBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var showRejectDialog by remember { mutableStateOf<PaymentSubmission?>(null) }
    var showApproveDialog by remember { mutableStateOf<PaymentSubmission?>(null) }
    var rejectReason by remember { mutableStateOf("") }

    // Action error snackbar
    val snackbarHostState = remember { SnackbarHostState() }
    LaunchedEffect(uiState.actionError) {
        uiState.actionError?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearActionError()
        }
    }

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = { Text("Comprobantes de pago") },
                navigationIcon = { IconButton(onClick = onNavigateBack) {
                    Icon(Icons.Default.Close, contentDescription = "Volver")
                }}
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = uiState.isRefreshing,
            onRefresh = { viewModel.loadSubmissions(isRefresh = true) },
            modifier = Modifier.padding(padding).fillMaxSize()
        ) {
            when {
                uiState.isLoading -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = SolennixTheme.colors.primary)
                    }
                }
                uiState.error != null -> {
                    Box(Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
                        Text(uiState.error ?: "", color = SolennixTheme.colors.error, style = MaterialTheme.typography.bodyMedium)
                    }
                }
                uiState.submissions.isEmpty() -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(Icons.Default.Inbox, contentDescription = null,
                                tint = SolennixTheme.colors.secondaryText,
                                modifier = Modifier.size(48.dp))
                            Spacer(Modifier.height(12.dp))
                            Text("Sin comprobantes pendientes",
                                style = MaterialTheme.typography.bodyMedium,
                                color = SolennixTheme.colors.secondaryText)
                        }
                    }
                }
                else -> {
                    LazyColumn(
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(uiState.submissions, key = { it.id }) { submission ->
                            PaymentSubmissionCard(
                                submission = submission,
                                isActionLoading = uiState.actionLoading == submission.id,
                                onApprove = { showApproveDialog = submission },
                                onReject = {
                                    rejectReason = ""
                                    showRejectDialog = submission
                                }
                            )
                        }
                    }
                }
            }
        }
    }

    // Approve confirmation dialog
    showApproveDialog?.let { sub ->
        AlertDialog(
            onDismissRequest = { showApproveDialog = null },
            title = { Text("Confirmar aprobación") },
            text = {
                Text("¿Aprobás el comprobante de ${sub.clientName ?: "este cliente"} por ${formatMXN(sub.amount)}?")
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.approveSubmission(sub.id)
                        showApproveDialog = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = SolennixTheme.colors.success)
                ) { Text("Aprobar") }
            },
            dismissButton = {
                TextButton(onClick = { showApproveDialog = null }) { Text("Cancelar") }
            }
        )
    }

    // Reject dialog with reason
    showRejectDialog?.let { sub ->
        AlertDialog(
            onDismissRequest = { showRejectDialog = null },
            title = { Text("Rechazar comprobante") },
            text = {
                Column {
                    Text("Indicá el motivo del rechazo (obligatorio):", style = MaterialTheme.typography.bodyMedium)
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(
                        value = rejectReason,
                        onValueChange = { rejectReason = it },
                        placeholder = { Text("Ej: Monto incorrecto, referencia inválida...") },
                        minLines = 3,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (rejectReason.length >= 10) {
                            viewModel.rejectSubmission(sub.id, rejectReason)
                            showRejectDialog = null
                        }
                    },
                    enabled = rejectReason.length >= 10,
                    colors = ButtonDefaults.buttonColors(containerColor = SolennixTheme.colors.error)
                ) { Text("Rechazar") }
            },
            dismissButton = {
                TextButton(onClick = { showRejectDialog = null }) { Text("Cancelar") }
            }
        )
    }
}

@Composable
private fun PaymentSubmissionCard(
    submission: PaymentSubmission,
    isActionLoading: Boolean,
    onApprove: () -> Unit,
    onReject: () -> Unit
) {
    val eventLabel = submission.eventLabel

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        submission.clientName ?: "Cliente",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                        color = SolennixTheme.colors.primaryText
                    )
                    if (eventLabel != null) {
                        Text(
                            eventLabel,
                            style = MaterialTheme.typography.bodySmall,
                            color = SolennixTheme.colors.secondaryText
                        )
                    }
                }
                Text(
                    formatMXN(submission.amount),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = SolennixTheme.colors.primary
                )
            }

            if (submission.transferRef != null) {
                Spacer(Modifier.height(4.dp))
                Text(
                    "Ref: ${submission.transferRef}",
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText
                )
            }

            Spacer(Modifier.height(4.dp))
            Text(
                formatDate(submission.submittedAt),
                style = MaterialTheme.typography.bodySmall,
                color = SolennixTheme.colors.tertiaryText
            )

            if (submission.status == "pending") {
                Spacer(Modifier.height(12.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (isActionLoading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(32.dp),
                            color = SolennixTheme.colors.primary,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Button(
                            onClick = onApprove,
                            colors = ButtonDefaults.buttonColors(containerColor = SolennixTheme.colors.success),
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
                        ) {
                            Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Aprobar", style = MaterialTheme.typography.labelMedium)
                        }
                        OutlinedButton(
                            onClick = onReject,
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
                        ) {
                            Icon(Icons.Default.Close, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("Rechazar", style = MaterialTheme.typography.labelMedium)
                        }
                    }
                }
            } else {
                Spacer(Modifier.height(8.dp))
                PaymentStatusChip(status = submission.status)
                if (submission.rejectionReason != null) {
                    Spacer(Modifier.height(4.dp))
                    Text(
                        "Motivo: ${submission.rejectionReason}",
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.error
                    )
                }
            }
        }
    }
}

@Composable
private fun PaymentStatusChip(status: String) {
    val (label, color) = when (status) {
        "approved" -> "Aprobado" to SolennixTheme.colors.success
        "rejected" -> "Rechazado" to SolennixTheme.colors.error
        else -> "Pendiente" to SolennixTheme.colors.warning
    }
    Surface(
        shape = RoundedCornerShape(20.dp),
        color = color.copy(alpha = 0.12f)
    ) {
        Text(
            label,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelSmall,
            color = color,
            fontWeight = FontWeight.SemiBold
        )
    }
}

private fun formatMXN(amount: Double): String =
    NumberFormat.getCurrencyInstance(Locale("es", "MX")).format(amount)

private fun formatDate(isoDate: String): String = try {
    val parts = isoDate.substringBefore("T").split("-")
    "${parts[2]}/${parts[1]}/${parts[0]}"
} catch (e: Exception) {
    isoDate
}
