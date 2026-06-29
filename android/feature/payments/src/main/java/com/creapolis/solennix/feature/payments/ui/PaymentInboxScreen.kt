package com.creapolis.solennix.feature.payments.ui

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Inbox
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import com.creapolis.solennix.core.designsystem.component.SolennixPullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.component.EmptyState
import com.creapolis.solennix.core.designsystem.component.SkeletonLoading
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.designsystem.util.HapticFeedbackType
import com.creapolis.solennix.core.designsystem.util.rememberHapticFeedback
import com.creapolis.solennix.core.model.PaymentSubmission
import com.creapolis.solennix.feature.payments.R
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
    val strings = paymentInboxStrings()
    var showRejectDialog by remember { mutableStateOf<PaymentSubmission?>(null) }
    var showApproveDialog by remember { mutableStateOf<PaymentSubmission?>(null) }
    var rejectReason by remember { mutableStateOf("") }
    val hapticFeedback = rememberHapticFeedback()

    // Action error snackbar
    val snackbarHostState = remember { SnackbarHostState() }
    val retryLabel = stringResource(R.string.payments_inbox_error_retry)
    LaunchedEffect(uiState.actionError) {
        uiState.actionError?.let {
            snackbarHostState.showSnackbar(it, actionLabel = retryLabel)
            viewModel.clearActionError()
        }
    }

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = { Text(strings.title) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.Default.Close, contentDescription = strings.back)
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { padding ->
        SolennixPullToRefreshBox(
            isRefreshing = uiState.isRefreshing,
            onRefresh = { viewModel.loadSubmissions(isRefresh = true) },
            modifier = Modifier.padding(padding).fillMaxSize()
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // Search bar — filters by client name, event label, or transfer ref
                OutlinedTextField(
                    value = uiState.searchQuery,
                    onValueChange = viewModel::onSearchQueryChange,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    placeholder = { Text(strings.searchPlaceholder) },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                    singleLine = true,
                    shape = RoundedCornerShape(28.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = SolennixTheme.colors.primary,
                        unfocusedBorderColor = SolennixTheme.colors.divider,
                        focusedContainerColor = SolennixTheme.colors.surface,
                        unfocusedContainerColor = SolennixTheme.colors.surface
                    )
                )

                val displaySubmissions = uiState.filteredSubmissions

                AnimatedContent(
                    targetState = when {
                        uiState.isLoading -> "loading"
                        uiState.error != null -> "error"
                        uiState.isPlanLocked -> "plan_locked"
                        displaySubmissions.isEmpty() -> "empty"
                        else -> "content"
                    },
                    transitionSpec = { fadeIn() togetherWith fadeOut() },
                    label = "paymentInboxState"
                ) { screenState ->
                    when (screenState) {
                        "loading" -> PaymentInboxSkeleton()
                        "error" -> EmptyState(
                            icon = Icons.Default.Inbox,
                            title = strings.errorTitle,
                            message = uiState.error ?: "",
                            actionText = strings.errorRetry,
                            onAction = { viewModel.loadSubmissions() }
                        )
                        "plan_locked" -> EmptyState(
                            icon = Icons.Default.Inbox,
                            title = strings.proOnlyTitle,
                            message = strings.proOnlyHint
                        )
                        "empty" -> EmptyState(
                            icon = Icons.Default.Inbox,
                            title = if (uiState.searchQuery.isNotEmpty()) strings.emptySearchTitle else strings.emptyTitle,
                            message = if (uiState.searchQuery.isNotEmpty()) strings.emptySearchMessage else ""
                        )
                        else -> LazyColumn(
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            items(displaySubmissions, key = { it.id }) { submission ->
                                PaymentSubmissionCard(
                                    submission = submission,
                                    strings = strings,
                                    isActionLoading = uiState.actionLoading == submission.id,
                                    onApprove = { showApproveDialog = submission },
                                    onReject = {
                                        hapticFeedback(HapticFeedbackType.WARNING)
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
    }

    // Approve confirmation dialog
    showApproveDialog?.let { sub ->
        AlertDialog(
            onDismissRequest = { showApproveDialog = null },
            title = { Text(strings.approveTitle) },
            text = {
                Text(strings.approveMessage(sub.clientName ?: strings.thisClient, formatMXN(sub.amount)))
            },
            confirmButton = {
                Button(
                    onClick = {
                        hapticFeedback(HapticFeedbackType.SUCCESS)
                        viewModel.approveSubmission(sub.id)
                        showApproveDialog = null
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = SolennixTheme.colors.success)
                ) { Text(strings.approveAction) }
            },
            dismissButton = {
                TextButton(onClick = { showApproveDialog = null }) { Text(strings.cancel) }
            }
        )
    }

    // Reject dialog with reason
    showRejectDialog?.let { sub ->
        AlertDialog(
            onDismissRequest = { showRejectDialog = null },
            title = { Text(strings.rejectTitle) },
            text = {
                Column {
                    Text(strings.rejectDescription, style = MaterialTheme.typography.bodyMedium)
                    Spacer(Modifier.height(8.dp))
                    OutlinedTextField(
                        value = rejectReason,
                        onValueChange = { rejectReason = it },
                        placeholder = { Text(strings.rejectPlaceholder) },
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
                ) { Text(strings.rejectAction) }
            },
            dismissButton = {
                TextButton(onClick = { showRejectDialog = null }) { Text(strings.cancel) }
            }
        )
    }
}

@Composable
private fun PaymentInboxSkeleton() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        repeat(4) {
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
                        SkeletonLoading(
                            modifier = Modifier
                                .height(18.dp)
                                .fillMaxWidth(0.45f)
                        )
                        SkeletonLoading(
                            modifier = Modifier
                                .height(22.dp)
                                .width(90.dp)
                        )
                    }
                    Spacer(Modifier.height(8.dp))
                    SkeletonLoading(
                        modifier = Modifier
                            .height(14.dp)
                            .fillMaxWidth(0.6f)
                    )
                    Spacer(Modifier.height(8.dp))
                    SkeletonLoading(
                        modifier = Modifier
                            .height(14.dp)
                            .fillMaxWidth(0.35f)
                    )
                    Spacer(Modifier.height(12.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        SkeletonLoading(
                            modifier = Modifier
                                .height(32.dp)
                                .width(100.dp)
                        )
                        SkeletonLoading(
                            modifier = Modifier
                                .height(32.dp)
                                .width(100.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun PaymentSubmissionCard(
    submission: PaymentSubmission,
    strings: PaymentInboxStrings,
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
                        submission.clientName ?: strings.clientFallback,
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

            submission.transferRef?.let { transferRef ->
                Spacer(Modifier.height(4.dp))
                Text(
                    strings.referenceText(transferRef),
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
                            Text(strings.approveAction, style = MaterialTheme.typography.labelMedium)
                        }
                        OutlinedButton(
                            onClick = onReject,
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
                        ) {
                            Icon(Icons.Default.Close, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text(strings.rejectAction, style = MaterialTheme.typography.labelMedium)
                        }
                    }
                }
            } else {
                Spacer(Modifier.height(8.dp))
                PaymentStatusChip(status = submission.status, strings = strings)
                submission.rejectionReason?.let { rejectionReason ->
                    Spacer(Modifier.height(4.dp))
                    Text(
                        strings.reasonText(rejectionReason),
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.error
                    )
                }
            }
        }
    }
}

@Composable
private fun PaymentStatusChip(status: String, strings: PaymentInboxStrings) {
    val (label, color) = when (status) {
        "approved" -> strings.statusApproved to SolennixTheme.colors.success
        "rejected" -> strings.statusRejected to SolennixTheme.colors.error
        else -> strings.statusPending to SolennixTheme.colors.warning
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
    NumberFormat.getCurrencyInstance(Locale.forLanguageTag("es-MX")).format(amount)

private fun formatDate(isoDate: String): String = try {
    val parts = isoDate.substringBefore("T").split("-")
    "${parts[2]}/${parts[1]}/${parts[0]}"
} catch (e: Exception) {
    isoDate
}

private data class PaymentInboxStrings(
    val title: String,
    val back: String,
    val proOnlyTitle: String,
    val proOnlyHint: String,
    val emptyTitle: String,
    val emptySearchTitle: String,
    val emptySearchMessage: String,
    val errorTitle: String,
    val errorRetry: String,
    val searchPlaceholder: String,
    val approveTitle: String,
    val approveAction: String,
    val approveMessageFormat: String,
    val rejectTitle: String,
    val rejectDescription: String,
    val rejectPlaceholder: String,
    val rejectAction: String,
    val cancel: String,
    val thisClient: String,
    val clientFallback: String,
    val referenceFormat: String,
    val reasonFormat: String,
    val statusApproved: String,
    val statusRejected: String,
    val statusPending: String,
) {
    fun approveMessage(client: String, amount: String): String =
        String.format(Locale.getDefault(), approveMessageFormat, client, amount)

    fun referenceText(reference: String): String =
        String.format(Locale.getDefault(), referenceFormat, reference)

    fun reasonText(reason: String): String =
        String.format(Locale.getDefault(), reasonFormat, reason)
}

@Composable
private fun paymentInboxStrings(): PaymentInboxStrings = PaymentInboxStrings(
    title = stringResource(R.string.payments_inbox_title),
    back = stringResource(R.string.payments_inbox_back),
    proOnlyTitle = stringResource(R.string.payments_inbox_pro_only_title),
    proOnlyHint = stringResource(R.string.payments_inbox_pro_only_hint),
    emptyTitle = stringResource(R.string.payments_inbox_empty_title),
    emptySearchTitle = stringResource(R.string.payments_inbox_empty_search_title),
    emptySearchMessage = stringResource(R.string.payments_inbox_empty_search_message),
    errorTitle = stringResource(R.string.payments_inbox_error_title),
    errorRetry = stringResource(R.string.payments_inbox_error_retry),
    searchPlaceholder = stringResource(R.string.payments_inbox_search_placeholder),
    approveTitle = stringResource(R.string.payments_inbox_approve_title),
    approveAction = stringResource(R.string.payments_inbox_approve_action),
    approveMessageFormat = stringResource(R.string.payments_inbox_approve_message),
    rejectTitle = stringResource(R.string.payments_inbox_reject_title),
    rejectDescription = stringResource(R.string.payments_inbox_reject_description),
    rejectPlaceholder = stringResource(R.string.payments_inbox_reject_placeholder),
    rejectAction = stringResource(R.string.payments_inbox_reject_action),
    cancel = stringResource(R.string.payments_inbox_cancel),
    thisClient = stringResource(R.string.payments_inbox_this_client),
    clientFallback = stringResource(R.string.payments_inbox_client_fallback),
    referenceFormat = stringResource(R.string.payments_inbox_reference_format),
    reasonFormat = stringResource(R.string.payments_inbox_reason_format),
    statusApproved = stringResource(R.string.payments_inbox_status_approved),
    statusRejected = stringResource(R.string.payments_inbox_status_rejected),
    statusPending = stringResource(R.string.payments_inbox_status_pending),
)
