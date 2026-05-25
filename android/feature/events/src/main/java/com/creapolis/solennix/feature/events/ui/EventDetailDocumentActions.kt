package com.creapolis.solennix.feature.events.ui

import android.content.Context
import android.widget.Toast
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Article
import androidx.compose.material.icons.filled.Checklist
import androidx.compose.material.icons.filled.Description
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.Payments
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.feature.events.R
import com.creapolis.solennix.feature.events.viewmodel.EventDetailUiState
import com.creapolis.solennix.feature.events.viewmodel.EventDetailViewModel
import java.io.File
import kotlinx.coroutines.launch

@Composable
fun DocumentActionsGrid(
    uiState: EventDetailUiState,
    context: Context,
    viewModel: EventDetailViewModel,
    onSharePdf: (File) -> Unit
) {
    val event = uiState.event ?: return
    var isGenerating by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    val downloadPdfAsync: (type: String, filename: String) -> Unit = { type, filename ->
        isGenerating = true
        scope.launch {
            try {
                val file = downloadEventPdfToCache(context, viewModel, type, filename)
                onSharePdf(file)
            } catch (e: Exception) {
                Toast.makeText(context, context.getString(R.string.events_pdf_download_error, e.message.orEmpty()), Toast.LENGTH_SHORT).show()
            } finally {
                isGenerating = false
            }
        }
    }

    Column(modifier = Modifier.fillMaxWidth()) {
        Row(modifier = Modifier.fillMaxWidth()) {
            ActionButton(
                icon = Icons.Default.Description,
                label = stringResource(R.string.events_document_budget),
                modifier = Modifier.weight(1f),
                onClick = {
                    downloadPdfAsync("budget", "cotizacion_${event.id}.pdf")
                }
            )
            Spacer(modifier = Modifier.width(8.dp))
            ActionButton(
                icon = Icons.AutoMirrored.Filled.Article,
                label = stringResource(R.string.events_document_contract),
                modifier = Modifier.weight(1f),
                onClick = {
                    downloadPdfAsync("contract", "contrato_${event.id}.pdf")
                }
            )
            Spacer(modifier = Modifier.width(8.dp))
            ActionButton(
                icon = Icons.Default.Checklist,
                label = stringResource(R.string.events_document_checklist),
                modifier = Modifier.weight(1f),
                onClick = {
                    downloadPdfAsync("checklist", "checklist_${event.id}.pdf")
                }
            )
        }
        Spacer(modifier = Modifier.height(8.dp))
        Row(modifier = Modifier.fillMaxWidth()) {
            ActionButton(
                icon = Icons.Default.Payments,
                label = stringResource(R.string.events_document_payments),
                modifier = Modifier.weight(1f),
                onClick = {
                    downloadPdfAsync("payment-report", "pagos_${event.id}.pdf")
                }
            )
            Spacer(modifier = Modifier.width(8.dp))
            ActionButton(
                icon = Icons.Default.ShoppingCart,
                label = stringResource(R.string.events_document_shopping),
                modifier = Modifier.weight(1f),
                onClick = {
                    downloadPdfAsync("shopping-list", "compras_${event.id}.pdf")
                }
            )
        }
        Spacer(modifier = Modifier.height(8.dp))
        Row(modifier = Modifier.fillMaxWidth()) {
            ActionButton(
                icon = Icons.Default.Inventory2,
                label = stringResource(R.string.events_document_equipment),
                modifier = Modifier.weight(1f),
                onClick = {
                    downloadPdfAsync("equipment-list", "equipo_${event.id}.pdf")
                }
            )
            Spacer(modifier = Modifier.width(8.dp))
            Spacer(modifier = Modifier.weight(1f))
            Spacer(modifier = Modifier.width(8.dp))
            Spacer(modifier = Modifier.weight(1f))
        }
    }

    if (isGenerating) {
        Box(
            modifier = Modifier.fillMaxWidth(),
            contentAlignment = Alignment.Center
        ) {
            CircularProgressIndicator(modifier = Modifier.size(24.dp))
        }
    }
}

@Composable
private fun ActionButton(icon: ImageVector, label: String, modifier: Modifier, onClick: () -> Unit) {
    OutlinedButton(
        onClick = onClick,
        modifier = modifier.height(80.dp),
        shape = MaterialTheme.shapes.medium,
        contentPadding = PaddingValues(0.dp)
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            androidx.compose.material3.Icon(imageVector = icon, contentDescription = null)
            Spacer(modifier = Modifier.height(4.dp))
            Text(text = label, style = MaterialTheme.typography.labelSmall)
        }
    }
}
