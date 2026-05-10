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
import androidx.lifecycle.compose.collectAsStateWithLifecycle
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
                        EventDetailTopBarActions(
                            onEditClick = { onEditClick(event.id) },
                            onDuplicateClick = {
                                if (viewModel.prepareDuplicate()) {
                                    onDuplicateClick()
                                }
                            },
                            onDeleteClick = { showDeleteDialog = true }
                        )
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
                                onSharePdf = { file -> openPdfFile(context, file) }
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

