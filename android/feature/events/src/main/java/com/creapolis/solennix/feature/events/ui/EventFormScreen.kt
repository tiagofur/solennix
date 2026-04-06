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
import com.creapolis.solennix.core.designsystem.theme.LocalIsWideScreen
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.*
import com.creapolis.solennix.core.model.extensions.asMXN
import com.creapolis.solennix.feature.events.viewmodel.EventFormViewModel
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
        bottomBar = {
            BottomStepNavigation(
                currentPage = pagerState.currentPage,
                totalPages = 6,
                onNext = {
                    val error = viewModel.validateStep(pagerState.currentPage)
                    if (error != null) {
                        viewModel.saveError = error
                    } else if (pagerState.currentPage < 5) {
                        scope.launch { pagerState.animateScrollToPage(pagerState.currentPage + 1) }
                    } else {
                        viewModel.saveEvent()
                    }
                },
                onBack = {
                    scope.launch { pagerState.animateScrollToPage(pagerState.currentPage - 1) }
                },
                isLoading = viewModel.isLoading,
                isEditMode = viewModel.isEditMode
            )
        }
    ) { padding ->
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

    AdaptiveCenteredContent(maxWidth = 800.dp) {
    Column(modifier = Modifier.padding(24.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("Productos y Menú", style = MaterialTheme.typography.headlineSmall, modifier = Modifier.weight(1f))
            IconButton(onClick = { showProductPicker = true }) {
                Icon(Icons.Default.AddCircle, contentDescription = "Añadir", tint = SolennixTheme.colors.primary)
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        if (viewModel.selectedProducts.isEmpty()) {
            EmptyState(
                icon = Icons.Default.RestaurantMenu,
                title = "Sin productos",
                message = "Añade platos o servicios al evento para calcular el presupuesto.",
                actionText = "Explorar Catálogo",
                onAction = { showProductPicker = true }
            )
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
                                    availableProducts = viewModel.availableProducts.value,
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
                                        availableProducts = viewModel.availableProducts.value,
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
                            availableProducts = viewModel.availableProducts.value,
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
                    Spacer(modifier = Modifier.height(12.dp))
                    Row {
                        TextButton(onClick = {
                            showAddExtra = false
                            extraExcludeUtility = false
                        }) { Text("Cancelar") }
                        Spacer(modifier = Modifier.weight(1f))
                        Button(onClick = {
                            val c = extraCost.toDoubleOrNull() ?: 0.0
                            val p = extraPrice.toDoubleOrNull() ?: 0.0
                            viewModel.addExtra(extraDesc, c, p, extraExcludeUtility)
                            extraDesc = ""
                            extraCost = ""
                            extraPrice = ""
                            extraExcludeUtility = false
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
    // Basic implementation to satisfy compilation
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text("Equipamiento (Proximamente)")
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StepSupplies(viewModel: EventFormViewModel) {
    // Basic implementation to satisfy compilation
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text("Insumos (Proximamente)")
    }
}

@Composable
fun StepSummary(viewModel: EventFormViewModel, isEditMode: Boolean) {
    // Basic implementation to satisfy compilation
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text("Resumen (Proximamente)")
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProductPickerSheet(
    viewModel: EventFormViewModel,
    onDismiss: () -> Unit,
    onProductSelected: (com.creapolis.solennix.core.model.Product) -> Unit
) {
    // Sheet implementation
}
