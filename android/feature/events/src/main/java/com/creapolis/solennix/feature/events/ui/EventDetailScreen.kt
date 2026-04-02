package com.creapolis.solennix.feature.events.ui

import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.component.*
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveDetailLayout
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.Client
import com.creapolis.solennix.core.model.DiscountType
import com.creapolis.solennix.core.model.EventEquipment
import com.creapolis.solennix.core.model.EventExtra
import com.creapolis.solennix.core.model.EventProduct
import com.creapolis.solennix.core.model.EventStatus
import com.creapolis.solennix.core.model.EventSupply
import com.creapolis.solennix.core.model.SupplySource
import com.creapolis.solennix.core.model.EventPhoto
import com.creapolis.solennix.core.model.extensions.asMXN
import com.creapolis.solennix.core.model.extensions.formatQuantity
import com.creapolis.solennix.core.model.extensions.toPaymentMethodLabel
import com.creapolis.solennix.core.network.UrlResolver
import coil3.compose.AsyncImage
import coil3.request.ImageRequest
import coil3.request.crossfade
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
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
    onSearchClick: () -> Unit = {},
    onChecklistClick: (String) -> Unit = {},
    onFinancesClick: (String) -> Unit = {},
    onPaymentsClick: (String) -> Unit = {},
    onProductsClick: (String) -> Unit = {},
    onExtrasClick: (String) -> Unit = {},
    onEquipmentClick: (String) -> Unit = {},
    onSuppliesClick: (String) -> Unit = {},
    onShoppingListClick: (String) -> Unit = {},
    onPhotosClick: (String) -> Unit = {},
    onContractPreviewClick: (String) -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val scrollState = rememberScrollState()
    val context = LocalContext.current
    var showPaymentModal by remember { mutableStateOf(false) }
    var paymentInitialAmount by remember { mutableStateOf<Double?>(null) }
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
            SolennixTopAppBar(
                title = { Text("Detalle del Evento") },
                onSearchClick = onSearchClick,
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
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    // Hub layout: Info + Financial cards side by side on tablet
                    AdaptiveDetailLayout(
                        left = {
                            // Event Info Card (header)
                            EventInfoCard(event = event)

                            // Client Info
                            ClientInfoHeader(
                                client = uiState.client,
                                onPhoneClick = { phone ->
                                    val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone"))
                                    context.startActivity(intent)
                                },
                                onEmailClick = { email ->
                                    val intent = Intent(Intent.ACTION_SENDTO, Uri.parse("mailto:$email"))
                                    context.startActivity(intent)
                                }
                            )

                            // Content navigation cards grid
                            ContentCardsGrid(
                                productsCount = uiState.products.size,
                                extrasCount = uiState.extras.size,
                                suppliesCount = uiState.supplies.size,
                                equipmentCount = uiState.equipment.size,
                                purchaseSuppliesCount = uiState.supplies.count { it.source == SupplySource.PURCHASE },
                                photosCount = uiState.photos.size,
                                onProductsClick = { onProductsClick(event.id) },
                                onExtrasClick = { onExtrasClick(event.id) },
                                onSuppliesClick = { onSuppliesClick(event.id) },
                                onEquipmentClick = { onEquipmentClick(event.id) },
                                onShoppingListClick = { onShoppingListClick(event.id) },
                                onPhotosClick = { onPhotosClick(event.id) }
                            )

                            // Photos preview strip (first 4 photos)
                            if (uiState.photos.isNotEmpty()) {
                                PhotosPreviewCard(
                                    photos = uiState.photos,
                                    onClick = { onPhotosClick(event.id) }
                                )
                            }
                        },
                        right = {
                            // Finance Summary Card (navigable)
                            FinanceSummaryCard(
                                event = event,
                                supplyCost = uiState.supplies.sumOf { it.quantity * it.unitCost },
                                onClick = { onFinancesClick(event.id) }
                            )

                            // Payment Summary Card (navigable)
                            PaymentSummaryCard(
                                event = event,
                                totalPaid = uiState.totalPaid,
                                paymentsCount = uiState.payments.size,
                                onClick = { onPaymentsClick(event.id) }
                            )

                            // Action Buttons
                            if (remaining > 0.01) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    PremiumButton(
                                        text = "Registrar Pago",
                                        onClick = {
                                            paymentInitialAmount = null
                                            showPaymentModal = true
                                        },
                                        modifier = Modifier.weight(1f),
                                        icon = Icons.Default.Add
                                    )

                                    val depositPct = event.depositPercent
                                    if (depositPct != null && depositPct > 0) {
                                        val depositTarget = event.totalAmount * depositPct / 100
                                        val depositRemaining = (depositTarget - uiState.totalPaid).coerceAtLeast(0.0)
                                        if (depositRemaining > 0) {
                                            OutlinedButton(
                                                onClick = {
                                                    paymentInitialAmount = depositRemaining
                                                    showPaymentModal = true
                                                },
                                                modifier = Modifier.weight(1f),
                                                shape = MaterialTheme.shapes.medium
                                            ) {
                                                Icon(Icons.Default.Savings, contentDescription = null, modifier = Modifier.size(18.dp))
                                                Spacer(modifier = Modifier.width(4.dp))
                                                Text("Anticipo")
                                            }
                                        }
                                    }
                                }
                            }

                            // Checklist link
                            ChecklistButton(onClick = { onChecklistClick(event.id) })

                            // Contract preview link
                            ContractPreviewButton(onClick = { onContractPreviewClick(event.id) })

                            // Status Change
                            StatusChangeSection(
                                currentStatus = event.status,
                                onStatusChange = { newStatus -> viewModel.updateEventStatus(newStatus) }
                            )

                            // Documents/PDFs
                            Text("Generar Documentos", style = MaterialTheme.typography.titleMedium)
                            DocumentActionsGrid(
                                uiState = uiState,
                                context = context,
                                onSharePdf = { file -> sharePdfFile(context, file) },
                                onChecklistClick = { onChecklistClick(event.id) },
                                onPhotosClick = {
                                    viewModel.loadPhotos()
                                    showPhotoGallery = true
                                }
                            )
                        }
                    )

                    // Bottom spacing
                    Spacer(modifier = Modifier.height(32.dp))
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
                    initialAmount = paymentInitialAmount,
                    onDismiss = { showPaymentModal = false },
                    onConfirm = { amount, method, notes, date ->
                        viewModel.addPayment(amount, method, notes, date)
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

// ==================== A. Client Info Header ====================

@Composable
private fun ClientInfoHeader(
    client: Client?,
    onPhoneClick: (String) -> Unit,
    onEmailClick: (String) -> Unit
) {
    if (client == null) return

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.medium
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Avatar(name = client.name, photoUrl = client.photoUrl, size = 48.dp)
                Spacer(modifier = Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = client.name,
                        style = MaterialTheme.typography.titleLarge,
                        color = SolennixTheme.colors.primaryText,
                        fontWeight = FontWeight.Bold
                    )
                    val clientCity = client.city
                    if (clientCity != null) {
                        Text(
                            text = clientCity,
                            style = MaterialTheme.typography.bodySmall,
                            color = SolennixTheme.colors.secondaryText
                        )
                    }
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
            HorizontalDivider(color = SolennixTheme.colors.secondaryText.copy(alpha = 0.2f))
            Spacer(modifier = Modifier.height(12.dp))

            // Phone
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { onPhoneClick(client.phone) }
                    .padding(vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    Icons.Default.Phone,
                    contentDescription = null,
                    tint = SolennixTheme.colors.primary,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(12.dp))
                Text(
                    text = client.phone,
                    style = MaterialTheme.typography.bodyMedium,
                    color = SolennixTheme.colors.primary
                )
            }

            // Email
            if (!client.email.isNullOrEmpty()) {
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onEmailClick(client.email!!) }
                        .padding(vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Default.Email,
                        contentDescription = null,
                        tint = SolennixTheme.colors.primary,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = client.email!!,
                        style = MaterialTheme.typography.bodyMedium,
                        color = SolennixTheme.colors.primary
                    )
                }
            }
        }
    }
}

// ==================== B. Event Info Card ====================

@Composable
private fun EventInfoCard(event: com.creapolis.solennix.core.model.Event) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.medium
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.Celebration,
                    contentDescription = null,
                    tint = SolennixTheme.colors.primary,
                    modifier = Modifier.size(24.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = event.serviceType,
                    style = MaterialTheme.typography.headlineSmall,
                    color = SolennixTheme.colors.primaryText,
                    fontWeight = FontWeight.Bold
                )
            }
            Spacer(modifier = Modifier.height(16.dp))

            // Date
            EventInfoRow(
                icon = Icons.Default.CalendarToday,
                label = "Fecha",
                value = event.eventDate
            )

            // Time
            val timeText = buildString {
                event.startTime?.let { append(it) }
                event.endTime?.let {
                    if (isNotEmpty()) append(" - ")
                    append(it)
                }
            }
            if (timeText.isNotEmpty()) {
                EventInfoRow(
                    icon = Icons.Default.Schedule,
                    label = "Horario",
                    value = timeText
                )
            }

            // Location
            if (!event.location.isNullOrEmpty()) {
                EventInfoRow(
                    icon = Icons.Default.LocationOn,
                    label = "Lugar",
                    value = buildString {
                        append(event.location)
                        event.city?.let {
                            if (it.isNotEmpty()) append(", $it")
                        }
                    }
                )
            }

            // Num people
            EventInfoRow(
                icon = Icons.Default.People,
                label = "Personas",
                value = "${event.numPeople}"
            )

            // Status
            Spacer(modifier = Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.Info,
                    contentDescription = null,
                    tint = SolennixTheme.colors.secondaryText,
                    modifier = Modifier.size(18.dp)
                )
                Spacer(modifier = Modifier.width(12.dp))
                StatusBadge(status = event.status.name)
            }

            // Notes
            if (!event.notes.isNullOrEmpty()) {
                Spacer(modifier = Modifier.height(12.dp))
                HorizontalDivider(color = SolennixTheme.colors.secondaryText.copy(alpha = 0.2f))
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = "Notas",
                    style = MaterialTheme.typography.labelMedium,
                    color = SolennixTheme.colors.secondaryText
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = event.notes!!,
                    style = MaterialTheme.typography.bodyMedium,
                    color = SolennixTheme.colors.primaryText
                )
            }
        }
    }
}

@Composable
private fun EventInfoRow(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            icon,
            contentDescription = null,
            tint = SolennixTheme.colors.secondaryText,
            modifier = Modifier.size(18.dp)
        )
        Spacer(modifier = Modifier.width(12.dp))
        Column {
            Text(
                text = label,
                style = MaterialTheme.typography.labelSmall,
                color = SolennixTheme.colors.secondaryText
            )
            Text(
                text = value,
                style = MaterialTheme.typography.bodyMedium,
                color = SolennixTheme.colors.primaryText
            )
        }
    }
}

// ==================== C. Products Section ====================

@Composable
private fun ProductsSection(
    products: List<EventProduct>,
    productNames: Map<String, String>
) {
    var expanded by remember { mutableStateOf(true) }
    val subtotal = products.sumOf { it.totalPrice ?: (it.quantity * it.unitPrice) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.medium
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { expanded = !expanded },
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.ShoppingBag,
                        contentDescription = null,
                        tint = SolennixTheme.colors.primary,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Productos (${products.size})",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                }
                Icon(
                    if (expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                    contentDescription = if (expanded) "Colapsar" else "Expandir",
                    tint = SolennixTheme.colors.secondaryText
                )
            }

            AnimatedVisibility(visible = expanded) {
                Column {
                    Spacer(modifier = Modifier.height(12.dp))
                    products.forEach { product ->
                        val name = productNames[product.productId] ?: "Producto"
                        val total = product.totalPrice ?: (product.quantity * product.unitPrice)
                        ProductRow(
                            name = name,
                            quantity = product.quantity,
                            unitPrice = product.unitPrice,
                            total = total
                        )
                    }
                    HorizontalDivider(
                        modifier = Modifier.padding(vertical = 8.dp),
                        color = SolennixTheme.colors.secondaryText.copy(alpha = 0.2f)
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "Subtotal Productos",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = subtotal.asMXN(),
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = SolennixTheme.colors.primary
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ProductRow(
    name: String,
    quantity: Double,
    unitPrice: Double,
    total: Double
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.Top
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = name,
                style = MaterialTheme.typography.bodyMedium,
                color = SolennixTheme.colors.primaryText,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = "${quantity.formatQuantity()} x ${unitPrice.asMXN()}",
                style = MaterialTheme.typography.bodySmall,
                color = SolennixTheme.colors.secondaryText
            )
        }
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = total.asMXN(),
            style = MaterialTheme.typography.bodyMedium,
            color = SolennixTheme.colors.primaryText,
            fontWeight = FontWeight.Medium
        )
    }
}

// ==================== D. Extras Section ====================

@Composable
private fun ExtrasSection(extras: List<EventExtra>) {
    var expanded by remember { mutableStateOf(true) }
    val subtotal = extras.sumOf { it.price }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.medium
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { expanded = !expanded },
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.AddCircleOutline,
                        contentDescription = null,
                        tint = SolennixTheme.colors.primary,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Extras (${extras.size})",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                }
                Icon(
                    if (expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                    contentDescription = if (expanded) "Colapsar" else "Expandir",
                    tint = SolennixTheme.colors.secondaryText
                )
            }

            AnimatedVisibility(visible = expanded) {
                Column {
                    Spacer(modifier = Modifier.height(12.dp))
                    extras.forEach { extra ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 6.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = extra.description,
                                style = MaterialTheme.typography.bodyMedium,
                                color = SolennixTheme.colors.primaryText,
                                modifier = Modifier.weight(1f),
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = extra.price.asMXN(),
                                style = MaterialTheme.typography.bodyMedium,
                                color = SolennixTheme.colors.primaryText,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                    HorizontalDivider(
                        modifier = Modifier.padding(vertical = 8.dp),
                        color = SolennixTheme.colors.secondaryText.copy(alpha = 0.2f)
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "Subtotal Extras",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = subtotal.asMXN(),
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = SolennixTheme.colors.primary
                        )
                    }
                }
            }
        }
    }
}

// ==================== E. Equipment Section ====================

@Composable
private fun EquipmentSection(equipment: List<EventEquipment>) {
    var expanded by remember { mutableStateOf(true) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.medium
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { expanded = !expanded },
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.Inventory2,
                        contentDescription = null,
                        tint = SolennixTheme.colors.primary,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Equipo (${equipment.size})",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                }
                Icon(
                    if (expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                    contentDescription = if (expanded) "Colapsar" else "Expandir",
                    tint = SolennixTheme.colors.secondaryText
                )
            }

            AnimatedVisibility(visible = expanded) {
                Column {
                    Spacer(modifier = Modifier.height(12.dp))
                    equipment.forEach { item ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = item.equipmentName ?: "Equipo",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = SolennixTheme.colors.primaryText
                                )
                                if (!item.notes.isNullOrEmpty()) {
                                    Text(
                                        text = item.notes!!,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = SolennixTheme.colors.secondaryText
                                    )
                                }
                            }
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "x${item.quantity}",
                                style = MaterialTheme.typography.bodyMedium,
                                color = SolennixTheme.colors.primary,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }
            }
        }
    }
}

// ==================== F. Supplies Section ====================

@Composable
private fun SuppliesSection(supplies: List<EventSupply>) {
    var expanded by remember { mutableStateOf(true) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.medium
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { expanded = !expanded },
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.LocalGroceryStore,
                        contentDescription = null,
                        tint = SolennixTheme.colors.primary,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Insumos (${supplies.size})",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                }
                Icon(
                    if (expanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                    contentDescription = if (expanded) "Colapsar" else "Expandir",
                    tint = SolennixTheme.colors.secondaryText
                )
            }

            AnimatedVisibility(visible = expanded) {
                Column {
                    Spacer(modifier = Modifier.height(12.dp))
                    supplies.forEach { supply ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 6.dp),
                            verticalAlignment = Alignment.Top
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = supply.supplyName ?: "Insumo",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = SolennixTheme.colors.primaryText
                                )
                                val sourceLabel = when (supply.source) {
                                    SupplySource.STOCK -> "Stock"
                                    SupplySource.PURCHASE -> "Comprar"
                                }
                                Text(
                                    text = "${supply.quantity.formatQuantity()} ${supply.unit ?: "pz"} | $sourceLabel",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = SolennixTheme.colors.secondaryText
                                )
                            }
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = supply.unitCost.asMXN(),
                                style = MaterialTheme.typography.bodyMedium,
                                color = SolennixTheme.colors.primaryText,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }
                }
            }
        }
    }
}

// ==================== G. Financial Breakdown Card ====================

@Composable
private fun FinancialBreakdownCard(
    event: com.creapolis.solennix.core.model.Event,
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

            // Subtotal products
            if (products.isNotEmpty()) {
                FinancialRow("Subtotal Productos", productsTotal.asMXN())
            }

            // Subtotal extras
            if (extras.isNotEmpty()) {
                FinancialRow("Subtotal Extras", extrasTotal.asMXN())
            }

            // Subtotal
            if (products.isNotEmpty() && extras.isNotEmpty()) {
                FinancialRow("Subtotal", subtotal.asMXN())
            }

            // Discount
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

            // IVA/Tax
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

            // Total
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

            // Paid
            FinancialRow(
                "Pagado",
                totalPaid.asMXN(),
                valueColor = SolennixTheme.colors.success
            )

            // Remaining
            FinancialRow(
                "Restante",
                remaining.asMXN(),
                valueColor = if (remaining > 0) SolennixTheme.colors.error else SolennixTheme.colors.success
            )

            // Payment Progress Bar
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
                    strokeCap = androidx.compose.ui.graphics.StrokeCap.Round
                )
            }

            // Deposit
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
private fun FinancialRow(
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

// ==================== H. Payments Section ====================

@Composable
private fun PaymentsSection(
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
            text = { Text("\u00bfEst\u00e1s seguro de que deseas eliminar este pago? El saldo se actualizar\u00e1 autom\u00e1ticamente.") },
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

// ==================== I. Checklist Button ====================

@Composable
private fun ChecklistButton(onClick: () -> Unit) {
    OutlinedButton(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.medium
    ) {
        Icon(
            Icons.AutoMirrored.Filled.PlaylistAddCheck,
            contentDescription = null,
            modifier = Modifier.size(20.dp)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text("Ver Checklist del Evento")
    }
}

@Composable
private fun ContractPreviewButton(onClick: () -> Unit) {
    OutlinedButton(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.medium,
        colors = ButtonDefaults.outlinedButtonColors(contentColor = SolennixTheme.colors.info)
    ) {
        Icon(
            Icons.AutoMirrored.Filled.Article,
            contentDescription = null,
            modifier = Modifier.size(20.dp)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text("Ver Contrato")
    }
}

// ==================== Status Change Section ====================

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
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.medium
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

// ==================== Documents Grid ====================

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
                            inventoryItems = emptyList(),
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
                            supplies = emptyList(),
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
                            inventoryItems = emptyList(),
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
    initialAmount: Double? = null,
    onDismiss: () -> Unit,
    onConfirm: (Double, String, String, String) -> Unit
) {
    val prefillAmount = initialAmount ?: if (remaining > 0) remaining else null
    var amount by remember { mutableStateOf(prefillAmount?.toString() ?: "") }
    var method by remember { mutableStateOf("efectivo") }
    var notes by remember { mutableStateOf("") }
    var paymentDate by remember { mutableStateOf(java.time.LocalDate.now().toString()) }
    var showDatePicker by remember { mutableStateOf(false) }
    val datePickerState = rememberDatePickerState(
        initialSelectedDateMillis = System.currentTimeMillis()
    )

    if (showDatePicker) {
        DatePickerDialog(
            onDismissRequest = { showDatePicker = false },
            confirmButton = {
                TextButton(onClick = {
                    datePickerState.selectedDateMillis?.let { millis ->
                        val instant = java.time.Instant.ofEpochMilli(millis)
                        val localDate = instant.atZone(java.time.ZoneId.systemDefault()).toLocalDate()
                        paymentDate = localDate.toString()
                    }
                    showDatePicker = false
                }) {
                    Text("Aceptar")
                }
            },
            dismissButton = {
                TextButton(onClick = { showDatePicker = false }) {
                    Text("Cancelar")
                }
            }
        ) {
            DatePicker(state = datePickerState)
        }
    }

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

            // Payment Date
            OutlinedTextField(
                value = paymentDate,
                onValueChange = {},
                label = { Text("Fecha de Pago") },
                readOnly = true,
                trailingIcon = {
                    IconButton(onClick = { showDatePicker = true }) {
                        Icon(Icons.Default.CalendarToday, contentDescription = "Seleccionar fecha")
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { showDatePicker = true }
            )
            Spacer(modifier = Modifier.height(16.dp))

            Text("M\u00e9todo de Pago", style = MaterialTheme.typography.labelMedium)
            Row(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("efectivo" to "Efectivo", "transferencia" to "Transferencia", "tarjeta" to "Tarjeta").forEach { (key, label) ->
                    FilterChip(
                        selected = method == key,
                        onClick = { method = key },
                        label = { Text(label) }
                    )
                }
            }
            Row(modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("cheque" to "Cheque", "otro" to "Otro").forEach { (key, label) ->
                    FilterChip(
                        selected = method == key,
                        onClick = { method = key },
                        label = { Text(label) }
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
                        onConfirm(amt, method, notes, paymentDate)
                    }
                },
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

// ==================== Hub Summary Cards ====================

@Composable
private fun FinanceSummaryCard(
    event: com.creapolis.solennix.core.model.Event,
    supplyCost: Double,
    onClick: () -> Unit
) {
    val netSales = event.totalAmount - event.taxAmount
    val profit = netSales - supplyCost
    val margin = if (netSales > 0) (profit / netSales) * 100 else 0.0

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.medium
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.BarChart,
                    contentDescription = null,
                    tint = SolennixTheme.colors.primary,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    "Finanzas",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Spacer(modifier = Modifier.weight(1f))
                Icon(
                    Icons.Default.ChevronRight,
                    contentDescription = "Ver detalle",
                    tint = SolennixTheme.colors.secondaryText,
                    modifier = Modifier.size(20.dp)
                )
            }

            Spacer(modifier = Modifier.height(12.dp))
            HorizontalDivider(color = SolennixTheme.colors.secondaryText.copy(alpha = 0.2f))
            Spacer(modifier = Modifier.height(12.dp))

            Row(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        "TOTAL",
                        style = MaterialTheme.typography.labelSmall,
                        color = SolennixTheme.colors.secondaryText
                    )
                    Text(
                        event.totalAmount.asMXN(),
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = SolennixTheme.colors.primary
                    )
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        "UTILIDAD",
                        style = MaterialTheme.typography.labelSmall,
                        color = SolennixTheme.colors.secondaryText
                    )
                    Text(
                        "${margin.toInt()}%",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = SolennixTheme.colors.success
                    )
                }
            }

            if (event.discount > 0) {
                Spacer(modifier = Modifier.height(4.dp))
                val discountLabel = if (event.discountType == DiscountType.PERCENT) {
                    "Descuento ${event.discount.toInt()}%"
                } else "Descuento"
                Text(discountLabel, style = MaterialTheme.typography.bodySmall, color = SolennixTheme.colors.error)
            }

            if (event.requiresInvoice) {
                Text(
                    "IVA ${event.taxRate.toInt()}%",
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText
                )
            }
        }
    }
}

@Composable
private fun PaymentSummaryCard(
    event: com.creapolis.solennix.core.model.Event,
    totalPaid: Double,
    paymentsCount: Int,
    onClick: () -> Unit
) {
    val remaining = (event.totalAmount - totalPaid).coerceAtLeast(0.0)
    val progress = if (event.totalAmount > 0) (totalPaid / event.totalAmount).coerceIn(0.0, 1.0) else 0.0

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.medium
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.Payments,
                    contentDescription = null,
                    tint = SolennixTheme.colors.success,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    "Pagos",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Spacer(modifier = Modifier.weight(1f))
                if (paymentsCount > 0) {
                    Surface(
                        shape = MaterialTheme.shapes.small,
                        color = SolennixTheme.colors.primary.copy(alpha = 0.1f)
                    ) {
                        Text(
                            "$paymentsCount",
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = SolennixTheme.colors.primary
                        )
                    }
                    Spacer(modifier = Modifier.width(4.dp))
                }
                Icon(
                    Icons.Default.ChevronRight,
                    contentDescription = "Ver detalle",
                    tint = SolennixTheme.colors.secondaryText,
                    modifier = Modifier.size(20.dp)
                )
            }

            Spacer(modifier = Modifier.height(12.dp))
            HorizontalDivider(color = SolennixTheme.colors.secondaryText.copy(alpha = 0.2f))
            Spacer(modifier = Modifier.height(12.dp))

            // Mini KPIs
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                MiniKpi(
                    label = "Pagado",
                    value = totalPaid.asMXN(),
                    color = SolennixTheme.colors.success,
                    modifier = Modifier.weight(1f)
                )
                MiniKpi(
                    label = "Saldo",
                    value = remaining.asMXN(),
                    color = if (remaining <= 0.01) SolennixTheme.colors.success else SolennixTheme.colors.error,
                    modifier = Modifier.weight(1f)
                )
            }

            // Progress bar
            Spacer(modifier = Modifier.height(8.dp))
            LinearProgressIndicator(
                progress = { progress.toFloat() },
                modifier = Modifier.fillMaxWidth().height(6.dp),
                color = SolennixTheme.colors.primary,
                trackColor = SolennixTheme.colors.secondaryText.copy(alpha = 0.15f),
                strokeCap = androidx.compose.ui.graphics.StrokeCap.Round
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                "${(progress * 100).toInt()}%",
                style = MaterialTheme.typography.labelSmall,
                color = SolennixTheme.colors.secondaryText,
                modifier = Modifier.align(Alignment.End)
            )

            // Deposit status
            val depositPct = event.depositPercent
            if (depositPct != null && depositPct > 0) {
                val depositAmount = event.totalAmount * depositPct / 100
                val isDepositMet = totalPaid >= (depositAmount - 0.1)
                Spacer(modifier = Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        if (isDepositMet) Icons.Default.CheckCircle else Icons.Default.Warning,
                        contentDescription = null,
                        tint = if (isDepositMet) SolennixTheme.colors.success else SolennixTheme.colors.warning,
                        modifier = Modifier.size(16.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        "Anticipo ${depositPct.toInt()}%: ${depositAmount.asMXN()}",
                        style = MaterialTheme.typography.bodySmall,
                        color = if (isDepositMet) SolennixTheme.colors.success else SolennixTheme.colors.warning
                    )
                }
            }
        }
    }
}

@Composable
private fun MiniKpi(
    label: String,
    value: String,
    color: androidx.compose.ui.graphics.Color,
    modifier: Modifier = Modifier
) {
    Surface(
        modifier = modifier,
        shape = MaterialTheme.shapes.small,
        color = color.copy(alpha = 0.1f)
    ) {
        Column(
            modifier = Modifier.padding(vertical = 8.dp, horizontal = 4.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                value,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Bold,
                color = color,
                maxLines = 1
            )
            Text(
                label,
                style = MaterialTheme.typography.labelSmall,
                color = SolennixTheme.colors.secondaryText
            )
        }
    }
}

@Composable
private fun ContentCardsGrid(
    productsCount: Int,
    extrasCount: Int,
    suppliesCount: Int,
    equipmentCount: Int,
    purchaseSuppliesCount: Int,
    photosCount: Int,
    onProductsClick: () -> Unit,
    onExtrasClick: () -> Unit,
    onSuppliesClick: () -> Unit,
    onEquipmentClick: () -> Unit,
    onShoppingListClick: () -> Unit,
    onPhotosClick: () -> Unit
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            SummaryNavCard(
                icon = Icons.Default.ShoppingBag,
                title = "Productos",
                count = productsCount,
                color = SolennixTheme.colors.primary,
                onClick = onProductsClick,
                modifier = Modifier.weight(1f)
            )
            SummaryNavCard(
                icon = Icons.Default.AddCircleOutline,
                title = "Extras",
                count = extrasCount,
                color = SolennixTheme.colors.info,
                onClick = onExtrasClick,
                modifier = Modifier.weight(1f)
            )
        }
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            SummaryNavCard(
                icon = Icons.Default.LocalGroceryStore,
                title = "Insumos",
                count = suppliesCount,
                color = SolennixTheme.colors.warning,
                onClick = onSuppliesClick,
                modifier = Modifier.weight(1f)
            )
            SummaryNavCard(
                icon = Icons.Default.Inventory2,
                title = "Equipo",
                count = equipmentCount,
                color = SolennixTheme.colors.success,
                onClick = onEquipmentClick,
                modifier = Modifier.weight(1f)
            )
        }
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            SummaryNavCard(
                icon = Icons.Default.ShoppingCart,
                title = "Compras",
                subtitle = if (purchaseSuppliesCount > 0) "$purchaseSuppliesCount por comprar" else null,
                color = SolennixTheme.colors.error,
                onClick = onShoppingListClick,
                modifier = Modifier.weight(1f)
            )
            SummaryNavCard(
                icon = Icons.Default.PhotoLibrary,
                title = "Fotos",
                count = photosCount,
                color = SolennixTheme.colors.primary,
                onClick = onPhotosClick,
                modifier = Modifier.weight(1f)
            )
        }
    }
}

@Composable
private fun PhotosPreviewCard(
    photos: List<EventPhoto>,
    onClick: () -> Unit
) {
    val context = LocalContext.current
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.medium
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    "Fotos",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = SolennixTheme.colors.text
                )
                Row(
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        "${photos.size}",
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                        color = SolennixTheme.colors.primary
                    )
                    Icon(
                        Icons.Default.ChevronRight,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = SolennixTheme.colors.textTertiary
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                photos.take(4).forEachIndexed { index, photo ->
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .aspectRatio(1.2f)
                            .clip(RoundedCornerShape(8.dp))
                    ) {
                        AsyncImage(
                            model = ImageRequest.Builder(context)
                                .data(UrlResolver.resolve(photo.url))
                                .crossfade(true)
                                .build(),
                            contentDescription = photo.caption,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize()
                        )
                        // "+N" overlay on last photo if more than 4
                        if (index == 3 && photos.size > 4) {
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .background(
                                        color = androidx.compose.ui.graphics.Color.Black.copy(alpha = 0.5f),
                                        shape = RoundedCornerShape(8.dp)
                                    ),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    "+${photos.size - 4}",
                                    style = MaterialTheme.typography.labelMedium,
                                    fontWeight = FontWeight.Bold,
                                    color = androidx.compose.ui.graphics.Color.White
                                )
                            }
                        }
                    }
                }
                // Fill remaining slots if < 4 photos to keep uniform sizing
                repeat(maxOf(0, 4 - photos.size)) {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
private fun SummaryNavCard(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    count: Int? = null,
    subtitle: String? = null,
    color: androidx.compose.ui.graphics.Color,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.clickable { onClick() },
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.medium
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(20.dp))
                Spacer(modifier = Modifier.weight(1f))
                if (count != null && count > 0) {
                    Surface(
                        shape = MaterialTheme.shapes.small,
                        color = color.copy(alpha = 0.1f)
                    ) {
                        Text(
                            "$count",
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp),
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = color
                        )
                    }
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                title,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
                color = SolennixTheme.colors.primaryText
            )
            if (subtitle != null) {
                Text(
                    subtitle,
                    style = MaterialTheme.typography.labelSmall,
                    color = SolennixTheme.colors.secondaryText
                )
            } else {
                Icon(
                    Icons.Default.ChevronRight,
                    contentDescription = null,
                    tint = SolennixTheme.colors.secondaryText,
                    modifier = Modifier.size(16.dp)
                )
            }
        }
    }
}

