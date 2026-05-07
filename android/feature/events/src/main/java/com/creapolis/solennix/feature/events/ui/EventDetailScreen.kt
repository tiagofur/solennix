package com.creapolis.solennix.feature.events.ui

import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.animation.ExperimentalSharedTransitionApi
import com.creapolis.solennix.core.designsystem.util.LocalNavAnimatedVisibilityScope
import com.creapolis.solennix.core.designsystem.util.LocalSharedTransitionScope
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
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.core.content.FileProvider
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.compose.ui.res.stringResource
import com.creapolis.solennix.core.designsystem.R as DesignSystemR
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
import com.creapolis.solennix.feature.events.R
import coil3.compose.AsyncImage
import coil3.request.ImageRequest
import coil3.request.crossfade
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import com.creapolis.solennix.feature.events.viewmodel.EventDetailUiState
import com.creapolis.solennix.feature.events.viewmodel.EventDetailViewModel
import androidx.window.layout.FoldingFeature
import androidx.window.layout.WindowInfoTracker
import java.io.File

@OptIn(ExperimentalMaterial3Api::class, ExperimentalSharedTransitionApi::class)
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
    onContractPreviewClick: (String) -> Unit = {},
    onStaffClick: (String) -> Unit = {},
    onDuplicateClick: () -> Unit = {},
    sharedElementKey: String? = null
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val scrollState = rememberScrollState()
    val context = LocalContext.current
    var showPaymentModal by remember { mutableStateOf(false) }
    var paymentInitialAmount by remember { mutableStateOf<Double?>(null) }
    var showPhotoGallery by remember { mutableStateOf(false) }
    var showDeleteDialog by remember { mutableStateOf(false) }
    var showClientPortalSheet by remember { mutableStateOf(false) }
    var showMoreMenu by remember { mutableStateOf(false) }

    val windowInfoTracker = WindowInfoTracker.getOrCreate(context)
    val windowLayoutInfo by (context as? android.app.Activity)?.let { activity ->
        windowInfoTracker.windowLayoutInfo(activity)
    }?.collectAsStateWithLifecycle(initialValue = null) ?: remember { mutableStateOf(null) }

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

    val sts = LocalSharedTransitionScope.current
    val avs = LocalNavAnimatedVisibilityScope.current
    val sharedBoundsModifier: Modifier = if (sharedElementKey != null && sts != null && avs != null) {
        with(sts) {
            Modifier.sharedBounds(
                rememberSharedContentState(key = sharedElementKey),
                animatedVisibilityScope = avs
            )
        }
    } else Modifier

    Scaffold(
        modifier = sharedBoundsModifier,
        topBar = {
            SolennixTopAppBar(
                title = { Text(stringResource(R.string.events_detail_title)) },
                onSearchClick = onSearchClick,
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(DesignSystemR.string.cd_back)
                        )
                    }
                },
                actions = {
                    uiState.event?.let { event ->
                        Box {
                            IconButton(onClick = { showMoreMenu = true }) {
                                Icon(
                                    imageVector = Icons.Default.MoreVert,
                                    contentDescription = stringResource(R.string.events_detail_more_actions)
                                )
                            }
                            DropdownMenu(
                                expanded = showMoreMenu,
                                onDismissRequest = { showMoreMenu = false }
                            ) {
                                DropdownMenuItem(
                                    text = { Text(stringResource(R.string.events_detail_action_edit)) },
                                    leadingIcon = {
                                        Icon(Icons.Default.Edit, contentDescription = null)
                                    },
                                    onClick = {
                                        showMoreMenu = false
                                        onEditClick(event.id)
                                    }
                                )
                                DropdownMenuItem(
                                    text = { Text(stringResource(R.string.events_detail_action_duplicate)) },
                                    leadingIcon = {
                                        Icon(Icons.Default.ContentCopy, contentDescription = null)
                                    },
                                    onClick = {
                                        showMoreMenu = false
                                        if (viewModel.prepareDuplicate()) {
                                            onDuplicateClick()
                                        }
                                    }
                                )
                                DropdownMenuItem(
                                    text = { Text(stringResource(R.string.events_detail_action_share_whatsapp)) },
                                    leadingIcon = {
                                        Icon(Icons.Default.Share, contentDescription = null)
                                    },
                                    onClick = {
                                        showMoreMenu = false
                                        shareEventOnWhatsApp(
                                            context = context,
                                            event = event,
                                            client = uiState.client,
                                            totalPaid = uiState.totalPaid
                                        )
                                    }
                                )
                                HorizontalDivider()
                                DropdownMenuItem(
                                    text = {
                                        Text(
                                            stringResource(R.string.events_detail_action_delete),
                                            color = SolennixTheme.colors.error
                                        )
                                    },
                                    leadingIcon = {
                                        Icon(
                                            Icons.Default.Delete,
                                            contentDescription = null,
                                            tint = SolennixTheme.colors.error
                                        )
                                    },
                                    onClick = {
                                        showMoreMenu = false
                                        showDeleteDialog = true
                                    }
                                )
                            }
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
                            EventInfoCard(
                                event = event,
                                onStatusChange = { newStatus -> viewModel.updateEventStatus(newStatus) }
                            )

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
                                staffCount = uiState.staff.size,
                                onProductsClick = { onProductsClick(event.id) },
                                onExtrasClick = { onExtrasClick(event.id) },
                                onSuppliesClick = { onSuppliesClick(event.id) },
                                onEquipmentClick = { onEquipmentClick(event.id) },
                                onShoppingListClick = { onShoppingListClick(event.id) },
                                onPhotosClick = { onPhotosClick(event.id) },
                                onStaffClick = { onStaffClick(event.id) }
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

                            // Action Buttons — paridad con iOS: Registrar Pago
                            // + Liquidar en la misma fila, Anticipo como fila
                            // propia abajo si hay saldo de anticipo pendiente.
                            if (remaining > 0.01) {
                                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
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

                                        PremiumButton(
                                            text = "Liquidar ${remaining.asMXN()}",
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
                                        val depositRemaining = (depositTarget - uiState.totalPaid).coerceAtLeast(0.0)
                                        if (depositRemaining > 0) {
                                            OutlinedButton(
                                                onClick = {
                                                    paymentInitialAmount = depositRemaining
                                                    showPaymentModal = true
                                                },
                                                modifier = Modifier.fillMaxWidth(),
                                                shape = MaterialTheme.shapes.medium
                                            ) {
                                                Icon(
                                                    imageVector = Icons.Default.Savings,
                                                    contentDescription = stringResource(DesignSystemR.string.cd_savings),
                                                    modifier = Modifier.size(18.dp)
                                                )
                                                Spacer(modifier = Modifier.width(4.dp))
                                                Text("Anticipo ${depositRemaining.asMXN()}")
                                            }
                                        }
                                    }
                                }
                            }

                            // Quick nav cards
                            ChecklistButton(onClick = { onChecklistClick(event.id) })
                            ContractPreviewButton(onClick = { onContractPreviewClick(event.id) })
                            ClientPortalCard(onClick = { showClientPortalSheet = true })

                            // Documents/PDFs
                            Text("Generar Documentos", style = MaterialTheme.typography.titleMedium)
                            DocumentActionsGrid(
                                uiState = uiState,
                                context = context,
                                viewModel = viewModel,
                                onSharePdf = { file -> sharePdfFile(context, file) }
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
                        Toast.makeText(context, context.getString(R.string.events_detail_payments_add_success), Toast.LENGTH_SHORT).show()
                    }
                )
            }

            if (showClientPortalSheet) {
                val event = uiState.event
                if (event != null) {
                    ClientPortalShareBottomSheet(
                        eventId = event.id,
                        onDismiss = { showClientPortalSheet = false }
                    )
                }
            }

            if (showPhotoGallery) {
                PhotoGallerySheet(
                    photos = uiState.photos,
                    isLoading = uiState.isPhotosLoading,
                    isUploading = uiState.isPhotoUploading,
                    onDismiss = { showPhotoGallery = false },
                    onPhotoSelected = { uri ->
                        viewModel.uploadPhoto(context, uri)
                    },
                    onDeletePhoto = { photo ->
                        viewModel.deletePhoto(photo)
                    }
                )
            }

            if (showDeleteDialog) {
                AlertDialog(
                    onDismissRequest = { showDeleteDialog = false },
                    title = { Text(stringResource(R.string.events_detail_delete_title)) },
                    text = { Text(stringResource(R.string.events_detail_delete_message)) },
                    confirmButton = {
                        TextButton(
                            onClick = {
                                showDeleteDialog = false
                                viewModel.deleteEvent()
                            },
                            colors = ButtonDefaults.textButtonColors(contentColor = SolennixTheme.colors.error)
                        ) {
                            Text(stringResource(R.string.events_detail_action_delete))
                        }
                    },
                    dismissButton = {
                        TextButton(onClick = { showDeleteDialog = false }) {
                            Text(stringResource(R.string.events_list_cancel))
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
                Avatar(name = client.name, photoUrl = UrlResolver.resolve(client.photoUrl), size = 48.dp)
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
private fun EventInfoCard(
    event: com.creapolis.solennix.core.model.Event,
    onStatusChange: (EventStatus) -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.medium
    ) {
        Column(modifier = Modifier.padding(20.dp)) {
            // Header: date box + service type/status
            Row(verticalAlignment = Alignment.CenterVertically) {
                DateBox(event.eventDate)
                Spacer(modifier = Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = event.serviceType,
                        style = MaterialTheme.typography.titleLarge,
                        color = SolennixTheme.colors.primaryText,
                        fontWeight = FontWeight.Bold,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    StatusChangePill(
                        currentStatus = event.status,
                        onStatusChange = onStatusChange
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Quick info 2x2 grid
            val timeText = buildString {
                event.startTime?.let { append(it) }
                event.endTime?.let {
                    if (isNotEmpty()) append(" - ")
                    append(it)
                }
            }
            val locationText = buildString {
                event.location?.takeIf { it.isNotEmpty() }?.let { append(it) }
                event.city?.takeIf { it.isNotEmpty() }?.let {
                    if (isNotEmpty()) append(", ")
                    append(it)
                }
            }

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                QuickInfoItem(
                    icon = Icons.Default.CalendarToday,
                    label = "Fecha",
                    value = event.eventDate,
                    modifier = Modifier.weight(1f)
                )
                if (timeText.isNotEmpty()) {
                    QuickInfoItem(
                        icon = Icons.Default.Schedule,
                        label = "Horario",
                        value = timeText,
                        modifier = Modifier.weight(1f)
                    )
                } else {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
            Spacer(modifier = Modifier.height(10.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                QuickInfoItem(
                    icon = Icons.Default.People,
                    label = "Personas",
                    value = "${event.numPeople} PAX",
                    modifier = Modifier.weight(1f)
                )
                if (locationText.isNotEmpty()) {
                    QuickInfoItem(
                        icon = Icons.Default.LocationOn,
                        label = "Ubicación",
                        value = locationText,
                        modifier = Modifier.weight(1f)
                    )
                } else {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }

            // Notes
            if (!event.notes.isNullOrEmpty()) {
                Spacer(modifier = Modifier.height(16.dp))
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
private fun DateBox(dateString: String) {
    // Fallback to raw string splits so an unparseable date never blanks the card.
    val parsed = try {
        java.time.LocalDate.parse(dateString)
    } catch (e: Exception) {
        null
    }
    val month = parsed?.format(
        java.time.format.DateTimeFormatter.ofPattern("MMM", java.util.Locale("es", "ES"))
    )?.uppercase() ?: dateString.take(3).uppercase()
    val day = parsed?.dayOfMonth?.toString() ?: dateString.takeLast(2)

    Surface(
        shape = MaterialTheme.shapes.medium,
        color = SolennixTheme.colors.primary.copy(alpha = 0.12f),
        modifier = Modifier.size(64.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = month,
                style = MaterialTheme.typography.labelSmall,
                fontWeight = FontWeight.SemiBold,
                color = SolennixTheme.colors.primary
            )
            Text(
                text = day,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = SolennixTheme.colors.primaryText
            )
        }
    }
}

@Composable
private fun QuickInfoItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            icon,
            contentDescription = null,
            tint = SolennixTheme.colors.primary,
            modifier = Modifier.size(16.dp)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = label.uppercase(),
                style = MaterialTheme.typography.labelSmall,
                color = SolennixTheme.colors.tertiaryText
            )
            Text(
                text = value,
                style = MaterialTheme.typography.bodySmall,
                fontWeight = FontWeight.SemiBold,
                color = SolennixTheme.colors.primaryText,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
        }
    }
}

// ==================== C. Products Section ====================

@Composable
private fun ProductsSection(
    products: List<EventProduct>
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
                        val name = product.productName ?: "Producto"
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

// ==================== I. Quick Nav Cards ====================

@Composable
private fun NavLinkCard(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    tint: androidx.compose.ui.graphics.Color,
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
private fun ChecklistButton(onClick: () -> Unit) {
    NavLinkCard(
        icon = Icons.AutoMirrored.Filled.PlaylistAddCheck,
        label = "Checklist de Carga",
        tint = SolennixTheme.colors.primary,
        onClick = onClick
    )
}

@Composable
private fun ContractPreviewButton(onClick: () -> Unit) {
    NavLinkCard(
        icon = Icons.AutoMirrored.Filled.Article,
        label = "Ver Contrato",
        tint = SolennixTheme.colors.info,
        onClick = onClick
    )
}

@Composable
private fun ClientPortalCard(onClick: () -> Unit) {
    NavLinkCard(
        icon = Icons.Default.Link,
        label = stringResource(R.string.events_client_portal_title),
        tint = SolennixTheme.colors.primary,
        onClick = onClick
    )
}

// ==================== Status Change Section ====================

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
private fun statusColor(status: EventStatus): androidx.compose.ui.graphics.Color = when (status) {
    EventStatus.QUOTED -> SolennixTheme.colors.primary
    EventStatus.CONFIRMED -> SolennixTheme.colors.success
    EventStatus.COMPLETED -> SolennixTheme.colors.primary
    EventStatus.CANCELLED -> SolennixTheme.colors.error
}

// ==================== Documents Grid ====================

@Composable
fun DocumentActionsGrid(
    uiState: EventDetailUiState,
    context: android.content.Context,
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

    // Helper: fetches PDF bytes from backend on IO dispatcher, writes to a
    // temp file in cacheDir, then calls onSharePdf with the File.
    val downloadPdfAsync: (type: String, filename: String) -> Unit = { type, filename ->
        isGenerating = true
        scope.launch {
            try {
                val bytes = withContext(kotlinx.coroutines.Dispatchers.IO) {
                    viewModel.downloadEventPdf(type)
                }
                val file = withContext(kotlinx.coroutines.Dispatchers.IO) {
                    val f = File(context.cacheDir, filename)
                    f.writeBytes(bytes)
                    f
                }
                onSharePdf(file)
            } catch (e: Exception) {
                Toast.makeText(context, "Error descargando PDF: ${e.message}", Toast.LENGTH_SHORT).show()
            } finally {
                isGenerating = false
            }
        }
    }

    Column(modifier = Modifier.fillMaxWidth()) {
        // First row
        Row(modifier = Modifier.fillMaxWidth()) {
            ActionButton(
                icon = Icons.Default.Description,
                label = "Cotizaci\u00f3n",
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
        // Second row
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
        // Third row — only Equipo PDF remains here; Checklist, Fotos, Personal
        // and Portal moved to dedicated nav cards above.
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

private fun shareEventOnWhatsApp(
    context: android.content.Context,
    event: com.creapolis.solennix.core.model.Event,
    client: Client?,
    totalPaid: Double
) {
    val remaining = (event.totalAmount - totalPaid).coerceAtLeast(0.0)
    val clientName = client?.name ?: "Cliente"
    val locationParts = listOfNotNull(
        event.location?.takeIf { it.isNotBlank() },
        event.city?.takeIf { it.isNotBlank() }
    )

    val lines = buildList {
        add("*Resumen de Evento — Solennix*")
        add("")
        add("📋 *${event.serviceType}*")
        add("👤 Cliente: $clientName")
        add("📅 Fecha: ${event.eventDate}")
        add("👥 Personas: ${event.numPeople} PAX")
        if (locationParts.isNotEmpty()) {
            add("📍 Lugar: ${locationParts.joinToString(", ")}")
        }
        add("")
        add("💰 Total: ${event.totalAmount.asMXN()}")
        add("✅ Pagado: ${totalPaid.asMXN()}")
        if (remaining > 0.01) {
            add("⏳ Saldo pendiente: ${remaining.asMXN()}")
        }
    }

    val message = lines.joinToString("\n")

    // Try the WhatsApp-specific intent first. Falls back to a generic share
    // sheet if WhatsApp isn't installed so the user still gets somewhere useful.
    val whatsappIntent = Intent(Intent.ACTION_VIEW).apply {
        data = Uri.parse("https://wa.me/?text=${Uri.encode(message)}")
        setPackage("com.whatsapp")
    }
    try {
        context.startActivity(whatsappIntent)
    } catch (e: android.content.ActivityNotFoundException) {
        val shareIntent = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, message)
        }
        try {
            context.startActivity(Intent.createChooser(shareIntent, "Compartir resumen"))
        } catch (_: Exception) {
            Toast.makeText(context, "No hay aplicación para compartir", Toast.LENGTH_SHORT).show()
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
    staffCount: Int,
    onProductsClick: () -> Unit,
    onExtrasClick: () -> Unit,
    onSuppliesClick: () -> Unit,
    onEquipmentClick: () -> Unit,
    onShoppingListClick: () -> Unit,
    onPhotosClick: () -> Unit,
    onStaffClick: () -> Unit
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
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            SummaryNavCard(
                icon = Icons.Default.Group,
                title = "Personal",
                count = staffCount,
                color = SolennixTheme.colors.info,
                onClick = onStaffClick,
                modifier = Modifier.weight(1f)
            )
            Spacer(modifier = Modifier.weight(1f))
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
                    color = SolennixTheme.colors.primaryText
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
                        tint = SolennixTheme.colors.tertiaryText
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
                Icon(
                    imageVector = icon,
                    contentDescription = title, // Use title as description for nav cards
                    tint = color,
                    modifier = Modifier.size(20.dp)
                )
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
                    imageVector = Icons.Default.ChevronRight,
                    contentDescription = stringResource(DesignSystemR.string.cd_visibility),
                    tint = SolennixTheme.colors.secondaryText,
                    modifier = Modifier.size(16.dp)
                )
            }
        }
    }
}
