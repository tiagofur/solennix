package com.creapolis.solennix.feature.events.ui

import android.widget.Toast
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.AssignmentStatus
import com.creapolis.solennix.core.model.DiscountType
import com.creapolis.solennix.core.model.extensions.asMXN
import com.creapolis.solennix.core.model.extensions.formatQuantity
import com.creapolis.solennix.feature.events.R
import com.creapolis.solennix.feature.events.viewmodel.EventDetailViewModel
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EventContractPreviewScreen(
    viewModel: EventDetailViewModel,
    onNavigateBack: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = { Text(stringResource(R.string.events_contract_title)) },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, stringResource(R.string.events_common_back))
                    }
                },
                actions = {
                    val event = uiState.event
                    if (event != null) {
                        IconButton(onClick = {
                            scope.launch {
                                try {
                                    val file = downloadEventPdfToCache(
                                        context = context,
                                        viewModel = viewModel,
                                        type = "contract",
                                        filename = "contrato_${event.id.take(8)}.pdf"
                                    )
                                    sharePdfFile(context, file, context.getString(R.string.events_contract_share_chooser))
                                } catch (e: Exception) {
                                    Toast.makeText(context, context.getString(R.string.events_contract_generate_error), Toast.LENGTH_SHORT).show()
                                }
                            }
                        }) {
                            Icon(Icons.Default.Share, contentDescription = stringResource(R.string.events_contract_share_pdf_a11y))
                        }
                    }
                }
            )
        }
    ) { padding ->
        val event = uiState.event
        if (event == null) {
            Box(modifier = Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
            return@Scaffold
        }

        val user = uiState.currentUser
        val totalPaid = uiState.totalPaid
        val depositPercent = event.depositPercent ?: user?.defaultDepositPercent ?: 0.0
        val depositAmount = event.totalAmount * (depositPercent / 100)
        val isDepositMet = depositPercent == 0.0 || totalPaid >= depositAmount

        if (!isDepositMet) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Icon(
                    Icons.Default.Lock,
                    contentDescription = null,
                    modifier = Modifier.size(64.dp),
                    tint = SolennixTheme.colors.warning
                )
                Spacer(modifier = Modifier.height(24.dp))
                Text(
                    stringResource(R.string.events_contract_deposit_required_title),
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Black,
                    color = SolennixTheme.colors.primaryText
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    stringResource(R.string.events_contract_deposit_required_message, depositPercent.toInt()),
                    style = MaterialTheme.typography.bodyMedium,
                    color = SolennixTheme.colors.secondaryText,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                )
                Spacer(modifier = Modifier.height(16.dp))
                val remaining = maxOf(depositAmount - totalPaid, 0.0)
                Text(
                    stringResource(R.string.events_contract_deposit_remaining, remaining.asMXN()),
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold,
                    color = SolennixTheme.colors.warning
                )
            }
        } else {
            val result = renderContractTemplate(event, uiState.client, user, uiState.products, totalPaid)

            if (result.missingTokens.isNotEmpty()) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .padding(32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Icon(
                        Icons.Default.Warning,
                        contentDescription = null,
                        modifier = Modifier.size(64.dp),
                        tint = SolennixTheme.colors.error
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        stringResource(R.string.events_contract_missing_data_title),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = SolennixTheme.colors.primaryText
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        stringResource(R.string.events_contract_missing_data_message),
                        style = MaterialTheme.typography.bodyMedium,
                        color = SolennixTheme.colors.secondaryText,
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Card(
                        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            result.missingTokens.forEach { token ->
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier.padding(vertical = 2.dp)
                                ) {
                                    Icon(
                                        Icons.Default.Cancel,
                                        contentDescription = null,
                                        tint = SolennixTheme.colors.error,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(token, style = MaterialTheme.typography.bodySmall)
                                }
                            }
                        }
                    }
                }
            } else {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .padding(12.dp)
                ) {
                    Card(
                        modifier = Modifier.fillMaxSize(),
                        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                        shape = MaterialTheme.shapes.large,
                        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp)
                    ) {
                        Column(
                            modifier = Modifier
                                .verticalScroll(rememberScrollState())
                                .padding(20.dp)
                        ) {
                            val paragraphs = result.text.split("\n")
                            paragraphs.forEach { paragraph ->
                                val trimmed = paragraph.trim()
                                if (trimmed.isEmpty()) {
                                    Spacer(modifier = Modifier.height(6.dp))
                                } else if (isContractHeading(trimmed)) {
                                    Spacer(modifier = Modifier.height(12.dp))
                                    Text(
                                        trimmed,
                                        style = MaterialTheme.typography.labelLarge,
                                        fontWeight = FontWeight.Bold,
                                        color = SolennixTheme.colors.primaryText
                                    )
                                    Spacer(modifier = Modifier.height(4.dp))
                                } else {
                                    Text(
                                        trimmed,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = SolennixTheme.colors.primaryText,
                                        lineHeight = MaterialTheme.typography.bodySmall.lineHeight * 1.4
                                    )
                                    Spacer(modifier = Modifier.height(2.dp))
                                }
                            }

                            Spacer(modifier = Modifier.height(40.dp))
                            Row(modifier = Modifier.fillMaxWidth()) {
                                Column(
                                    modifier = Modifier.weight(1f),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Spacer(modifier = Modifier.height(32.dp))
                                    HorizontalDivider()
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        user?.businessName ?: user?.name ?: stringResource(R.string.events_contract_provider_fallback),
                                        style = MaterialTheme.typography.labelSmall,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Text(stringResource(R.string.events_contract_signature), style = MaterialTheme.typography.labelSmall, color = SolennixTheme.colors.tertiaryText)
                                }
                                Spacer(modifier = Modifier.width(24.dp))
                                Column(
                                    modifier = Modifier.weight(1f),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Spacer(modifier = Modifier.height(32.dp))
                                    HorizontalDivider()
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Text(
                                        uiState.client?.name ?: stringResource(R.string.events_contract_client_fallback),
                                        style = MaterialTheme.typography.labelSmall,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Text(stringResource(R.string.events_contract_client_signature), style = MaterialTheme.typography.labelSmall, color = SolennixTheme.colors.tertiaryText)
                                }
                            }
                            Spacer(modifier = Modifier.height(24.dp))
                        }
                    }
                }
            }
        }
    }
}
