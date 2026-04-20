package com.creapolis.solennix.feature.events.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.horizontalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.component.*
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveCenteredContent
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveFormRow
import com.creapolis.solennix.core.designsystem.event.UiEventSnackbarHandler
import com.creapolis.solennix.core.designsystem.theme.LocalIsWideScreen
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.*
import com.creapolis.solennix.core.model.extensions.asMXN
import com.creapolis.solennix.feature.events.viewmodel.EventFormViewModel
import com.creapolis.solennix.feature.events.viewmodel.SelectedStaffAssignment
import kotlinx.coroutines.launch
import java.time.format.DateTimeFormatter
import java.util.UUID
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EventFormScreen(
    viewModel: EventFormViewModel,
    onSearchClick: () -> Unit = {},
    onNavigateBack: () -> Unit
) {
    val pagerState = rememberPagerState(pageCount = { 6 })
    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }

    UiEventSnackbarHandler(
        events = viewModel.uiEvents,
        snackbarHostState = snackbarHostState,
    )

    // Trigger suggestions when entering equipment/supplies steps
    LaunchedEffect(pagerState.currentPage) {
        when (pagerState.currentPage) {
            3 -> viewModel.fetchEquipmentSuggestions()
            4 -> viewModel.fetchSupplySuggestions()
        }
    }

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = { Text(if (viewModel.isEditMode) "Editar Evento" else "Nuevo Evento") },
                onSearchClick = onSearchClick,
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
        bottomBar = {
            // Hide step navigation when the form failed to load — the only valid action
            // is "Reintentar" (shown in the error card below).
            if (viewModel.loadError == null) {
                BottomStepNavigation(
                    currentPage = pagerState.currentPage,
                    totalPages = 6,
                    onNext = {
                        val error = viewModel.validateStep(pagerState.currentPage)
                        if (error != null) {
                            viewModel.saveError = error
                        } else if (pagerState.currentPage < 5) {
                            scope.launch {
                                pagerState.animateScrollToPage(pagerState.currentPage + 1)
                            }
                        } else {
                            viewModel.saveEvent()
                        }
                    },
                    onBack = {
                        scope.launch {
                            pagerState.animateScrollToPage(pagerState.currentPage - 1)
                        }
                    },
                    isLoading = viewModel.isLoading,
                    isEditMode = viewModel.isEditMode
                )
            }
        }
    ) { padding ->
        val loadError = viewModel.loadError
        when {
            loadError != null -> {
                EventLoadErrorCard(
                    message = loadError,
                    onRetry = { viewModel.retryLoad() },
                    onNavigateBack = onNavigateBack,
                    modifier = Modifier.padding(padding),
                )
            }
            else -> {
                Column(modifier = Modifier.padding(padding)) {
                    LinearProgressIndicator(
                        progress = { (pagerState.currentPage + 1) / 6f },
                        modifier = Modifier.fillMaxWidth(),
                        color = SolennixTheme.colors.primary
                    )

                    HorizontalPager(
                        state = pagerState,
                        modifier = Modifier.fillMaxSize(),
                        userScrollEnabled = false
                    ) { page ->
                        when (page) {
                            0 -> StepGeneralInfo(viewModel)
                            1 -> StepProducts(viewModel)
                            2 -> StepExtras(viewModel)
                            3 -> StepEquipment(viewModel)
                            4 -> StepSupplies(viewModel)
                            5 -> StepSummary(viewModel, isEditMode = viewModel.isEditMode)
                        }
                    }
                }
            }
        }
    }

    if (viewModel.saveSuccess) {
        LaunchedEffect(Unit) { onNavigateBack() }
    }

    viewModel.saveError?.let { error ->
        AlertDialog(
            onDismissRequest = { viewModel.saveError = null },
            title = { Text("Error") },
            text = { Text(error) },
            confirmButton = {
                TextButton(onClick = { viewModel.saveError = null }) {
                    Text("OK")
                }
            }
        )
    }
}

/**
 * Full-screen error state shown when `loadExistingEvent` fails. Replaces the form steps
 * so the user can't interact with an empty/stale form pretending everything is fine.
 */
@Composable
private fun EventLoadErrorCard(
    message: String,
    onRetry: () -> Unit,
    onNavigateBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(
            imageVector = Icons.Default.CloudOff,
            contentDescription = null,
            modifier = Modifier.size(72.dp),
            tint = SolennixTheme.colors.secondaryText,
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = "No se pudo cargar el evento",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = SolennixTheme.colors.primaryText,
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = message,
            style = MaterialTheme.typography.bodyMedium,
            color = SolennixTheme.colors.secondaryText,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
        )
        Spacer(modifier = Modifier.height(24.dp))
        Button(
            onClick = onRetry,
            colors = ButtonDefaults.buttonColors(
                containerColor = SolennixTheme.colors.primary,
            ),
        ) {
            Icon(
                imageVector = Icons.Default.Refresh,
                contentDescription = null,
                modifier = Modifier.size(18.dp),
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text("Reintentar")
        }
        Spacer(modifier = Modifier.height(8.dp))
        TextButton(onClick = onNavigateBack) {
            Text("Volver")
        }
    }
}

@Composable
fun BottomStepNavigation(
    currentPage: Int,
    totalPages: Int = 6,
    onNext: () -> Unit,
    onBack: () -> Unit,
    isLoading: Boolean,
    isEditMode: Boolean = false
) {
    val isLastPage = currentPage == totalPages - 1
    Surface(
        modifier = Modifier.fillMaxWidth(),
        tonalElevation = 8.dp,
        shadowElevation = 16.dp
    ) {
        Row(
            modifier = Modifier
                .padding(16.dp)
                .fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            if (currentPage > 0) {
                OutlinedButton(onClick = onBack, modifier = Modifier.weight(1f)) {
                    Text("Anterior")
                }
                Spacer(modifier = Modifier.width(16.dp))
            }

            PremiumButton(
                text = if (isLastPage) (if (isEditMode) "Guardar Cambios" else "Finalizar") else "Siguiente",
                onClick = onNext,
                modifier = Modifier.weight(1f),
                icon = if (isLastPage) Icons.Default.Check else Icons.AutoMirrored.Filled.ArrowForward,
                isLoading = isLoading
            )
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StepGeneralInfo(viewModel: EventFormViewModel) {
    var showClientPicker by remember { mutableStateOf(false) }
    var showDatePicker by remember { mutableStateOf(false) }
    var showQuickClientDialog by remember { mutableStateOf(false) }

    val statusLabels = mapOf(
        EventStatus.QUOTED to "Cotizado",
        EventStatus.CONFIRMED to "Confirmado",
        EventStatus.COMPLETED to "Completado",
        EventStatus.CANCELLED to "Cancelado"
    )

    LazyColumn(modifier = Modifier.padding(24.dp)) {
        item {
            AdaptiveCenteredContent(maxWidth = 800.dp) {
            Column {
            Text("Información General", style = MaterialTheme.typography.headlineSmall)
            Spacer(modifier = Modifier.height(24.dp))

            // Client Selection
            Text("Cliente", style = MaterialTheme.typography.labelMedium, color = SolennixTheme.colors.secondaryText)
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { showClientPicker = true }
                    .padding(vertical = 8.dp),
                colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                border = androidx.compose.foundation.BorderStroke(1.dp, SolennixTheme.colors.borderLight)
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.Person, contentDescription = null, tint = SolennixTheme.colors.primary)
                    Spacer(modifier = Modifier.width(16.dp))
                    Text(
                        text = viewModel.selectedClient?.name ?: "Seleccionar cliente",
                        style = MaterialTheme.typography.bodyLarge,
                        color = if (viewModel.selectedClient == null) SolennixTheme.colors.secondaryText else SolennixTheme.colors.primaryText,
                        modifier = Modifier.weight(1f)
                    )
                    Icon(Icons.Default.ChevronRight, contentDescription = null, tint = SolennixTheme.colors.secondaryText)
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Date Selection
            Text("Fecha del Evento", style = MaterialTheme.typography.labelMedium, color = SolennixTheme.colors.secondaryText)
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { showDatePicker = true }
                    .padding(vertical = 8.dp),
                colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                border = androidx.compose.foundation.BorderStroke(1.dp, SolennixTheme.colors.borderLight)
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.CalendarToday, contentDescription = null, tint = SolennixTheme.colors.primary)
                    Spacer(modifier = Modifier.width(16.dp))
                    Text(
                        text = viewModel.eventDate.format(DateTimeFormatter.ofPattern("dd 'de' MMMM, yyyy", Locale("es", "MX"))),
                        style = MaterialTheme.typography.bodyLarge,
                        color = SolennixTheme.colors.primaryText,
                        modifier = Modifier.weight(1f)
                    )
                    Icon(Icons.Default.ChevronRight, contentDescription = null, tint = SolennixTheme.colors.secondaryText)
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            AdaptiveFormRow(
                left = {
                    SolennixTextField(
                        value = viewModel.startTime,
                        onValueChange = { viewModel.startTime = it },
                        label = "Hora Inicio",
                        placeholder = "14:00"
                    )
                },
                right = {
                    SolennixTextField(
                        value = viewModel.endTime,
                        onValueChange = { viewModel.endTime = it },
                        label = "Hora Fin",
                        placeholder = "20:00"
                    )
                }
            )

            Spacer(modifier = Modifier.height(16.dp))

            AdaptiveFormRow(
                left = {
                    SolennixTextField(
                        value = viewModel.serviceType,
                        onValueChange = { viewModel.serviceType = it },
                        label = "Tipo de Servicio",
                        placeholder = "Ej: Boda, XV Años"
                    )
                },
                right = {
                    SolennixTextField(
                        value = viewModel.numPeople,
                        onValueChange = { viewModel.numPeople = it },
                        label = "Personas",
                        placeholder = "0",
                        keyboardType = androidx.compose.ui.text.input.KeyboardType.Number
                    )
                }
            )

            Spacer(modifier = Modifier.height(16.dp))

            AdaptiveFormRow(
                left = {
                    SolennixTextField(
                        value = viewModel.location,
                        onValueChange = { viewModel.location = it },
                        label = "Lugar / Salon",
                        placeholder = "Ej: Salon Gardenia"
                    )
                },
                right = {
                    SolennixTextField(
                        value = viewModel.city,
                        onValueChange = { viewModel.city = it },
                        label = "Ciudad",
                        placeholder = "Ej: Mexico DF"
                    )
                }
            )

            Spacer(modifier = Modifier.height(16.dp))

            Text("Estado del Evento", style = MaterialTheme.typography.labelMedium, color = SolennixTheme.colors.secondaryText)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                EventStatus.entries.forEach { status ->
                    FilterChip(
                        selected = viewModel.status == status,
                        onClick = { viewModel.status = status },
                        label = { Text(statusLabels[status] ?: status.name) },
                        modifier = Modifier.weight(1f),
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = SolennixTheme.colors.primaryLight,
                            selectedLabelColor = SolennixTheme.colors.primary
                        )
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            SolennixTextField(
                value = viewModel.notes,
                onValueChange = { viewModel.notes = it },
                label = "Notas Adicionales",
                placeholder = "Instrucciones especiales para el montaje...",
                modifier = Modifier.height(120.dp)
            )
            }
            }
        }
    }

    if (showClientPicker) {
        val clients by viewModel.filteredClients.collectAsStateWithLifecycle()
        val searchQuery by viewModel.clientSearchQuery.collectAsStateWithLifecycle()

        ModalBottomSheet(
            onDismissRequest = { showClientPicker = false },
            containerColor = SolennixTheme.colors.background
        ) {
            Column(modifier = Modifier.padding(16.dp).fillMaxHeight(0.8f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Seleccionar Cliente", style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
                    TextButton(onClick = { showQuickClientDialog = true }) {
                        Icon(Icons.Default.Add, contentDescription = null)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Nuevo")
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { viewModel.onClientSearchQueryChange(it) },
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = { Text("Buscar cliente...") },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                    shape = RoundedCornerShape(12.dp)
                )
                Spacer(modifier = Modifier.height(16.dp))
                LazyColumn(modifier = Modifier.weight(1f)) {
                    items(clients) { client ->
                        ListItem(
                            headlineContent = { Text(client.name) },
                            supportingContent = { Text(client.phone) },
                            leadingContent = { 
                                Avatar(name = client.name, size = 40.dp)
                            },
                            modifier = Modifier.clickable {
                                viewModel.selectedClient = client
                                showClientPicker = false
                            }
                        )
                        HorizontalDivider(color = SolennixTheme.colors.divider)
                    }
                }
            }
        }
    }

    if (showDatePicker) {
        val datePickerState = rememberDatePickerState(
            initialSelectedDateMillis = viewModel.eventDate.atStartOfDay(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli()
        )
        DatePickerDialog(
            onDismissRequest = { showDatePicker = false },
            confirmButton = {
                TextButton(onClick = {
                    datePickerState.selectedDateMillis?.let {
                        viewModel.eventDate = java.time.Instant.ofEpochMilli(it).atZone(java.time.ZoneId.systemDefault()).toLocalDate()
                    }
                    showDatePicker = false
                }) { Text("Seleccionar") }
            }
        ) {
            DatePicker(state = datePickerState)
        }
    }

    if (showQuickClientDialog) {
        var name by remember { mutableStateOf("") }
        var email by remember { mutableStateOf("") }
        var phone by remember { mutableStateOf("") }

        AlertDialog(
            onDismissRequest = { showQuickClientDialog = false },
            title = { Text("Creacion Rapida de Cliente") },
            text = {
                Column {
                    SolennixTextField(value = name, onValueChange = { name = it }, label = "Nombre Completo")
                    Spacer(modifier = Modifier.height(8.dp))
                    SolennixTextField(value = email, onValueChange = { email = it }, label = "Email", keyboardType = androidx.compose.ui.text.input.KeyboardType.Email)
                    Spacer(modifier = Modifier.height(8.dp))
                    SolennixTextField(value = phone, onValueChange = { phone = it }, label = "Telefono", keyboardType = androidx.compose.ui.text.input.KeyboardType.Phone)
                    
                    viewModel.quickClientError?.let {
                        Text(it, color = SolennixTheme.colors.error, style = MaterialTheme.typography.bodySmall)
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = { 
                        viewModel.createQuickClient(name, email, phone)
                        if (viewModel.quickClientError == null) showQuickClientDialog = false
                    },
                    enabled = !viewModel.isCreatingClient
                ) {
                    if (viewModel.isCreatingClient) CircularProgressIndicator(modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                    else Text("Guardar")
                }
            },
            dismissButton = {
                TextButton(onClick = { showQuickClientDialog = false }) { Text("Cancelar") }
            }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StepProducts(viewModel: EventFormViewModel) {
    var showProductPicker by remember { mutableStateOf(false) }
    val isWideScreen = LocalIsWideScreen.current
    val availableProducts by viewModel.availableProducts.collectAsStateWithLifecycle()

    AdaptiveCenteredContent(maxWidth = 800.dp) {
    Column(modifier = Modifier.padding(24.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Productos y Menú", style = MaterialTheme.typography.headlineSmall, modifier = Modifier.weight(1f))
            IconButton(onClick = { showProductPicker = true }) {
                Icon(Icons.Default.AddCircle, contentDescription = "Añadir", tint = SolennixTheme.colors.primary)
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        if (viewModel.productLoadError != null) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.error.copy(alpha = 0.08f)),
                border = androidx.compose.foundation.BorderStroke(1.dp, SolennixTheme.colors.error.copy(alpha = 0.3f)),
                shape = MaterialTheme.shapes.medium
            ) {
                Column(modifier = Modifier.padding(12.dp)) {
                    Text(
                        viewModel.productLoadError ?: "Error cargando productos",
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.error
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    TextButton(onClick = { viewModel.retryLoadProducts() }) {
                        Text("Reintentar")
                    }
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
        }

        if (viewModel.selectedProducts.isEmpty()) {
            when {
                viewModel.isLoadingProducts && availableProducts.isEmpty() -> {
                    EmptyState(
                        icon = Icons.Default.HourglassEmpty,
                        title = "Cargando catálogo",
                        message = "Estamos obteniendo tus productos...",
                        actionText = "Actualizar",
                        onAction = { viewModel.retryLoadProducts() }
                    )
                }
                availableProducts.isEmpty() -> {
                    EmptyState(
                        icon = Icons.Default.RestaurantMenu,
                        title = "Sin productos disponibles",
                        message = "No hay productos en el catálogo para añadir al evento.",
                        actionText = "Reintentar",
                        onAction = { viewModel.retryLoadProducts() }
                    )
                }
                else -> {
                    EmptyState(
                        icon = Icons.Default.RestaurantMenu,
                        title = "Sin productos",
                        message = "Añade platos o servicios al evento para calcular el presupuesto.",
                        actionText = "Explorar Catálogo",
                        onAction = { showProductPicker = true }
                    )
                }
            }
        } else {
            LazyColumn(modifier = Modifier.fillMaxSize()) {
                if (isWideScreen) {
                    val chunkedProducts = viewModel.selectedProducts.chunked(2)
                    items(chunkedProducts.size) { index ->
                        val pair = chunkedProducts[index]
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                            Box(modifier = Modifier.weight(1f)) {
                                ProductSelectionItem(
                                    item = pair[0],
                                    availableProducts = availableProducts,
                                    onQuantityChange = { viewModel.updateProductQuantity(pair[0].productId, it) },
                                    onDiscountChange = { viewModel.updateProductDiscount(pair[0].productId, it) },
                                    onRemove = { viewModel.removeProduct(pair[0].productId) },
                                    onMoveUp = if (index * 2 > 0) { { viewModel.moveProduct(index * 2, index * 2 - 1) } } else null,
                                    onMoveDown = if (index * 2 < viewModel.selectedProducts.size - 1) { { viewModel.moveProduct(index * 2, index * 2 + 1) } } else null
                                )
                            }
                            if (pair.size > 1) {
                                Box(modifier = Modifier.weight(1f)) {
                                    ProductSelectionItem(
                                        item = pair[1],
                                        availableProducts = availableProducts,
                                        onQuantityChange = { viewModel.updateProductQuantity(pair[1].productId, it) },
                                        onDiscountChange = { viewModel.updateProductDiscount(pair[1].productId, it) },
                                        onRemove = { viewModel.removeProduct(pair[1].productId) },
                                        onMoveUp = { viewModel.moveProduct(index * 2 + 1, index * 2) },
                                        onMoveDown = if (index * 2 + 1 < viewModel.selectedProducts.size - 1) { { viewModel.moveProduct(index * 2 + 1, index * 2 + 2) } } else null
                                    )
                                }
                            } else {
                                Spacer(modifier = Modifier.weight(1f))
                            }
                        }
                    }
                } else {
                    items(viewModel.selectedProducts.size) { index ->
                        val item = viewModel.selectedProducts[index]
                        ProductSelectionItem(
                            item = item,
                            availableProducts = availableProducts,
                            onQuantityChange = { viewModel.updateProductQuantity(item.productId, it) },
                            onDiscountChange = { viewModel.updateProductDiscount(item.productId, it) },
                            onRemove = { viewModel.removeProduct(item.productId) },
                            onMoveUp = if (index > 0) { { viewModel.moveProduct(index, index - 1) } } else null,
                            onMoveDown = if (index < viewModel.selectedProducts.size - 1) { { viewModel.moveProduct(index, index + 1) } } else null
                        )
                    }
                }
            }
        }
    }
    }

    if (showProductPicker) {
        ProductPickerSheet(
            viewModel = viewModel,
            onDismiss = { showProductPicker = false },
            onProductSelected = { product ->
                viewModel.addProduct(product, 1.0)
                showProductPicker = false
            }
        )
    }
}

@Composable
fun ProductSelectionItem(
    item: com.creapolis.solennix.core.model.EventProduct,
    availableProducts: List<com.creapolis.solennix.core.model.Product>,
    onQuantityChange: (Double) -> Unit,
    onDiscountChange: (Double) -> Unit,
    onRemove: () -> Unit,
    onMoveUp: (() -> Unit)? = null,
    onMoveDown: (() -> Unit)? = null
) {
    val product = availableProducts.find { it.id == item.productId } ?: return
    var discountText by remember(item.discount) { mutableStateOf(if (item.discount > 0) item.discount.toString() else "") }
    val effectivePrice = item.unitPrice - item.discount
    val lineTotal = effectivePrice * item.quantity

    Card(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        border = androidx.compose.foundation.BorderStroke(1.dp, SolennixTheme.colors.borderLight),
        shape = MaterialTheme.shapes.medium
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (onMoveUp != null || onMoveDown != null) {
                    Column {
                        if (onMoveUp != null) {
                            IconButton(onClick = onMoveUp, modifier = Modifier.size(24.dp)) {
                                Icon(Icons.Default.KeyboardArrowUp, contentDescription = "Subir")
                            }
                        }
                        if (onMoveDown != null) {
                            IconButton(onClick = onMoveDown, modifier = Modifier.size(24.dp)) {
                                Icon(Icons.Default.KeyboardArrowDown, contentDescription = "Bajar")
                            }
                        }
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                }
                
                Column(modifier = Modifier.weight(1f)) {
                    Text(product.name, style = MaterialTheme.typography.titleSmall)
                    Text(item.unitPrice.asMXN(), style = MaterialTheme.typography.bodySmall, color = SolennixTheme.colors.primary)
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = { onQuantityChange(item.quantity - 1.0) }) {
                        Icon(Icons.Default.Remove, contentDescription = "Menos", modifier = Modifier.size(18.dp))
                    }
                    Text(item.quantity.toInt().toString(), style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(horizontal = 4.dp))
                    IconButton(onClick = { onQuantityChange(item.quantity + 1.0) }) {
                        Icon(Icons.Default.Add, contentDescription = "Mas", modifier = Modifier.size(18.dp))
                    }
                }

                IconButton(onClick = onRemove) {
                    Icon(Icons.Default.Delete, contentDescription = "Eliminar", tint = SolennixTheme.colors.error, modifier = Modifier.size(20.dp))
                }
            }

            // Per-product discount row
            Row(
                modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                OutlinedTextField(
                    value = discountText,
                    onValueChange = { value ->
                        discountText = value
                        val d = value.toDoubleOrNull() ?: 0.0
                        onDiscountChange(d)
                    },
                    label = { Text("Descuento", style = MaterialTheme.typography.labelSmall) },
                    modifier = Modifier.width(110.dp).height(52.dp),
                    textStyle = MaterialTheme.typography.bodySmall,
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal),
                    shape = MaterialTheme.shapes.small
                )
                Spacer(modifier = Modifier.width(12.dp))
                Text(
                    text = "Total: ${lineTotal.asMXN()}",
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.Bold,
                    color = if (item.discount > 0) SolennixTheme.colors.success else SolennixTheme.colors.primaryText
                )
            }
        }
    }
}

@Composable
fun StepExtras(viewModel: EventFormViewModel) {
    var showAddExtra by remember { mutableStateOf(false) }
    val isWideScreen = LocalIsWideScreen.current

    AdaptiveCenteredContent(maxWidth = 800.dp) {
    Column(modifier = Modifier.padding(24.dp)) {
        Text("Cargos Extras y Descuentos", style = MaterialTheme.typography.headlineSmall)
        Spacer(modifier = Modifier.height(24.dp))

        if (showAddExtra) {
            var extraDesc by remember { mutableStateOf("") }
            var extraCost by remember { mutableStateOf("") }
            var extraPrice by remember { mutableStateOf("") }
            var extraExcludeUtility by remember { mutableStateOf(false) }
            var extraIncludeInChecklist by remember { mutableStateOf(true) }

            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                border = androidx.compose.foundation.BorderStroke(1.dp, SolennixTheme.colors.primary)
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Nuevo Cargo Extra", style = MaterialTheme.typography.titleMedium)
                    Spacer(modifier = Modifier.height(16.dp))
                    SolennixTextField(value = extraDesc, onValueChange = { extraDesc = it }, label = "Descripcion")
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        SolennixTextField(
                            value = extraCost,
                            onValueChange = {
                                extraCost = it
                                if (extraExcludeUtility) extraPrice = it
                            },
                            label = "Costo",
                            keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal,
                            modifier = Modifier.weight(1f)
                        )
                        SolennixTextField(
                            value = extraPrice,
                            onValueChange = { if (!extraExcludeUtility) extraPrice = it },
                            label = "Precio",
                            keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal,
                            modifier = Modifier.weight(1f),
                            enabled = !extraExcludeUtility
                        )
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Checkbox(
                            checked = extraExcludeUtility,
                            onCheckedChange = { checked ->
                                extraExcludeUtility = checked
                                if (checked) extraPrice = extraCost
                            }
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Solo cobrar costo", style = MaterialTheme.typography.bodySmall)
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Checkbox(
                            checked = extraIncludeInChecklist,
                            onCheckedChange = { extraIncludeInChecklist = it }
                        )
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Incluir en checklist", style = MaterialTheme.typography.bodySmall)
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                    Row {
                        TextButton(onClick = {
                            showAddExtra = false
                            extraExcludeUtility = false
                            extraIncludeInChecklist = true
                        }) { Text("Cancelar") }
                        Spacer(modifier = Modifier.weight(1f))
                        Button(onClick = {
                            val c = extraCost.toDoubleOrNull() ?: 0.0
                            val p = extraPrice.toDoubleOrNull() ?: 0.0
                            viewModel.addExtra(extraDesc, c, p, extraExcludeUtility, extraIncludeInChecklist)
                            extraDesc = ""
                            extraCost = ""
                            extraPrice = ""
                            extraExcludeUtility = false
                            extraIncludeInChecklist = true
                            showAddExtra = false
                        }) { Text("Anadir") }
                    }
                }
            }
        } else {
            PremiumButton(
                text = "Anadir Cargo Extra",
                onClick = { showAddExtra = true },
                style = ButtonStyle.Secondary,
                icon = Icons.Default.Add
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        LazyColumn(modifier = Modifier.weight(1f)) {
            if (isWideScreen) {
                val chunkedExtras = viewModel.eventExtras.chunked(2)
                items(chunkedExtras.size) { index ->
                    val pair = chunkedExtras[index]
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        Box(modifier = Modifier.weight(1f)) {
                            ExtraCard(
                                extra = pair[0], 
                                onRemove = { viewModel.removeExtra(pair[0].id) },
                                onMoveUp = if (index * 2 > 0) { { viewModel.moveExtra(index * 2, index * 2 - 1) } } else null,
                                onMoveDown = if (index * 2 < viewModel.eventExtras.size - 1) { { viewModel.moveExtra(index * 2, index * 2 + 1) } } else null
                            )
                        }
                        if (pair.size > 1) {
                            Box(modifier = Modifier.weight(1f)) {
                                ExtraCard(
                                    extra = pair[1], 
                                    onRemove = { viewModel.removeExtra(pair[1].id) },
                                    onMoveUp = { viewModel.moveExtra(index * 2 + 1, index * 2) },
                                    onMoveDown = if (index * 2 + 1 < viewModel.eventExtras.size - 1) { { viewModel.moveExtra(index * 2 + 1, index * 2 + 2) } } else null
                                )
                            }
                        } else {
                            Spacer(modifier = Modifier.weight(1f))
                        }
                    }
                }
            } else {
                items(viewModel.eventExtras.size) { index ->
                    val extra = viewModel.eventExtras[index]
                    ExtraCard(
                        extra = extra,
                        onRemove = { viewModel.removeExtra(extra.id) },
                        onMoveUp = if (index > 0) { { viewModel.moveExtra(index, index - 1) } } else null,
                        onMoveDown = if (index < viewModel.eventExtras.size - 1) { { viewModel.moveExtra(index, index + 1) } } else null
                    )
                }
            }
        }

    }
}
}

@Composable
private fun ExtraCard(
    extra: com.creapolis.solennix.core.model.EventExtra,
    onRemove: () -> Unit,
    onMoveUp: (() -> Unit)? = null,
    onMoveDown: (() -> Unit)? = null
) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.medium
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                if (onMoveUp != null || onMoveDown != null) {
                    Column {
                        if (onMoveUp != null) {
                            IconButton(onClick = onMoveUp, modifier = Modifier.size(24.dp)) {
                                Icon(Icons.Default.KeyboardArrowUp, contentDescription = "Subir")
                            }
                        }
                        if (onMoveDown != null) {
                            IconButton(onClick = onMoveDown, modifier = Modifier.size(24.dp)) {
                                Icon(Icons.Default.KeyboardArrowDown, contentDescription = "Bajar")
                            }
                        }
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                }

                Column(modifier = Modifier.weight(1f)) {
                    Text(extra.description, style = MaterialTheme.typography.titleSmall)
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("Costo: ${extra.cost.asMXN()}", style = MaterialTheme.typography.bodySmall, color = SolennixTheme.colors.secondaryText)
                        Text("Precio: ${extra.price.asMXN()}", style = MaterialTheme.typography.bodySmall, color = SolennixTheme.colors.primary)
                    }
                    if (extra.excludeUtility) {
                        Text("Solo cobrar costo", style = MaterialTheme.typography.labelSmall, color = SolennixTheme.colors.warning)
                    }
                }
                IconButton(onClick = onRemove) {
                    Icon(Icons.Default.Close, contentDescription = "Quitar", tint = SolennixTheme.colors.error)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StepEquipment(viewModel: EventFormViewModel) {
    var showEquipmentPicker by remember { mutableStateOf(false) }
    val suggestions by viewModel.equipmentSuggestions.collectAsStateWithLifecycle()
    val conflicts by viewModel.equipmentConflicts.collectAsStateWithLifecycle()
    val isWideScreen = LocalIsWideScreen.current

    AdaptiveCenteredContent(maxWidth = 800.dp) {
        Column(
            modifier = Modifier
                .padding(24.dp)
                .verticalScroll(rememberScrollState())
        ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Equipamiento", style = MaterialTheme.typography.headlineSmall, modifier = Modifier.weight(1f))
                IconButton(onClick = { showEquipmentPicker = true }) {
                    Icon(Icons.Default.AddCircle, contentDescription = "Añadir", tint = SolennixTheme.colors.primary)
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Suggestions banner
            if (suggestions.isNotEmpty()) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.primary.copy(alpha = 0.08f)),
                    shape = MaterialTheme.shapes.medium
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Lightbulb, contentDescription = null, tint = SolennixTheme.colors.primary, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Sugerencias", style = MaterialTheme.typography.labelMedium, color = SolennixTheme.colors.primary)
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(
                            modifier = Modifier.horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            suggestions.forEach { suggestion ->
                                val alreadyAdded = viewModel.selectedEquipment.any { it.inventoryId == suggestion.id }
                                FilterChip(
                                    selected = alreadyAdded,
                                    onClick = { if (!alreadyAdded) viewModel.addEquipmentFromSuggestion(suggestion) },
                                    label = { Text("${suggestion.ingredientName} (${suggestion.suggestedQuantity.toInt()})") },
                                    leadingIcon = if (alreadyAdded) { { Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp)) } } else null
                                )
                            }
                        }
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))
            }

            // Conflict warnings
            if (conflicts.isNotEmpty()) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.error.copy(alpha = 0.08f)),
                    border = androidx.compose.foundation.BorderStroke(1.dp, SolennixTheme.colors.error.copy(alpha = 0.3f)),
                    shape = MaterialTheme.shapes.medium
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Warning, contentDescription = null, tint = SolennixTheme.colors.error, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Conflictos de disponibilidad", style = MaterialTheme.typography.labelMedium, color = SolennixTheme.colors.error)
                        }
                        Spacer(modifier = Modifier.height(6.dp))
                        conflicts.forEach { conflict ->
                            Text(
                                "${conflict.equipmentName} — ${conflict.serviceType}${if (!conflict.clientName.isNullOrBlank()) " (${conflict.clientName})" else ""}",
                                style = MaterialTheme.typography.bodySmall,
                                color = SolennixTheme.colors.error
                            )
                        }
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))
            }

            if (viewModel.selectedEquipment.isEmpty()) {
                EmptyState(
                    icon = Icons.Default.Build,
                    title = "Sin equipamiento (opcional)",
                    message = "Podés continuar sin equipo o añadirlo para planificación más precisa.",
                    actionText = "Añadir Equipamiento",
                    onAction = { showEquipmentPicker = true }
                )
            } else {
                // IMPORTANT: antes era LazyColumn.fillMaxSize(). Con el panel de
                // Personal debajo y verticalScroll en el Column padre, no
                // podemos anidar otro scroll vertical. El dataset es chico
                // (equipo asignado a un evento), no amerita lazy.
                Column(modifier = Modifier.fillMaxWidth()) {
                    if (isWideScreen) {
                        val chunked = viewModel.selectedEquipment.chunked(2)
                        chunked.forEach { pair ->
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                                Box(modifier = Modifier.weight(1f)) {
                                    EquipmentCard(
                                        equipment = pair[0],
                                        onQuantityChange = { viewModel.updateEquipmentQuantity(pair[0].inventoryId, it) },
                                        onRemove = { viewModel.removeEquipment(pair[0].inventoryId) }
                                    )
                                }
                                if (pair.size > 1) {
                                    Box(modifier = Modifier.weight(1f)) {
                                        EquipmentCard(
                                            equipment = pair[1],
                                            onQuantityChange = { viewModel.updateEquipmentQuantity(pair[1].inventoryId, it) },
                                            onRemove = { viewModel.removeEquipment(pair[1].inventoryId) }
                                        )
                                    }
                                } else {
                                    Spacer(modifier = Modifier.weight(1f))
                                }
                            }
                        }
                    } else {
                        viewModel.selectedEquipment.forEach { eq ->
                            EquipmentCard(
                                equipment = eq,
                                onQuantityChange = { viewModel.updateEquipmentQuantity(eq.inventoryId, it) },
                                onRemove = { viewModel.removeEquipment(eq.inventoryId) }
                            )
                        }
                    }
                }
            }

            // ===== Personal asignado =====
            // Phase 1: todos los planes pueden asignar staff. El fee es por
            // evento (no vive en Staff). Phase 2 activará el email notifier.
            Spacer(modifier = Modifier.height(24.dp))
            StaffAssignmentPanel(viewModel = viewModel)
        }
    }

    if (showEquipmentPicker) {
        EquipmentPickerSheet(
            viewModel = viewModel,
            onDismiss = { showEquipmentPicker = false }
        )
    }
}

@Composable
private fun EquipmentCard(
    equipment: EventEquipment,
    onQuantityChange: (Int) -> Unit,
    onRemove: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        border = androidx.compose.foundation.BorderStroke(1.dp, SolennixTheme.colors.borderLight),
        shape = MaterialTheme.shapes.medium
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(equipment.equipmentName ?: "Equipo", style = MaterialTheme.typography.titleSmall)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        if (equipment.unit != null) {
                            Text("Unidad: ${equipment.unit}", style = MaterialTheme.typography.bodySmall, color = SolennixTheme.colors.secondaryText)
                        }
                        if (equipment.currentStock != null) {
                            val currentStock = equipment.currentStock
                            if (currentStock != null) {
                                Text("Stock: ${currentStock.toInt()}", style = MaterialTheme.typography.bodySmall, color = SolennixTheme.colors.secondaryText)
                            }
                        }
                    }
                    Text(
                        "Sin costo — Activo reutilizable",
                        style = MaterialTheme.typography.labelSmall,
                        color = SolennixTheme.colors.secondaryText
                    )
                }
                IconButton(onClick = onRemove) {
                    Icon(Icons.Default.Close, contentDescription = "Quitar", tint = SolennixTheme.colors.error)
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                IconButton(
                    onClick = { onQuantityChange(equipment.quantity - 1) },
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(Icons.Default.Remove, contentDescription = "Menos")
                }
                Text(
                    "${equipment.quantity}",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                IconButton(
                    onClick = { onQuantityChange(equipment.quantity + 1) },
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Más")
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun EquipmentPickerSheet(
    viewModel: EventFormViewModel,
    onDismiss: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var searchQuery by remember { mutableStateOf("") }
    val equipment by viewModel.availableEquipment.collectAsStateWithLifecycle()
    val filtered = remember(searchQuery, equipment) {
        if (searchQuery.isBlank()) equipment
        else equipment.filter { it.ingredientName.contains(searchQuery, ignoreCase = true) }
    }
    val selectedIds = remember(viewModel.selectedEquipment.size) {
        viewModel.selectedEquipment.map { it.inventoryId }.toSet()
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = SolennixTheme.colors.card
    ) {
        Column(modifier = Modifier.padding(horizontal = 16.dp).padding(bottom = 16.dp)) {
            Text("Seleccionar Equipo", style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(bottom = 12.dp))
            SolennixTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                label = "Buscar equipo",
                leadingIcon = Icons.Default.Search,
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(modifier = Modifier.height(12.dp))
            LazyColumn(modifier = Modifier.heightIn(max = 400.dp)) {
                items(filtered.size) { index ->
                    val item = filtered[index]
                    val isSelected = selectedIds.contains(item.id)
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 3.dp)
                            .clickable {
                                if (!isSelected) {
                                    viewModel.addEquipment(item, 1)
                                }
                                onDismiss()
                            },
                        colors = CardDefaults.cardColors(
                            containerColor = if (isSelected) SolennixTheme.colors.primary.copy(alpha = 0.08f)
                            else SolennixTheme.colors.card
                        ),
                        shape = MaterialTheme.shapes.medium
                    ) {
                        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(item.ingredientName, style = MaterialTheme.typography.bodyLarge)
                                Text(
                                    "Disponible: ${item.currentStock.toInt()} ${item.unit}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = SolennixTheme.colors.secondaryText
                                )
                            }
                            if (isSelected) {
                                Icon(Icons.Default.CheckCircle, contentDescription = "Seleccionado", tint = SolennixTheme.colors.success, modifier = Modifier.size(20.dp))
                            }
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StepSupplies(viewModel: EventFormViewModel) {
    var showSupplyPicker by remember { mutableStateOf(false) }
    val suggestions by viewModel.supplySuggestions.collectAsStateWithLifecycle()
    val isWideScreen = LocalIsWideScreen.current

    AdaptiveCenteredContent(maxWidth = 800.dp) {
        Column(modifier = Modifier.padding(24.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Insumos", style = MaterialTheme.typography.headlineSmall, modifier = Modifier.weight(1f))
                IconButton(onClick = { showSupplyPicker = true }) {
                    Icon(Icons.Default.AddCircle, contentDescription = "Añadir", tint = SolennixTheme.colors.primary)
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Suggestions banner
            if (suggestions.isNotEmpty()) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.warning.copy(alpha = 0.08f)),
                    shape = MaterialTheme.shapes.medium
                ) {
                    Column(modifier = Modifier.padding(12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Lightbulb, contentDescription = null, tint = SolennixTheme.colors.warning, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Sugerencias por productos", style = MaterialTheme.typography.labelMedium, color = SolennixTheme.colors.warning)
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(
                            modifier = Modifier.horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            suggestions.forEach { suggestion ->
                                val alreadyAdded = viewModel.selectedSupplies.any { it.inventoryId == suggestion.id }
                                FilterChip(
                                    selected = alreadyAdded,
                                    onClick = { if (!alreadyAdded) viewModel.addSupplyFromSuggestion(suggestion) },
                                    label = { Text("${suggestion.ingredientName} (${String.format("%.1f", suggestion.suggestedQuantity)})") },
                                    leadingIcon = if (alreadyAdded) { { Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp)) } } else null
                                )
                            }
                        }
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))
            }

            if (viewModel.selectedSupplies.isEmpty()) {
                EmptyState(
                    icon = Icons.Default.Inventory2,
                    title = "Sin insumos (opcional)",
                    message = "Podés continuar sin insumos o añadirlos para costos más exactos.",
                    actionText = "Añadir Insumos",
                    onAction = { showSupplyPicker = true }
                )
            } else {
                // Cost summary
                Text(
                    "Costo insumos: ${viewModel.costSupplies.asMXN()}",
                    style = MaterialTheme.typography.labelMedium,
                    color = SolennixTheme.colors.secondaryText
                )
                Spacer(modifier = Modifier.height(8.dp))

                LazyColumn(modifier = Modifier.fillMaxSize()) {
                    if (isWideScreen) {
                        val chunked = viewModel.selectedSupplies.chunked(2)
                        items(chunked.size) { index ->
                            val pair = chunked[index]
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                                Box(modifier = Modifier.weight(1f)) {
                                    SupplyCard(
                                        supply = pair[0],
                                        onQuantityChange = { viewModel.updateSupplyQuantity(pair[0].inventoryId, it) },
                                        onSourceChange = { viewModel.updateSupplySource(pair[0].inventoryId, it) },
                                        onExcludeCostChange = { viewModel.updateSupplyExcludeCost(pair[0].inventoryId, it) },
                                        onRemove = { viewModel.removeSupply(pair[0].inventoryId) }
                                    )
                                }
                                if (pair.size > 1) {
                                    Box(modifier = Modifier.weight(1f)) {
                                        SupplyCard(
                                            supply = pair[1],
                                            onQuantityChange = { viewModel.updateSupplyQuantity(pair[1].inventoryId, it) },
                                            onSourceChange = { viewModel.updateSupplySource(pair[1].inventoryId, it) },
                                            onExcludeCostChange = { viewModel.updateSupplyExcludeCost(pair[1].inventoryId, it) },
                                            onRemove = { viewModel.removeSupply(pair[1].inventoryId) }
                                        )
                                    }
                                } else {
                                    Spacer(modifier = Modifier.weight(1f))
                                }
                            }
                        }
                    } else {
                        items(viewModel.selectedSupplies.size) { index ->
                            val supply = viewModel.selectedSupplies[index]
                            SupplyCard(
                                supply = supply,
                                onQuantityChange = { viewModel.updateSupplyQuantity(supply.inventoryId, it) },
                                onSourceChange = { viewModel.updateSupplySource(supply.inventoryId, it) },
                                onExcludeCostChange = { viewModel.updateSupplyExcludeCost(supply.inventoryId, it) },
                                onRemove = { viewModel.removeSupply(supply.inventoryId) }
                            )
                        }
                    }
                }
            }
        }
    }

    if (showSupplyPicker) {
        SupplyPickerSheet(
            viewModel = viewModel,
            onDismiss = { showSupplyPicker = false }
        )
    }
}

@Composable
private fun SupplyCard(
    supply: EventSupply,
    onQuantityChange: (Double) -> Unit,
    onSourceChange: (SupplySource) -> Unit,
    onExcludeCostChange: (Boolean) -> Unit,
    onRemove: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        border = androidx.compose.foundation.BorderStroke(1.dp, SolennixTheme.colors.borderLight),
        shape = MaterialTheme.shapes.medium
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(supply.supplyName ?: "Insumo", style = MaterialTheme.typography.titleSmall)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        if (supply.unit != null) {
                            Text("Unidad: ${supply.unit}", style = MaterialTheme.typography.bodySmall, color = SolennixTheme.colors.secondaryText)
                        }
                        val currentStock = supply.currentStock
                        if (currentStock != null) {
                            Text(
                                "Stock: ${String.format("%.1f", currentStock)}",
                                style = MaterialTheme.typography.bodySmall,
                                color = if (currentStock >= supply.quantity) SolennixTheme.colors.success else SolennixTheme.colors.error
                            )
                        }
                    }
                    Text(
                        "Costo: ${supply.unitCost.asMXN()} × ${String.format("%.1f", supply.quantity)} = ${(supply.unitCost * supply.quantity).asMXN()}",
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.primary
                    )
                }
                IconButton(onClick = onRemove) {
                    Icon(Icons.Default.Close, contentDescription = "Quitar", tint = SolennixTheme.colors.error)
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Quantity controls
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                IconButton(
                    onClick = { onQuantityChange((supply.quantity - 0.5).coerceAtLeast(0.5)) },
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(Icons.Default.Remove, contentDescription = "Menos")
                }
                Text(
                    String.format("%.1f", supply.quantity),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )
                IconButton(
                    onClick = { onQuantityChange(supply.quantity + 0.5) },
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Más")
                }

                Spacer(modifier = Modifier.width(12.dp))

                // Source toggle
                FilterChip(
                    selected = supply.source == SupplySource.STOCK,
                    onClick = { onSourceChange(SupplySource.STOCK) },
                    label = { Text("Stock") }
                )
                FilterChip(
                    selected = supply.source == SupplySource.PURCHASE,
                    onClick = { onSourceChange(SupplySource.PURCHASE) },
                    label = { Text("Compra") }
                )
            }

            // Exclude cost (only for stock items)
            if (supply.source == SupplySource.STOCK) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(
                        checked = supply.excludeCost,
                        onCheckedChange = { onExcludeCostChange(it) }
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Sin costo (reaprovechado)", style = MaterialTheme.typography.bodySmall)
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SupplyPickerSheet(
    viewModel: EventFormViewModel,
    onDismiss: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var searchQuery by remember { mutableStateOf("") }
    val supplies by viewModel.availableSupplies.collectAsStateWithLifecycle()
    val filtered = remember(searchQuery, supplies) {
        if (searchQuery.isBlank()) supplies
        else supplies.filter { it.ingredientName.contains(searchQuery, ignoreCase = true) }
    }
    val selectedIds = remember(viewModel.selectedSupplies.size) {
        viewModel.selectedSupplies.map { it.inventoryId }.toSet()
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = SolennixTheme.colors.card
    ) {
        Column(modifier = Modifier.padding(horizontal = 16.dp).padding(bottom = 16.dp)) {
            Text("Seleccionar Insumo", style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(bottom = 12.dp))
            SolennixTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                label = "Buscar insumo",
                leadingIcon = Icons.Default.Search,
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(modifier = Modifier.height(12.dp))
            LazyColumn(modifier = Modifier.heightIn(max = 400.dp)) {
                items(filtered.size) { index ->
                    val item = filtered[index]
                    val isSelected = selectedIds.contains(item.id)
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 3.dp)
                            .clickable {
                                if (!isSelected) {
                                    viewModel.addSupply(item, 1.0)
                                }
                                onDismiss()
                            },
                        colors = CardDefaults.cardColors(
                            containerColor = if (isSelected) SolennixTheme.colors.primary.copy(alpha = 0.08f)
                            else SolennixTheme.colors.card
                        ),
                        shape = MaterialTheme.shapes.medium
                    ) {
                        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(item.ingredientName, style = MaterialTheme.typography.bodyLarge)
                                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                                    Text(
                                        "Stock: ${String.format("%.1f", item.currentStock)} ${item.unit}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = SolennixTheme.colors.secondaryText
                                    )
                                    val unitCost = item.unitCost
                                    if (unitCost != null) {
                                        Text(
                                            "Costo: ${unitCost.asMXN()}/${item.unit}",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = SolennixTheme.colors.primary
                                        )
                                    }
                                }
                            }
                            if (isSelected) {
                                Icon(Icons.Default.CheckCircle, contentDescription = "Seleccionado", tint = SolennixTheme.colors.success, modifier = Modifier.size(20.dp))
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun StepSummary(viewModel: EventFormViewModel, isEditMode: Boolean) {
    val depositPct = viewModel.depositPercent.toDoubleOrNull() ?: 0.0
    val depositAmount = viewModel.total * depositPct / 100

    AdaptiveCenteredContent(maxWidth = 800.dp) {
        Column(
            modifier = Modifier
                .padding(24.dp)
                .verticalScroll(rememberScrollState())
        ) {
            Text("Finanzas y Resumen", style = MaterialTheme.typography.headlineSmall)
            Spacer(modifier = Modifier.height(20.dp))

            // Discount section
            Text("Descuento", style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(8.dp))
            AdaptiveFormRow(
                left = {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        FilterChip(
                            selected = viewModel.discountType == DiscountType.PERCENT,
                            onClick = { viewModel.discountType = DiscountType.PERCENT },
                            label = { Text("%") }
                        )
                        FilterChip(
                            selected = viewModel.discountType == DiscountType.FIXED,
                            onClick = { viewModel.discountType = DiscountType.FIXED },
                            label = { Text("$") }
                        )
                    }
                },
                right = {
                    SolennixTextField(
                        value = viewModel.discount,
                        onValueChange = { viewModel.discount = it },
                        label = if (viewModel.discountType == DiscountType.PERCENT) "Descuento (%)" else "Descuento ($)",
                        keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal
                    )
                }
            )

            Spacer(modifier = Modifier.height(20.dp))

            // Invoice / Tax section
            Text("Facturación", style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Requiere Factura (IVA)", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
                Switch(
                    checked = viewModel.requiresInvoice,
                    onCheckedChange = { viewModel.requiresInvoice = it }
                )
            }
            if (viewModel.requiresInvoice) {
                Spacer(modifier = Modifier.height(8.dp))
                SolennixTextField(
                    value = viewModel.taxRate,
                    onValueChange = { viewModel.taxRate = it },
                    label = "Tasa IVA (%)",
                    keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal
                )
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Deposit section
            Text("Anticipo", style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(8.dp))
            AdaptiveFormRow(
                left = {
                    SolennixTextField(
                        value = viewModel.depositPercent,
                        onValueChange = { viewModel.depositPercent = it },
                        label = "Anticipo (%)",
                        keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal
                    )
                },
                right = {
                    Text(
                        "= ${depositAmount.asMXN()}",
                        style = MaterialTheme.typography.titleSmall,
                        color = SolennixTheme.colors.primary,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.padding(start = 12.dp, top = 16.dp)
                    )
                }
            )

            Spacer(modifier = Modifier.height(20.dp))

            // Cancellation policy
            Text("Política de Cancelación", style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(8.dp))
            AdaptiveFormRow(
                left = {
                    SolennixTextField(
                        value = viewModel.cancellationDays,
                        onValueChange = { viewModel.cancellationDays = it },
                        label = "Días de anticipación",
                        keyboardType = androidx.compose.ui.text.input.KeyboardType.Number
                    )
                },
                right = {
                    SolennixTextField(
                        value = viewModel.refundPercent,
                        onValueChange = { viewModel.refundPercent = it },
                        label = "Reembolso (%)",
                        keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal
                    )
                }
            )

            Spacer(modifier = Modifier.height(20.dp))

            // Notes
            Text("Notas", style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(8.dp))
            SolennixTextField(
                value = viewModel.notes,
                onValueChange = { viewModel.notes = it },
                label = "Notas del evento",
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Totals summary card
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                border = androidx.compose.foundation.BorderStroke(1.5.dp, SolennixTheme.colors.primary),
                shape = MaterialTheme.shapes.medium
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Resumen", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(12.dp))

                    if (viewModel.hasPendingProductCosts) {
                        Text(
                            "Algunos costos de productos siguen cargando. La rentabilidad puede ajustarse en segundos.",
                            style = MaterialTheme.typography.bodySmall,
                            color = SolennixTheme.colors.warning
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                    }

                    SummaryRow("Subtotal productos", viewModel.subtotalProducts.asMXN())
                    SummaryRow("Subtotal extras", viewModel.subtotalExtras.asMXN())

                    if (viewModel.discountAmount > 0) {
                        SummaryRow("Descuento", "-${viewModel.discountAmount.asMXN()}", valueColor = SolennixTheme.colors.error)
                    }

                    if (viewModel.requiresInvoice && viewModel.taxAmount > 0) {
                        val rate = viewModel.taxRate.toDoubleOrNull() ?: 0.0
                        SummaryRow("IVA (${String.format("%.0f", rate)}%)", "+${viewModel.taxAmount.asMXN()}")
                    }

                    HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = SolennixTheme.colors.borderLight)

                    Row(modifier = Modifier.fillMaxWidth()) {
                        Text("Total", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                        Text(viewModel.total.asMXN(), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = SolennixTheme.colors.primary)
                    }

                    Spacer(modifier = Modifier.height(4.dp))
                    SummaryRow("Anticipo (${String.format("%.0f", depositPct)}%)", depositAmount.asMXN(), valueColor = SolennixTheme.colors.primary)

                    HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = SolennixTheme.colors.borderLight)

                    // Profitability section
                    Text("Rentabilidad", style = MaterialTheme.typography.labelMedium, color = SolennixTheme.colors.secondaryText)
                    Spacer(modifier = Modifier.height(6.dp))
                    SummaryRow("Costos totales", viewModel.totalCosts.asMXN())
                    SummaryRow(
                        "Ganancia neta",
                        viewModel.netProfit.asMXN(),
                        valueColor = if (viewModel.netProfit >= 0) SolennixTheme.colors.success else SolennixTheme.colors.error
                    )
                    SummaryRow(
                        "Margen",
                        "${String.format("%.1f", viewModel.profitMargin)}%",
                        valueColor = if (viewModel.profitMargin >= 20) SolennixTheme.colors.success else SolennixTheme.colors.warning
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@Composable
private fun SummaryRow(
    label: String,
    value: String,
    valueColor: Color = Color.Unspecified
) {
    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp)) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = SolennixTheme.colors.secondaryText, modifier = Modifier.weight(1f))
        Text(value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium, color = valueColor)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductPickerSheet(
    viewModel: EventFormViewModel,
    onDismiss: () -> Unit,
    onProductSelected: (com.creapolis.solennix.core.model.Product) -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var searchQuery by remember { mutableStateOf("") }
    val products = viewModel.availableProducts.collectAsStateWithLifecycle()
    val filteredProducts = remember(searchQuery, products.value) {
        if (searchQuery.isBlank()) products.value
        else products.value.filter {
            it.name.contains(searchQuery, ignoreCase = true) ||
                it.category.contains(searchQuery, ignoreCase = true)
        }
    }
    val selectedIds = remember(viewModel.selectedProducts.size) {
        viewModel.selectedProducts.map { it.productId }.toSet()
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = SolennixTheme.colors.card
    ) {
        Column(modifier = Modifier.padding(horizontal = 16.dp).padding(bottom = 16.dp)) {
            Text(
                "Seleccionar Producto",
                style = MaterialTheme.typography.titleLarge,
                modifier = Modifier.padding(bottom = 12.dp)
            )
            SolennixTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                label = "Buscar producto",
                leadingIcon = Icons.Default.Search,
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(modifier = Modifier.height(12.dp))
            if (viewModel.isLoadingProducts && products.value.isEmpty()) {
                Text(
                    "Cargando productos...",
                    style = MaterialTheme.typography.bodyMedium,
                    color = SolennixTheme.colors.secondaryText
                )
            } else if (filteredProducts.isEmpty()) {
                EmptyState(
                    icon = Icons.Default.RestaurantMenu,
                    title = "Sin resultados",
                    message = "No encontramos productos con ese criterio.",
                    actionText = "Reintentar",
                    onAction = { viewModel.retryLoadProducts() }
                )
            } else {
                LazyColumn(modifier = Modifier.heightIn(max = 400.dp)) {
                    items(filteredProducts.size) { index ->
                        val product = filteredProducts[index]
                        val isSelected = selectedIds.contains(product.id)
                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 3.dp)
                                .clickable { onProductSelected(product) },
                            colors = CardDefaults.cardColors(
                                containerColor = if (isSelected) SolennixTheme.colors.primary.copy(alpha = 0.08f)
                                else SolennixTheme.colors.card
                            ),
                            shape = MaterialTheme.shapes.medium
                        ) {
                            Row(
                                modifier = Modifier.padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(product.name, style = MaterialTheme.typography.bodyLarge)
                                    Text(
                                        product.category,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = SolennixTheme.colors.secondaryText
                                    )
                                }
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    product.basePrice.asMXN(),
                                    style = MaterialTheme.typography.titleSmall,
                                    color = SolennixTheme.colors.primary,
                                    fontWeight = FontWeight.SemiBold
                                )
                                if (isSelected) {
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Icon(
                                        Icons.Default.CheckCircle,
                                        contentDescription = "Seleccionado",
                                        tint = SolennixTheme.colors.success,
                                        modifier = Modifier.size(20.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

// ==================== Staff Assignment Panel ====================
// Se renderiza al final de la página de equipamiento dentro del EventFormScreen.
// Phase 1: CRUD simple de asignaciones. El fee es por evento (vive en
// EventStaff, no en Staff). El texto ACLARA que el email notifier es Phase 2.

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun StaffAssignmentPanel(viewModel: EventFormViewModel) {
    var showStaffPicker by remember { mutableStateOf(false) }
    var showTeamPicker by remember { mutableStateOf(false) }
    val availableStaff by viewModel.availableStaff.collectAsStateWithLifecycle()

    Column(modifier = Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
                Icons.Default.Group,
                contentDescription = null,
                tint = SolennixTheme.colors.primary
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                "Personal asignado",
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.weight(1f)
            )
            IconButton(onClick = { showStaffPicker = true }) {
                Icon(
                    Icons.Default.AddCircle,
                    contentDescription = "Añadir colaborador",
                    tint = SolennixTheme.colors.primary
                )
            }
        }

        Spacer(modifier = Modifier.height(4.dp))
        Text(
            "Asigná colaboradores (fotógrafo, DJ, meseros, coordinador). El costo es opcional y se " +
                "registra por evento — el mismo colaborador puede cobrar distinto en cada uno.",
            style = MaterialTheme.typography.bodySmall,
            color = SolennixTheme.colors.secondaryText
        )

        Spacer(modifier = Modifier.height(12.dp))

        if (availableStaff.isEmpty()) {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = SolennixTheme.colors.primary.copy(alpha = 0.08f)
                ),
                shape = MaterialTheme.shapes.medium
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(
                        "Aún no tenés colaboradores en tu catálogo.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = SolennixTheme.colors.primaryText
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        "Agregá tu primer colaborador desde el menú Más → Personal.",
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.secondaryText
                    )
                }
            }
        } else if (viewModel.selectedStaff.isEmpty()) {
            Column(modifier = Modifier.fillMaxWidth()) {
                OutlinedButton(
                    onClick = { showStaffPicker = true },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Agregar colaborador")
                }
                Spacer(modifier = Modifier.height(8.dp))
                OutlinedButton(
                    onClick = {
                        viewModel.loadTeams()
                        showTeamPicker = true
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Icon(Icons.Default.Group, contentDescription = null, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Agregar equipo completo")
                }
            }
        } else {
            viewModel.selectedStaff.forEach { assignment ->
                StaffAssignmentCard(
                    assignment = assignment,
                    defaultStart = viewModel.startTime,
                    defaultEnd = viewModel.endTime,
                    onFeeChange = { viewModel.updateStaffFee(assignment.staffId, it) },
                    onRoleChange = { viewModel.updateStaffRoleOverride(assignment.staffId, it) },
                    onNotesChange = { viewModel.updateStaffNotes(assignment.staffId, it) },
                    onShiftChange = { start, end ->
                        viewModel.updateStaffShift(assignment.staffId, start, end)
                    },
                    onShiftClear = { viewModel.clearStaffShift(assignment.staffId) },
                    onStatusChange = { viewModel.updateStaffStatus(assignment.staffId, it) },
                    onRemove = { viewModel.removeStaffAssignment(assignment.staffId) }
                )
                Spacer(modifier = Modifier.height(8.dp))
            }

            if (viewModel.costStaff > 0) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    "Costo total de personal: ${viewModel.costStaff.asMXN()}",
                    style = MaterialTheme.typography.labelMedium,
                    color = SolennixTheme.colors.primary
                )
            }

            Spacer(modifier = Modifier.height(8.dp))
            OutlinedButton(
                onClick = {
                    viewModel.loadTeams()
                    showTeamPicker = true
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(Icons.Default.Group, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Agregar equipo completo")
            }
        }
    }

    if (showStaffPicker) {
        StaffPickerSheet(
            viewModel = viewModel,
            onDismiss = { showStaffPicker = false }
        )
    }

    if (showTeamPicker) {
        TeamPickerSheet(
            viewModel = viewModel,
            onDismiss = { showTeamPicker = false }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun StaffAssignmentCard(
    assignment: SelectedStaffAssignment,
    defaultStart: String,
    defaultEnd: String,
    onFeeChange: (Double?) -> Unit,
    onRoleChange: (String) -> Unit,
    onNotesChange: (String) -> Unit,
    onShiftChange: (java.time.LocalTime?, java.time.LocalTime?) -> Unit,
    onShiftClear: () -> Unit,
    onStatusChange: (AssignmentStatus) -> Unit,
    onRemove: () -> Unit
) {
    var feeText by remember(assignment.staffId) {
        mutableStateOf(assignment.feeAmount?.let { "%.2f".format(it) } ?: "")
    }

    val currentStatus = remember(assignment.status) {
        AssignmentStatus.fromString(assignment.status)
    }
    var shiftExpanded by remember(assignment.staffId) {
        mutableStateOf(!assignment.shiftStart.isNullOrBlank() || !assignment.shiftEnd.isNullOrBlank())
    }
    val zone = java.time.ZoneId.systemDefault()
    val startLocalTime = remember(assignment.shiftStart) {
        assignment.shiftStart?.let {
            try {
                java.time.Instant.parse(it).atZone(zone).toLocalTime()
            } catch (_: Exception) {
                null
            }
        }
    }
    val endLocalTime = remember(assignment.shiftEnd) {
        assignment.shiftEnd?.let {
            try {
                java.time.Instant.parse(it).atZone(zone).toLocalTime()
            } catch (_: Exception) {
                null
            }
        }
    }
    val defaultStartLocal = remember(defaultStart) { parseHHmmOrNull(defaultStart) }
    val defaultEndLocal = remember(defaultEnd) { parseHHmmOrNull(defaultEnd) }

    var showStartPicker by remember { mutableStateOf(false) }
    var showEndPicker by remember { mutableStateOf(false) }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.medium
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        assignment.staffName ?: "Colaborador",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                        color = SolennixTheme.colors.primaryText
                    )
                    if (!assignment.staffRoleLabel.isNullOrBlank()) {
                        Text(
                            assignment.staffRoleLabel,
                            style = MaterialTheme.typography.bodySmall,
                            color = SolennixTheme.colors.primary
                        )
                    }
                }
                IconButton(onClick = onRemove) {
                    Icon(
                        Icons.Default.Delete,
                        contentDescription = "Quitar",
                        tint = SolennixTheme.colors.error
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Status chips — sin confirmar / confirmado / rechazó / cancelado.
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                AssignmentStatus.values().forEach { opt ->
                    FilterChip(
                        selected = opt == currentStatus,
                        onClick = { onStatusChange(opt) },
                        label = { Text(opt.uiLabel()) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = opt.uiColor().copy(alpha = 0.18f),
                            selectedLabelColor = opt.uiColor()
                        )
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            AdaptiveFormRow(
                left = {
                    OutlinedTextField(
                        value = feeText,
                        onValueChange = { newValue ->
                            feeText = newValue
                            onFeeChange(newValue.replace(",", ".").toDoubleOrNull())
                        },
                        label = { Text("Costo (opcional)") },
                        keyboardOptions = KeyboardOptions(
                            keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal
                        ),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        prefix = { Text("$") }
                    )
                },
                right = {
                    OutlinedTextField(
                        value = assignment.roleOverride,
                        onValueChange = onRoleChange,
                        label = { Text("Rol en este evento (opcional)") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            )
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedTextField(
                value = assignment.notes,
                onValueChange = onNotesChange,
                label = { Text("Notas (opcional)") },
                modifier = Modifier.fillMaxWidth(),
                maxLines = 3
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Sección expandible del turno — oculta por default.
            TextButton(
                onClick = { shiftExpanded = !shiftExpanded },
                contentPadding = PaddingValues(0.dp)
            ) {
                Icon(
                    if (shiftExpanded) Icons.Default.ExpandLess else Icons.Default.ExpandMore,
                    contentDescription = null
                )
                Spacer(modifier = Modifier.width(4.dp))
                Text(
                    if (shiftExpanded) "Horario del turno" else "Agregar horario (opcional)",
                    style = MaterialTheme.typography.labelLarge
                )
            }

            if (shiftExpanded) {
                Spacer(modifier = Modifier.height(4.dp))
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedButton(
                        onClick = { showStartPicker = true },
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(Icons.Default.Schedule, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            startLocalTime?.let { formatTime(it) } ?: "Entrada"
                        )
                    }
                    OutlinedButton(
                        onClick = { showEndPicker = true },
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(Icons.Default.Schedule, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            endLocalTime?.let { formatTime(it) } ?: "Salida"
                        )
                    }
                    if (startLocalTime != null || endLocalTime != null) {
                        IconButton(onClick = onShiftClear) {
                            Icon(
                                Icons.Default.Clear,
                                contentDescription = "Limpiar turno",
                                tint = SolennixTheme.colors.secondaryText
                            )
                        }
                    }
                }
            }

            if (showStartPicker) {
                val pickerState = rememberTimePickerState(
                    initialHour = (startLocalTime ?: defaultStartLocal)?.hour ?: 14,
                    initialMinute = (startLocalTime ?: defaultStartLocal)?.minute ?: 0,
                    is24Hour = true
                )
                AlertDialog(
                    onDismissRequest = { showStartPicker = false },
                    confirmButton = {
                        TextButton(onClick = {
                            val picked = java.time.LocalTime.of(pickerState.hour, pickerState.minute)
                            onShiftChange(picked, endLocalTime)
                            showStartPicker = false
                        }) { Text("Listo") }
                    },
                    dismissButton = {
                        TextButton(onClick = { showStartPicker = false }) { Text("Cancelar") }
                    },
                    text = { TimePicker(state = pickerState) }
                )
            }
            if (showEndPicker) {
                val pickerState = rememberTimePickerState(
                    initialHour = (endLocalTime ?: defaultEndLocal)?.hour ?: 20,
                    initialMinute = (endLocalTime ?: defaultEndLocal)?.minute ?: 0,
                    is24Hour = true
                )
                AlertDialog(
                    onDismissRequest = { showEndPicker = false },
                    confirmButton = {
                        TextButton(onClick = {
                            val picked = java.time.LocalTime.of(pickerState.hour, pickerState.minute)
                            onShiftChange(startLocalTime, picked)
                            showEndPicker = false
                        }) { Text("Listo") }
                    },
                    dismissButton = {
                        TextButton(onClick = { showEndPicker = false }) { Text("Cancelar") }
                    },
                    text = { TimePicker(state = pickerState) }
                )
            }
        }
    }
}

private fun parseHHmmOrNull(hhmm: String): java.time.LocalTime? = try {
    java.time.LocalTime.parse(hhmm)
} catch (_: Exception) {
    null
}

private fun formatTime(time: java.time.LocalTime): String =
    time.format(java.time.format.DateTimeFormatter.ofPattern("HH:mm"))

private fun AssignmentStatus.uiLabel(): String = when (this) {
    AssignmentStatus.PENDING -> "Sin confirmar"
    AssignmentStatus.CONFIRMED -> "Confirmado"
    AssignmentStatus.DECLINED -> "Rechazó"
    AssignmentStatus.CANCELLED -> "Cancelado"
}

private fun AssignmentStatus.uiColor(): Color = when (this) {
    AssignmentStatus.PENDING -> Color(0xFFB7791F)      // amber
    AssignmentStatus.CONFIRMED -> Color(0xFF2F855A)    // green
    AssignmentStatus.DECLINED -> Color(0xFFC53030)     // red muted
    AssignmentStatus.CANCELLED -> Color(0xFF718096)    // gray
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun StaffPickerSheet(
    viewModel: EventFormViewModel,
    onDismiss: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val availableStaff by viewModel.availableStaff.collectAsStateWithLifecycle()
    val availability by viewModel.staffAvailability.collectAsStateWithLifecycle()
    var query by remember { mutableStateOf("") }

    val selectedIds = remember(viewModel.selectedStaff.size) {
        viewModel.selectedStaff.map { it.staffId }.toSet()
    }

    val filtered = remember(query, availableStaff, selectedIds) {
        availableStaff.filter { staff ->
            staff.id !in selectedIds && (
                query.isBlank() ||
                    staff.name.contains(query, ignoreCase = true) ||
                    (staff.roleLabel?.contains(query, ignoreCase = true) == true)
                )
        }
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                "Seleccionar colaborador",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(12.dp))
            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Buscar por nombre o rol...") },
                leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                singleLine = true,
                shape = MaterialTheme.shapes.medium
            )
            Spacer(modifier = Modifier.height(12.dp))

            if (filtered.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        if (availableStaff.isEmpty())
                            "Aún no tenés colaboradores. Agregalos desde Más → Personal."
                        else
                            "Sin resultados",
                        style = MaterialTheme.typography.bodyMedium,
                        color = SolennixTheme.colors.secondaryText
                    )
                }
            } else {
                LazyColumn(modifier = Modifier.fillMaxWidth()) {
                    items(filtered, key = { it.id }) { staff ->
                        Card(
                            onClick = {
                                viewModel.addStaffAssignment(staff)
                                onDismiss()
                            },
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp),
                            colors = CardDefaults.cardColors(
                                containerColor = SolennixTheme.colors.card
                            ),
                            shape = MaterialTheme.shapes.medium
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        staff.name,
                                        style = MaterialTheme.typography.titleSmall,
                                        color = SolennixTheme.colors.primaryText
                                    )
                                    val subtitle = listOfNotNull(
                                        staff.roleLabel?.takeIf { it.isNotBlank() },
                                        staff.email?.takeIf { it.isNotBlank() }
                                    ).joinToString(" · ")
                                    if (subtitle.isNotBlank()) {
                                        Text(
                                            subtitle,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = SolennixTheme.colors.secondaryText
                                        )
                                    }
                                }
                                if (availability[staff.id]?.isNotEmpty() == true) {
                                    Surface(
                                        shape = MaterialTheme.shapes.small,
                                        color = Color(0xFFB7791F).copy(alpha = 0.15f),
                                        modifier = Modifier.padding(end = 8.dp)
                                    ) {
                                        Text(
                                            "Ocupado ese día",
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                            style = MaterialTheme.typography.labelSmall,
                                            color = Color(0xFFB7791F),
                                            fontWeight = FontWeight.Medium
                                        )
                                    }
                                }
                                Icon(
                                    Icons.Default.Add,
                                    contentDescription = "Asignar",
                                    tint = SolennixTheme.colors.primary
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TeamPickerSheet(
    viewModel: EventFormViewModel,
    onDismiss: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val teams by viewModel.availableTeams.collectAsStateWithLifecycle()
    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                "Seleccioná un equipo",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                "Los miembros se suman como asignaciones nuevas. Podés ajustar el " +
                    "fee, turno o estado de cada uno después.",
                style = MaterialTheme.typography.bodySmall,
                color = SolennixTheme.colors.secondaryText
            )
            Spacer(modifier = Modifier.height(12.dp))

            when {
                viewModel.isLoadingTeams && teams.isEmpty() -> {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 32.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator()
                    }
                }
                viewModel.teamsErrorMessage != null && teams.isEmpty() -> {
                    Text(
                        viewModel.teamsErrorMessage.orEmpty(),
                        style = MaterialTheme.typography.bodyMedium,
                        color = SolennixTheme.colors.error
                    )
                }
                teams.isEmpty() -> {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 32.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            "Sin equipos todavía. Creá uno desde Personal → Equipos.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = SolennixTheme.colors.secondaryText
                        )
                    }
                }
                else -> {
                    LazyColumn(modifier = Modifier.fillMaxWidth()) {
                        items(teams, key = { it.id }) { team ->
                            Card(
                                onClick = {
                                    viewModel.addTeamAssignment(team.id) { added, skipped ->
                                        val msg = buildString {
                                            append("Equipo aplicado: ")
                                            append(
                                                when (added) {
                                                    0 -> "sin nuevos miembros"
                                                    1 -> "1 agregado"
                                                    else -> "$added agregados"
                                                }
                                            )
                                            if (skipped > 0) append(" · $skipped ya estaban")
                                        }
                                        scope.launch { snackbarHostState.showSnackbar(msg) }
                                    }
                                    onDismiss()
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp),
                                colors = CardDefaults.cardColors(
                                    containerColor = SolennixTheme.colors.card
                                ),
                                shape = MaterialTheme.shapes.medium
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(12.dp),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Icon(
                                        Icons.Default.Group,
                                        contentDescription = null,
                                        tint = SolennixTheme.colors.primary
                                    )
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            team.name,
                                            style = MaterialTheme.typography.titleSmall,
                                            color = SolennixTheme.colors.primaryText
                                        )
                                        team.roleLabel?.takeIf { it.isNotBlank() }?.let { label ->
                                            Text(
                                                label,
                                                style = MaterialTheme.typography.bodySmall,
                                                color = SolennixTheme.colors.primary
                                            )
                                        }
                                        val count = team.memberCount ?: team.members?.size ?: 0
                                        Text(
                                            when (count) {
                                                0 -> "Sin miembros"
                                                1 -> "1 miembro"
                                                else -> "$count miembros"
                                            },
                                            style = MaterialTheme.typography.labelSmall,
                                            color = SolennixTheme.colors.secondaryText
                                        )
                                    }
                                    Icon(
                                        Icons.Default.Add,
                                        contentDescription = "Aplicar",
                                        tint = SolennixTheme.colors.primary
                                    )
                                }
                            }
                        }
                    }
                }
            }
            Spacer(modifier = Modifier.height(16.dp))
            SnackbarHost(hostState = snackbarHostState)
        }
    }
}
