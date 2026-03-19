package com.creapolis.solennix.feature.events.ui

import android.content.Intent
import android.widget.Toast
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Article
import androidx.compose.material.icons.automirrored.filled.PlaylistAddCheck
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.component.*
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.Client
import com.creapolis.solennix.core.model.EventStatus
import com.creapolis.solennix.feature.events.pdf.BudgetPdfGenerator
import com.creapolis.solennix.feature.events.pdf.ChecklistPdfGenerator
import com.creapolis.solennix.feature.events.pdf.ContractPdfGenerator
import com.creapolis.solennix.feature.events.pdf.EquipmentListPdfGenerator
import com.creapolis.solennix.feature.events.pdf.InvoicePdfGenerator
import com.creapolis.solennix.feature.events.pdf.PaymentReportPdfGenerator
import com.creapolis.solennix.feature.events.pdf.ShoppingListPdfGenerator
import com.creapolis.solennix.feature.events.viewmodel.EventDetailUiState
import com.creapolis.solennix.feature.events.viewmodel.EventDetailViewModel
import androidx.window.layout.FoldingFeature
import androidx.window.layout.WindowInfoTracker
import java.io.File

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EventDetailScreen(
    viewModel: EventDetailViewModel,
    onNavigateBack: () -> Unit,
    onEditClick: (String) -> Unit,
    onChecklistClick: (String) -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val scrollState = rememberScrollState()
    val context = LocalContext.current
    var showPaymentModal by remember { mutableStateOf(false) }
    var showPhotoGallery by remember { mutableStateOf(false) }
    var showDeleteDialog by remember { mutableStateOf(false) }

    val windowInfoTracker = WindowInfoTracker.getOrCreate(context)
    val windowLayoutInfo by windowInfoTracker.windowLayoutInfo(context as android.app.Activity)
        .collectAsState(initial = null)

    val foldingFeature = windowLayoutInfo?.displayFeatures
        ?.filterIsInstance<FoldingFeature>()
        ?.firstOrNull()

    val isTableTop = foldingFeature?.state == FoldingFeature.State.HALF_OPENED &&
            foldingFeature.orientation == FoldingFeature.Orientation.HORIZONTAL

    // Navigate back on delete success
    LaunchedEffect(viewModel.deleteSuccess) {
        if (viewModel.deleteSuccess) {
            onNavigateBack()
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Detalle del Evento") },
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                actions = {
                    uiState.event?.let { event ->
                        IconButton(onClick = { onEditClick(event.id) }) {
                            Icon(Icons.Default.Edit, contentDescription = "Edit")
                        }
                        IconButton(onClick = { showDeleteDialog = true }) {
                            Icon(Icons.Default.Delete, contentDescription = "Delete", tint = SolennixTheme.colors.error)
                        }
                    }
                }
            )
        }
    ) { padding ->
        if (uiState.isLoading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        } else if (uiState.errorMessage != null) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Text(uiState.errorMessage.orEmpty(), color = SolennixTheme.colors.error)
            }
        } else if (uiState.event != null) {
            val event = uiState.event ?: return@Scaffold
            val remaining = event.totalAmount - uiState.totalPaid

            val content = @Composable {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp)
                ) {
                    EventCard(event = event)
                    Spacer(modifier = Modifier.height(16.dp))

                    // Status Change Section
                    StatusChangeSection(
                        currentStatus = event.status,
                        onStatusChange = { newStatus -> viewModel.updateEventStatus(newStatus) }
                    )
                    Spacer(modifier = Modifier.height(16.dp))

                    // Financial Summary
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text("Finanzas", style = MaterialTheme.typography.titleMedium)
                            Spacer(modifier = Modifier.height(8.dp))
                            SummaryRow("Total del Evento", "$${event.totalAmount}", isTotal = true)
                            SummaryRow("Pagado", "$${uiState.totalPaid}", color = SolennixTheme.colors.success)
                            SummaryRow("Restante", "$${remaining}", color = if (remaining > 0) SolennixTheme.colors.error else SolennixTheme.colors.success)
                        }
                    }
                    Spacer(modifier = Modifier.height(16.dp))

                    // Action Buttons
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        PremiumButton(
                            text = "Registrar Pago",
                            onClick = { showPaymentModal = true },
                            modifier = Modifier.weight(1f),
                            icon = Icons.Default.Add
                        )
                    }

                    Spacer(modifier = Modifier.height(24.dp))
                    Text("Generar Documentos", style = MaterialTheme.typography.titleMedium)
                    Spacer(modifier = Modifier.height(12.dp))
                    DocumentActionsGrid(
                        uiState = uiState,
                        context = context,
                        onSharePdf = { file ->
                            sharePdfFile(context, file)
                        },
                        onChecklistClick = { onChecklistClick(event.id) },
                        onPhotosClick = {
                            viewModel.loadPhotos()
                            showPhotoGallery = true
                        }
                    )

                    Spacer(modifier = Modifier.height(24.dp))
                    if (uiState.payments.isNotEmpty()) {
                        Text("Historial de Pagos", style = MaterialTheme.typography.titleMedium)
                        Spacer(modifier = Modifier.height(8.dp))
                        uiState.payments.forEach { payment ->
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp),
                                colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.surface)
                            ) {
                                Row(
                                    modifier = Modifier.padding(16.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column {
                                        Text(payment.paymentDate, style = MaterialTheme.typography.bodySmall)
                                        Text(payment.paymentMethod.replaceFirstChar { it.uppercase() }, style = MaterialTheme.typography.labelMedium)
                                        if (!payment.notes.isNullOrEmpty()) {
                                            Text(payment.notes.orEmpty(), style = MaterialTheme.typography.bodySmall, color = SolennixTheme.colors.secondaryText)
                                        }
                                    }
                                    Text("$${payment.amount}", style = MaterialTheme.typography.titleMedium, color = SolennixTheme.colors.success)
                                }
                            }
                        }
                    }
                }
            }

            if (isTableTop) {
                Row(modifier = Modifier.padding(padding).fillMaxSize()) {
                    Box(modifier = Modifier.weight(1f).verticalScroll(scrollState)) {
                        content()
                    }
                }
            } else {
                Box(modifier = Modifier.padding(padding).fillMaxSize().verticalScroll(scrollState)) {
                    content()
                }
            }

            if (showPaymentModal) {
                PaymentModal(
                    remaining = remaining,
                    onDismiss = { showPaymentModal = false },
                    onConfirm = { amount, method, notes ->
                        viewModel.addPayment(amount, method, notes)
                        showPaymentModal = false
                        Toast.makeText(context, "Pago registrado", Toast.LENGTH_SHORT).show()
                    }
                )
            }

            if (showPhotoGallery) {
                PhotoGallerySheet(
                    photos = uiState.photos,
                    isLoading = uiState.isPhotosLoading,
                    isUploading = uiState.isPhotoUploading,
                    onDismiss = { showPhotoGallery = false },
                    onPhotoSelected = { uri ->
                        // For now, we just use the URI as a placeholder
                        // In production, you'd upload the image to a server and get a URL
                        viewModel.uploadPhoto(uri.toString())
                    },
                    onDeletePhoto = { photo ->
                        viewModel.deletePhoto(photo)
                    }
                )
            }

            if (showDeleteDialog) {
                AlertDialog(
                    onDismissRequest = { showDeleteDialog = false },
                    title = { Text("Eliminar evento") },
                    text = { Text("\u00bfEliminar este evento? Esta acci\u00f3n no se puede deshacer.") },
                    confirmButton = {
                        TextButton(
                            onClick = {
                                showDeleteDialog = false
                                viewModel.deleteEvent()
                            },
                            colors = ButtonDefaults.textButtonColors(contentColor = SolennixTheme.colors.error)
                        ) {
                            Text("Eliminar")
                        }
                    },
                    dismissButton = {
                        TextButton(onClick = { showDeleteDialog = false }) {
                            Text("Cancelar")
                        }
                    }
                )
            }
        }
    }
}

@Composable
fun StatusChangeSection(
    currentStatus: EventStatus,
    onStatusChange: (EventStatus) -> Unit
) {
    val statusOptions = listOf(
        EventStatus.QUOTED to "Cotizado",
        EventStatus.CONFIRMED to "Confirmado",
        EventStatus.COMPLETED to "Completado",
        EventStatus.CANCELLED to "Cancelado"
    )

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text("Estado del Evento", style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(12.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                statusOptions.forEach { (status, label) ->
                    FilterChip(
                        selected = currentStatus == status,
                        onClick = {
                            if (currentStatus != status) {
                                onStatusChange(status)
                            }
                        },
                        label = { Text(label, style = MaterialTheme.typography.labelSmall) },
                        modifier = Modifier.weight(1f),
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = when (status) {
                                EventStatus.QUOTED -> SolennixTheme.colors.primary.copy(alpha = 0.15f)
                                EventStatus.CONFIRMED -> SolennixTheme.colors.success.copy(alpha = 0.15f)
                                EventStatus.COMPLETED -> SolennixTheme.colors.primary.copy(alpha = 0.15f)
                                EventStatus.CANCELLED -> SolennixTheme.colors.error.copy(alpha = 0.15f)
                            },
                            selectedLabelColor = when (status) {
                                EventStatus.QUOTED -> SolennixTheme.colors.primary
                                EventStatus.CONFIRMED -> SolennixTheme.colors.success
                                EventStatus.COMPLETED -> SolennixTheme.colors.primary
                                EventStatus.CANCELLED -> SolennixTheme.colors.error
                            }
                        )
                    )
                }
            }
        }
    }
}

@Composable
fun EventCard(event: com.creapolis.solennix.core.model.Event) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.large
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                StatusBadge(status = event.status.name)
                Spacer(modifier = Modifier.weight(1f))
                Text(
                    text = event.eventDate,
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText
                )
            }
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = event.serviceType,
                style = MaterialTheme.typography.headlineSmall,
                color = SolennixTheme.colors.primaryText
            )
            Text(
                text = "${event.numPeople} personas",
                style = MaterialTheme.typography.bodyMedium,
                color = SolennixTheme.colors.secondaryText
            )
            if (!event.location.isNullOrEmpty()) {
                Spacer(modifier = Modifier.height(8.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.LocationOn, contentDescription = null, tint = SolennixTheme.colors.secondaryText, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(event.location.orEmpty(), style = MaterialTheme.typography.bodySmall, color = SolennixTheme.colors.secondaryText)
                }
            }
        }
    }
}

@Composable
private fun SummaryRow(label: String, value: String, isTotal: Boolean = false, color: androidx.compose.ui.graphics.Color = SolennixTheme.colors.primaryText) {
    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(
            text = label,
            style = if (isTotal) MaterialTheme.typography.titleMedium else MaterialTheme.typography.bodyMedium,
            fontWeight = if (isTotal) androidx.compose.ui.text.font.FontWeight.Bold else null
        )
        Text(
            text = value,
            style = if (isTotal) MaterialTheme.typography.titleMedium else MaterialTheme.typography.bodyMedium,
            color = if (isTotal) SolennixTheme.colors.primary else color,
            fontWeight = if (isTotal) androidx.compose.ui.text.font.FontWeight.Bold else null
        )
    }
}

@Composable
fun DocumentActionsGrid(
    uiState: EventDetailUiState,
    context: android.content.Context,
    onSharePdf: (File) -> Unit,
    onChecklistClick: () -> Unit = {},
    onPhotosClick: () -> Unit = {}
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

    Column(modifier = Modifier.fillMaxWidth()) {
        // First row
        Row(modifier = Modifier.fillMaxWidth()) {
            ActionButton(
                icon = Icons.Default.Description,
                label = "Cotizaci\u00f3n",
                modifier = Modifier.weight(1f),
                onClick = {
                    isGenerating = true
                    try {
                        val file = BudgetPdfGenerator.generate(
                            context = context,
                            event = event,
                            client = client,
                            products = uiState.products,
                            extras = uiState.extras,
                            user = uiState.currentUser
                        )
                        onSharePdf(file)
                    } catch (e: Exception) {
                        Toast.makeText(context, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                    }
                    isGenerating = false
                }
            )
            Spacer(modifier = Modifier.width(8.dp))
            ActionButton(
                icon = Icons.AutoMirrored.Filled.Article,
                label = "Contrato",
                modifier = Modifier.weight(1f),
                onClick = {
                    isGenerating = true
                    try {
                        val file = ContractPdfGenerator.generate(
                            context = context,
                            event = event,
                            client = client,
                            products = uiState.products,
                            extras = uiState.extras,
                            user = uiState.currentUser
                        )
                        onSharePdf(file)
                    } catch (e: Exception) {
                        Toast.makeText(context, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                    }
                    isGenerating = false
                }
            )
            Spacer(modifier = Modifier.width(8.dp))
            ActionButton(
                icon = Icons.Default.Checklist,
                label = "Checklist",
                modifier = Modifier.weight(1f),
                onClick = {
                    isGenerating = true
                    try {
                        val file = ChecklistPdfGenerator.generate(
                            context = context,
                            event = event,
                            client = client,
                            products = uiState.products,
                            inventoryItems = emptyList(), // TODO: Load inventory items
                            user = uiState.currentUser
                        )
                        onSharePdf(file)
                    } catch (e: Exception) {
                        Toast.makeText(context, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                    }
                    isGenerating = false
                }
            )
        }
        Spacer(modifier = Modifier.height(8.dp))
        // Second row
        Row(modifier = Modifier.fillMaxWidth()) {
            ActionButton(
                icon = Icons.Default.Payments,
                label = "Pagos",
                modifier = Modifier.weight(1f),
                onClick = {
                    isGenerating = true
                    try {
                        val file = PaymentReportPdfGenerator.generate(
                            context = context,
                            event = event,
                            client = client,
                            payments = uiState.payments,
                            user = uiState.currentUser
                        )
                        onSharePdf(file)
                    } catch (e: Exception) {
                        Toast.makeText(context, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                    }
                    isGenerating = false
                }
            )
            Spacer(modifier = Modifier.width(8.dp))
            ActionButton(
                icon = Icons.Default.Receipt,
                label = "Factura",
                modifier = Modifier.weight(1f),
                onClick = {
                    isGenerating = true
                    try {
                        val file = InvoicePdfGenerator.generate(
                            context = context,
                            event = event,
                            client = client,
                            products = uiState.products,
                            extras = uiState.extras,
                            payments = uiState.payments,
                            user = uiState.currentUser
                        )
                        onSharePdf(file)
                    } catch (e: Exception) {
                        Toast.makeText(context, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                    }
                    isGenerating = false
                }
            )
            Spacer(modifier = Modifier.width(8.dp))
            ActionButton(
                icon = Icons.Default.ShoppingCart,
                label = "Compras",
                modifier = Modifier.weight(1f),
                onClick = {
                    isGenerating = true
                    try {
                        val file = ShoppingListPdfGenerator.generate(
                            context = context,
                            event = event,
                            client = client,
                            supplies = emptyList(), // TODO: Load event supplies
                            user = uiState.currentUser
                        )
                        onSharePdf(file)
                    } catch (e: Exception) {
                        Toast.makeText(context, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                    }
                    isGenerating = false
                }
            )
        }
        Spacer(modifier = Modifier.height(8.dp))
        // Third row
        Row(modifier = Modifier.fillMaxWidth()) {
            ActionButton(
                icon = Icons.Default.Inventory2,
                label = "Equipo",
                modifier = Modifier.weight(1f),
                onClick = {
                    isGenerating = true
                    try {
                        val file = EquipmentListPdfGenerator.generate(
                            context = context,
                            event = event,
                            client = client,
                            inventoryItems = emptyList(), // TODO: Load inventory items
                            user = uiState.currentUser
                        )
                        onSharePdf(file)
                    } catch (e: Exception) {
                        Toast.makeText(context, "Error: ${e.message}", Toast.LENGTH_SHORT).show()
                    }
                    isGenerating = false
                }
            )
            Spacer(modifier = Modifier.width(8.dp))
            ActionButton(
                icon = Icons.AutoMirrored.Filled.PlaylistAddCheck,
                label = "Lista",
                modifier = Modifier.weight(1f),
                onClick = onChecklistClick
            )
            Spacer(modifier = Modifier.width(8.dp))
            ActionButton(
                icon = Icons.Default.PhotoLibrary,
                label = "Fotos",
                modifier = Modifier.weight(1f),
                onClick = onPhotosClick
            )
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

private fun sharePdfFile(context: android.content.Context, file: File) {
    try {
        val uri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            file
        )
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/pdf")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(intent, "Abrir PDF con..."))
    } catch (e: Exception) {
        Toast.makeText(context, "No hay aplicaci\u00f3n para abrir PDFs", Toast.LENGTH_SHORT).show()
    }
}

@Composable
fun ActionButton(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, modifier: Modifier, onClick: () -> Unit) {
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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PaymentModal(
    remaining: Double,
    onDismiss: () -> Unit,
    onConfirm: (Double, String, String) -> Unit
) {
    var amount by remember { mutableStateOf(if (remaining > 0) remaining.toString() else "") }
    var method by remember { mutableStateOf("efectivo") }
    var notes by remember { mutableStateOf("") }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxWidth()
        ) {
            Text("Registrar Pago", style = MaterialTheme.typography.titleLarge)
            Spacer(modifier = Modifier.height(16.dp))

            OutlinedTextField(
                value = amount,
                onValueChange = { amount = it },
                label = { Text("Monto") },
                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal),
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(modifier = Modifier.height(16.dp))

            Text("M\u00e9todo de Pago", style = MaterialTheme.typography.labelMedium)
            Row(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("efectivo", "transferencia", "tarjeta").forEach { opt ->
                    FilterChip(
                        selected = method == opt,
                        onClick = { method = opt },
                        label = { Text(opt.replaceFirstChar { it.uppercase() }) }
                    )
                }
            }

            OutlinedTextField(
                value = notes,
                onValueChange = { notes = it },
                label = { Text("Notas (Opcional)") },
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(modifier = Modifier.height(24.dp))

            PremiumButton(
                text = "Guardar Pago",
                onClick = {
                    val amt = amount.toDoubleOrNull()
                    if (amt != null && amt > 0) {
                        onConfirm(amt, method, notes)
                    }
                },
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}
