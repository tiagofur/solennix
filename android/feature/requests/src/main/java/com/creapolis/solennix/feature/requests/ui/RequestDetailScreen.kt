package com.creapolis.solennix.feature.requests.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.designsystem.util.HapticFeedbackType
import com.creapolis.solennix.core.designsystem.util.rememberHapticFeedback
import com.creapolis.solennix.core.model.PublicRequest
import com.creapolis.solennix.feature.requests.R
import com.creapolis.solennix.feature.requests.viewmodel.RequestsInboxViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RequestDetailScreen(
    requestId: String,
    viewModel: RequestsInboxViewModel,
    onNavigateBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }
    val haptic = rememberHapticFeedback()
    var showRespond by remember { mutableStateOf(false) }
    var showDecline by remember { mutableStateOf(false) }
    var amountText by remember { mutableStateOf("") }
    var messageText by remember { mutableStateOf("") }
    var declineReason by remember { mutableStateOf("") }

    LaunchedEffect(requestId) {
        viewModel.loadDetail(requestId)
    }
    LaunchedEffect(uiState.actionSuccess) {
        uiState.actionSuccess?.let {
            snackbarHostState.showSnackbar(it)
            haptic(HapticFeedbackType.SUCCESS)
            viewModel.clearActionMessages()
            showRespond = false
            showDecline = false
        }
    }
    LaunchedEffect(uiState.actionError) {
        uiState.actionError?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearActionMessages()
        }
    }

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = { Text(stringResource(R.string.requests_detail_title)) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.requests_inbox_back)
                        )
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { padding ->
        when {
            uiState.isLoadingDetail && uiState.detail?.request?.id != requestId -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    CircularProgressIndicator()
                }
            }
            uiState.detail?.request?.id == requestId -> {
                val detail = uiState.detail!!
                val request = detail.request
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .verticalScroll(rememberScrollState())
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    SectionTitle(stringResource(R.string.requests_section_contact))
                    LabeledRow(stringResource(R.string.requests_field_email), request.contactEmail)
                    request.contactName?.takeIf { it.isNotBlank() }?.let {
                        LabeledRow(stringResource(R.string.requests_field_name), it)
                    }

                    SectionTitle(stringResource(R.string.requests_section_event))
                    LabeledRow(
                        stringResource(R.string.requests_field_type),
                        request.eventType ?: stringResource(R.string.requests_fallback_event)
                    )
                    request.eventDate?.takeIf { it.isNotBlank() }?.let {
                        LabeledRow(stringResource(R.string.requests_field_date), it)
                    }
                    request.location?.takeIf { it.isNotBlank() }?.let {
                        LabeledRow(stringResource(R.string.requests_field_location), it)
                    }
                    request.guestCount?.let {
                        LabeledRow(stringResource(R.string.requests_field_guests), it.toString())
                    }
                    request.budget?.let {
                        LabeledRow(
                            stringResource(R.string.requests_field_budget),
                            "${it.toInt()} ${request.currency}"
                        )
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            stringResource(R.string.requests_field_status),
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        StatusChip(status = request.status)
                    }

                    if (request.services.isNotEmpty()) {
                        SectionTitle(stringResource(R.string.requests_section_services))
                        request.services.forEach { service ->
                            LabeledRow(
                                service.name,
                                service.price?.let { it.toInt().toString() }.orEmpty()
                            )
                        }
                    }

                    request.message?.takeIf { it.isNotBlank() }?.let { msg ->
                        SectionTitle(stringResource(R.string.requests_section_message))
                        Text(msg, style = MaterialTheme.typography.bodyMedium)
                    }

                    if (detail.responses.isNotEmpty()) {
                        SectionTitle(stringResource(R.string.requests_section_responses))
                        detail.responses.forEach { response ->
                            Text(
                                "${response.quoteAmount.toInt()} ${response.currency}",
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.SemiBold
                            )
                            response.message?.takeIf { it.isNotBlank() }?.let {
                                Text(it, style = MaterialTheme.typography.bodySmall)
                            }
                            Text(
                                response.createdAt,
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Spacer(Modifier.height(8.dp))
                        }
                    }

                    if (canAct(request)) {
                        HorizontalDivider()
                        SectionTitle(stringResource(R.string.requests_section_actions))
                        if (request.status == "pending" || request.status == "info_requested") {
                            Button(
                                onClick = { showRespond = true },
                                enabled = !uiState.actionInFlight,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(stringResource(R.string.requests_action_respond))
                            }
                            if (request.status == "pending") {
                                OutlinedButton(
                                    onClick = { viewModel.requestInfo(request.id) },
                                    enabled = !uiState.actionInFlight,
                                    modifier = Modifier.fillMaxWidth()
                                ) {
                                    Text(stringResource(R.string.requests_action_request_info))
                                }
                            }
                            OutlinedButton(
                                onClick = { showDecline = true },
                                enabled = !uiState.actionInFlight,
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.outlinedButtonColors(
                                    contentColor = SolennixTheme.colors.error
                                )
                            ) {
                                Text(stringResource(R.string.requests_action_decline))
                            }
                        }
                        if (request.status == "accepted_by_client") {
                            Button(
                                onClick = { viewModel.convertToEvent(request.id) },
                                enabled = !uiState.actionInFlight,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Text(stringResource(R.string.requests_action_convert))
                            }
                        }
                    }
                    Spacer(Modifier.height(24.dp))
                }
            }
            else -> {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    CircularProgressIndicator()
                }
            }
        }
    }

    if (showRespond) {
        AlertDialog(
            onDismissRequest = { showRespond = false },
            title = { Text(stringResource(R.string.requests_respond_title)) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(
                        value = amountText,
                        onValueChange = { amountText = it },
                        label = { Text(stringResource(R.string.requests_respond_amount)) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = messageText,
                        onValueChange = { messageText = it },
                        label = { Text(stringResource(R.string.requests_respond_message)) },
                        minLines = 3,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val amount = amountText.replace(",", ".").toDoubleOrNull()
                        if (amount != null) {
                            viewModel.respond(
                                requestId,
                                amount,
                                messageText.trim().ifBlank { null }
                            )
                        }
                    },
                    enabled = !uiState.actionInFlight &&
                        amountText.replace(",", ".").toDoubleOrNull() != null
                ) {
                    Text(stringResource(R.string.requests_action_send))
                }
            },
            dismissButton = {
                TextButton(onClick = { showRespond = false }) {
                    Text(stringResource(R.string.requests_action_cancel))
                }
            }
        )
    }

    if (showDecline) {
        AlertDialog(
            onDismissRequest = { showDecline = false },
            title = { Text(stringResource(R.string.requests_decline_title)) },
            text = {
                OutlinedTextField(
                    value = declineReason,
                    onValueChange = { declineReason = it },
                    label = { Text(stringResource(R.string.requests_decline_reason)) },
                    minLines = 2,
                    modifier = Modifier.fillMaxWidth()
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        viewModel.decline(
                            requestId,
                            declineReason.trim().ifBlank { null }
                        )
                    },
                    enabled = !uiState.actionInFlight,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = SolennixTheme.colors.error
                    )
                ) {
                    Text(stringResource(R.string.requests_action_decline))
                }
            },
            dismissButton = {
                TextButton(onClick = { showDecline = false }) {
                    Text(stringResource(R.string.requests_action_cancel))
                }
            }
        )
    }
}

private fun canAct(request: PublicRequest): Boolean =
    request.status in setOf("pending", "info_requested", "accepted_by_client")

@Composable
private fun SectionTitle(text: String) {
    Text(
        text = text,
        style = MaterialTheme.typography.titleSmall,
        fontWeight = FontWeight.Bold,
        color = SolennixTheme.colors.primary
    )
}

@Composable
private fun LabeledRow(label: String, value: String) {
    if (value.isBlank()) return
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, fontWeight = FontWeight.Medium)
    }
}
