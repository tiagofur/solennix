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
                title = { Text("Contrato") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, "Volver")
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
                                    sharePdfFile(context, file, "Compartir Contrato")
                                } catch (e: Exception) {
                                    Toast.makeText(context, "Error al generar contrato", Toast.LENGTH_SHORT).show()
                                }
                            }
                        }) {
                            Icon(Icons.Default.Share, contentDescription = "Compartir PDF")
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
                    "ANTICIPO REQUERIDO",
                    style = MaterialTheme.typography.headlineSmall,
                    fontWeight = FontWeight.Black,
                    color = SolennixTheme.colors.primaryText
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    "Para visualizar y generar el contrato, es necesario cubrir el anticipo mínimo del ${depositPercent.toInt()}%",
                    style = MaterialTheme.typography.bodyMedium,
                    color = SolennixTheme.colors.secondaryText,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                )
                Spacer(modifier = Modifier.height(16.dp))
                val remaining = maxOf(depositAmount - totalPaid, 0.0)
                Text(
                    "Faltan ${remaining.asMXN()} por cobrar.",
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
                        "Faltan datos para el contrato",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = SolennixTheme.colors.primaryText
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        "Completa estos campos en el evento o cliente:",
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
                                        user?.businessName ?: user?.name ?: "EL PROVEEDOR",
                                        style = MaterialTheme.typography.labelSmall,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Text("Firma", style = MaterialTheme.typography.labelSmall, color = SolennixTheme.colors.tertiaryText)
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
                                        uiState.client?.name ?: "EL CLIENTE",
                                        style = MaterialTheme.typography.labelSmall,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Text("Firma de EL CLIENTE", style = MaterialTheme.typography.labelSmall, color = SolennixTheme.colors.tertiaryText)
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

private data class ContractRenderResult(val text: String, val missingTokens: List<String>)

private fun renderContractTemplate(
    event: com.creapolis.solennix.core.model.Event,
    client: com.creapolis.solennix.core.model.Client?,
    user: com.creapolis.solennix.core.model.User?,
    products: List<com.creapolis.solennix.core.model.EventProduct>,
    totalPaid: Double
): ContractRenderResult {
    val template = user?.contractTemplate?.takeIf { it.isNotBlank() } ?: DEFAULT_CONTRACT_TEMPLATE

    val depositPercent = event.depositPercent ?: user?.defaultDepositPercent ?: 0.0
    val depositAmount = event.totalAmount * (depositPercent / 100)
    val cancellationDays = event.cancellationDays ?: user?.defaultCancellationDays ?: 0.0
    val refundPercent = event.refundPercent ?: user?.defaultRefundPercent ?: 0.0
    val discountValue = if (event.discountType == DiscountType.PERCENT) {
        event.totalAmount * (event.discount / 100) / maxOf(1 - event.discount / 100 + event.taxRate / 100, 0.01)
    } else {
        event.discount
    }

    val eventDate = try {
        val sdf = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale("es", "MX"))
        val display = java.text.SimpleDateFormat("d 'de' MMMM, yyyy", java.util.Locale("es", "MX"))
        val date = sdf.parse(event.eventDate.take(10))
        if (date != null) display.format(date) else event.eventDate
    } catch (_: Exception) { event.eventDate }

    val today = java.text.SimpleDateFormat("d 'de' MMMM, yyyy", java.util.Locale("es", "MX")).format(java.util.Date())

    val servicesList = if (products.isNotEmpty()) {
        products.joinToString(", ") { "${it.quantity.formatQuantity()} ${it.productName ?: \"Producto\"}" }
    } else null

    val tokens: List<Pair<String, String?>> = listOf(
        "[Nombre del cliente]" to client?.name,
        "[Teléfono del cliente]" to client?.phone,
        "[Email del cliente]" to client?.email,
        "[Dirección del cliente]" to client?.address,
        "[Ciudad del cliente]" to client?.city,
        "[Fecha del evento]" to eventDate,
        "[Hora de inicio]" to event.startTime,
        "[Hora de fin]" to event.endTime,
        "[Horario del evento]" to run {
            val s = event.startTime; val e = event.endTime
            if (s != null && e != null) "$s - $e" else s ?: e
        },
        "[Tipo de servicio]" to event.serviceType,
        "[Número de personas]" to event.numPeople.toString(),
        "[Ubicación del evento]" to event.location,
        "[Lugar del evento]" to event.location,
        "[Ciudad del evento]" to event.city,
        "[Monto total del evento]" to event.totalAmount.asMXN(),
        "[Subtotal del evento]" to (event.totalAmount - event.taxAmount + discountValue).asMXN(),
        "[Descuento del evento]" to discountValue.asMXN(),
        "[IVA del evento]" to event.taxAmount.asMXN(),
        "[Porcentaje de anticipo]" to "${depositPercent.toInt()}%",
        "[Monto de anticipo]" to depositAmount.asMXN(),
        "[Total pagado]" to totalPaid.asMXN(),
        "[Días de cancelación]" to "${cancellationDays.toInt()}",
        "[Porcentaje de reembolso]" to "${refundPercent.toInt()}%",
        "[Nombre del negocio]" to (user?.businessName ?: user?.name),
        "[Nombre comercial del proveedor]" to (user?.businessName ?: user?.name),
        "[Nombre del proveedor]" to user?.name,
        "[Email del proveedor]" to user?.email,
        "[Fecha actual]" to today,
        "[Ciudad del contrato]" to (event.city ?: client?.city),
        "[Notas del evento]" to event.notes,
        "[Servicios del evento]" to servicesList,
    )

    var result = template
    val missingTokens = mutableListOf<String>()

    tokens.forEach { (token, value) ->
        if (value != null && value.isNotEmpty()) {
            result = result.replace(token, value)
        } else if (template.contains(token)) {
            missingTokens.add(token)
        }
    }

    return ContractRenderResult(result, missingTokens)
}

private fun isContractHeading(text: String): Boolean {
    val upper = text.uppercase()
    return (text == upper && text.length in 4..79) ||
        text.startsWith("PRIMERA") ||
        text.startsWith("SEGUNDA") ||
        text.startsWith("TERCERA") ||
        text.startsWith("CUARTA") ||
        text.startsWith("QUINTA") ||
        text.startsWith("SEXTA") ||
        text.startsWith("CLÁUSULA")
}

private const val DEFAULT_CONTRACT_TEMPLATE = """CONTRATO DE PRESTACIÓN DE SERVICIOS

En la ciudad de [Ciudad del evento], a [Fecha actual], comparecen por una parte [Nombre del negocio], en lo sucesivo "EL PROVEEDOR", y por otra parte [Nombre del cliente], en lo sucesivo "EL CLIENTE".

DECLARACIONES

EL PROVEEDOR declara que cuenta con la capacidad y experiencia para proporcionar servicios de [Tipo de servicio].

EL CLIENTE declara que requiere los servicios de EL PROVEEDOR para el evento a celebrarse el día [Fecha del evento] en [Ubicación del evento].

CLÁUSULAS

PRIMERA. OBJETO DEL CONTRATO
EL PROVEEDOR se compromete a prestar servicios de [Tipo de servicio] para [Número de personas] personas el día [Fecha del evento], con horario de [Hora de inicio] a [Hora de fin].

SEGUNDA. PRECIO Y FORMA DE PAGO
El precio total de los servicios será de [Monto total del evento]. EL CLIENTE deberá cubrir un anticipo del [Porcentaje de anticipo] ([Monto de anticipo]) al momento de la firma del presente contrato. El saldo restante deberá cubrirse a más tardar el día del evento.

TERCERA. CANCELACIÓN
En caso de cancelación por parte de EL CLIENTE con menos de [Días de cancelación] días de anticipación, EL PROVEEDOR reembolsará el [Porcentaje de reembolso] del anticipo.

CUARTA. OBLIGACIONES DEL PROVEEDOR
EL PROVEEDOR se obliga a proporcionar los servicios pactados en tiempo y forma, conforme a las especificaciones acordadas.

QUINTA. OBLIGACIONES DEL CLIENTE
EL CLIENTE se obliga a realizar los pagos en los plazos acordados y a proporcionar las facilidades necesarias para la prestación del servicio.

Leído el presente contrato, ambas partes lo firman de conformidad."""

// ==================== Event Staff Screen ====================

@OptIn(ExperimentalMaterial3Api::class)
@Composable
