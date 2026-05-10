package com.creapolis.solennix.feature.events.ui

import android.content.Context
import android.widget.Toast
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Article
import androidx.compose.material.icons.automirrored.filled.PlaylistAddCheck
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.Client
import com.creapolis.solennix.core.model.EventStatus
import com.creapolis.solennix.feature.events.R
import com.creapolis.solennix.feature.events.viewmodel.EventDetailUiState
import com.creapolis.solennix.feature.events.viewmodel.EventDetailViewModel
import java.io.File
import kotlinx.coroutines.launch

@Composable
fun NavLinkCard(
    icon: ImageVector,
    label: String,
    tint: Color,
    onClick: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape = MaterialTheme.shapes.medium,
        color = tint.copy(alpha = 0.1f)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                icon,
                contentDescription = null,
                tint = tint,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                text = label,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium,
                color = tint,
                modifier = Modifier.weight(1f)
            )
            Icon(
                Icons.Default.ChevronRight,
                contentDescription = null,
                tint = SolennixTheme.colors.tertiaryText,
                modifier = Modifier.size(18.dp)
            )
        }
    }
}

@Composable
fun ChecklistButton(onClick: () -> Unit) {
    NavLinkCard(
        icon = Icons.AutoMirrored.Filled.PlaylistAddCheck,
        label = "Checklist de Carga",
        tint = SolennixTheme.colors.primary,
        onClick = onClick
    )
}

@Composable
fun ContractPreviewButton(onClick: () -> Unit) {
    NavLinkCard(
        icon = Icons.AutoMirrored.Filled.Article,
        label = "Ver Contrato",
        tint = SolennixTheme.colors.info,
        onClick = onClick
    )
}

@Composable
fun ClientPortalCard(onClick: () -> Unit) {
    NavLinkCard(
        icon = Icons.Default.Link,
        label = androidx.compose.ui.res.stringResource(R.string.events_client_portal_title),
        tint = SolennixTheme.colors.primary,
        onClick = onClick
    )
}

@Composable
fun StatusChangePill(
    currentStatus: EventStatus,
    onStatusChange: (EventStatus) -> Unit
) {
    val statusOptions = listOf(
        EventStatus.QUOTED to "Cotizado",
        EventStatus.CONFIRMED to "Confirmado",
        EventStatus.COMPLETED to "Completado",
        EventStatus.CANCELLED to "Cancelado"
    )
    val currentLabel = statusOptions.firstOrNull { it.first == currentStatus }?.second
        ?: currentStatus.name
    val currentColor = statusColor(currentStatus)
    var expanded by remember { mutableStateOf(false) }

    Box {
        Surface(
            onClick = { expanded = true },
            shape = RoundedCornerShape(999.dp),
            color = currentColor.copy(alpha = 0.15f),
            contentColor = currentColor
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                Text(
                    currentLabel,
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Icon(
                    Icons.Default.ArrowDropDown,
                    contentDescription = "Cambiar estado",
                    modifier = Modifier.size(16.dp)
                )
            }
        }
        DropdownMenu(
            expanded = expanded,
            onDismissRequest = { expanded = false }
        ) {
            statusOptions.forEach { (status, label) ->
                val color = statusColor(status)
                val isSelected = status == currentStatus
                DropdownMenuItem(
                    text = {
                        Text(
                            label,
                            color = color,
                            fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Normal
                        )
                    },
                    onClick = {
                        expanded = false
                        if (!isSelected) onStatusChange(status)
                    },
                    trailingIcon = if (isSelected) {
                        {
                            Icon(
                                Icons.Default.Check,
                                contentDescription = null,
                                tint = color,
                                modifier = Modifier.size(18.dp)
                            )
                        }
                    } else null
                )
            }
        }
    }
}

@Composable
fun statusColor(status: EventStatus): Color = when (status) {
    EventStatus.QUOTED -> SolennixTheme.colors.primary
    EventStatus.CONFIRMED -> SolennixTheme.colors.success
    EventStatus.COMPLETED -> SolennixTheme.colors.primary
    EventStatus.CANCELLED -> SolennixTheme.colors.error
}

@Composable
fun DocumentActionsGrid(
    uiState: EventDetailUiState,
    context: Context,
    viewModel: EventDetailViewModel,
    onSharePdf: (File) -> Unit
) {
    val event = uiState.event ?: return
    val client = uiState.client ?: Client(
        id = "",
        userId = "",
        name = "Cliente no disponible",
        phone = "-",
        email = null,
        address = null,
        createdAt = "",
        updatedAt = ""
    )
    var isGenerating by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    val downloadPdfAsync: (type: String, filename: String) -> Unit = { type, filename ->
        isGenerating = true
        scope.launch {
            try {
                val file = downloadEventPdfToCache(context, viewModel, type, filename)
                onSharePdf(file)
            } catch (e: Exception) {
                Toast.makeText(context, "Error descargando PDF: ${e.message}", Toast.LENGTH_SHORT).show()
            } finally {
                isGenerating = false
            }
        }
    }

    Column(modifier = Modifier.fillMaxWidth()) {
        Row(modifier = Modifier.fillMaxWidth()) {
            ActionButton(
                icon = Icons.Default.Description,
                label = "Cotización",
                modifier = Modifier.weight(1f),
                onClick = {
                    downloadPdfAsync("budget", "cotizacion_${event.id}.pdf")
                }
            )
            Spacer(modifier = Modifier.width(8.dp))
            ActionButton(
                icon = Icons.AutoMirrored.Filled.Article,
                label = "Contrato",
                modifier = Modifier.weight(1f),
                onClick = {
                    downloadPdfAsync("contract", "contrato_${event.id}.pdf")
                }
            )
            Spacer(modifier = Modifier.width(8.dp))
            ActionButton(
                icon = Icons.Default.Checklist,
                label = "Checklist",
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
                label = "Pagos",
                modifier = Modifier.weight(1f),
                onClick = {
                    downloadPdfAsync("payment-report", "pagos_${event.id}.pdf")
                }
            )
            Spacer(modifier = Modifier.width(8.dp))
            ActionButton(
                icon = Icons.Default.ShoppingCart,
                label = "Compras",
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
                label = "Equipo",
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
fun ActionButton(icon: ImageVector, label: String, modifier: Modifier, onClick: () -> Unit) {
    OutlinedButton(
        onClick = onClick,
        modifier = modifier.height(80.dp),
        shape = MaterialTheme.shapes.medium,
        contentPadding = PaddingValues(0.dp)
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            Icon(imageVector = icon, contentDescription = null)
            Spacer(modifier = Modifier.height(4.dp))
            Text(text = label, style = MaterialTheme.typography.labelSmall)
        }
    }
}
