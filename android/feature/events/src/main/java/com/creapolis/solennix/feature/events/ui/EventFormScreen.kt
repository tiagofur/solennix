package com.creapolis.solennix.feature.events.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
    val pagerState = rememberPagerState(pageCount = { 5 })
    val scope = rememberCoroutineScope()
    val snackbarHostState = remember { SnackbarHostState() }

    UiEventSnackbarHandler(
        events = viewModel.uiEvents,
        snackbarHostState = snackbarHostState,
    )

    // Inventario & Personal (page 3) carga ambos sets de sugerencias porque
    // ahora vive todo junto en un solo paso.
    LaunchedEffect(pagerState.currentPage) {
        if (pagerState.currentPage == 3) {
            viewModel.fetchEquipmentSuggestions()
            viewModel.fetchSupplySuggestions()
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
                    totalPages = 5,
                    onNext = {
                        val error = viewModel.validateStep(pagerState.currentPage)
                        if (error != null) {
                            viewModel.saveError = error
                        } else if (pagerState.currentPage < 4) {
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
                    EventFormStepIndicator(
                        currentPage = pagerState.currentPage,
                        onStepClick = { target ->
                            if (target < pagerState.currentPage) {
                                scope.launch { pagerState.animateScrollToPage(target) }
                            }
                        },
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
                            3 -> StepInventoryAndPersonnel(viewModel)
                            4 -> StepSummary(viewModel, isEditMode = viewModel.isEditMode)
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
    totalPages: Int = 5,
    onNext: () -> Unit,
    onBack: () -> Unit,
    isLoading: Boolean,
    isEditMode: Boolean = false
) {
    val isLastPage = currentPage == totalPages - 1
    Surface(
        modifier = Modifier.fillMaxWidth(),
        tonalElevation = 8.dp,
        shadowElevation = 16.dp,
    ) {
        // Botones a tamaño M3 default (40dp). Antes estaban apretados con
        // weight(1f) y forzados a ocupar toda la franja; se veían enormes.
        Row(
            modifier = Modifier
                .padding(horizontal = 16.dp, vertical = 12.dp)
                .fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (currentPage > 0) {
                TextButton(onClick = onBack) {
                    Icon(
                        Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp),
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Anterior")
                }
            } else {
                Spacer(modifier = Modifier.width(1.dp))
            }

            Button(
                onClick = onNext,
                enabled = !isLoading,
                colors = ButtonDefaults.buttonColors(
                    containerColor = SolennixTheme.colors.primary,
                ),
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(16.dp),
                        strokeWidth = 2.dp,
                        color = Color.White,
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                }
                Text(
                    text = if (isLastPage) (if (isEditMode) "Guardar Cambios" else "Finalizar") else "Siguiente",
                    fontWeight = FontWeight.SemiBold,
                )
                Spacer(modifier = Modifier.width(6.dp))
                Icon(
                    imageVector = if (isLastPage) Icons.Default.Check else Icons.AutoMirrored.Filled.ArrowForward,
                    contentDescription = null,
                    modifier = Modifier.size(18.dp),
                )
            }
        }
    }
}

/**
 * Step indicator con iconos (no números) — mirror del patrón de Web.
 * Los pasos anteriores son tappables para volver; los futuros están bloqueados
 * hasta que se valide cada paso via onNext.
 */
@Composable
private fun EventFormStepIndicator(
    currentPage: Int,
    onStepClick: (Int) -> Unit,
) {
    data class StepMeta(val icon: androidx.compose.ui.graphics.vector.ImageVector, val label: String)
    val steps = listOf(
        StepMeta(Icons.Default.Info, "General"),
        StepMeta(Icons.Default.Inventory2, "Productos"),
        StepMeta(Icons.Default.AutoAwesome, "Extras"),
        StepMeta(Icons.Default.ShoppingCart, "Inventario"),
        StepMeta(Icons.Default.Payments, "Finanzas"),
    )
    val progress = (currentPage + 1).toFloat() / steps.size.toFloat()

    Column(modifier = Modifier.fillMaxWidth()) {
        LinearProgressIndicator(
            progress = { progress },
            modifier = Modifier.fillMaxWidth(),
            color = SolennixTheme.colors.primary,
            trackColor = SolennixTheme.colors.borderLight,
        )
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            steps.forEachIndexed { index, step ->
                val isCompleted = index < currentPage
                val isActive = index == currentPage
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .clickable(enabled = index < currentPage) { onStepClick(index) },
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Box(
                        modifier = Modifier
                            .size(36.dp)
                            .clip(CircleShape)
                            .background(
                                when {
                                    isCompleted -> SolennixTheme.colors.primary
                                    isActive -> SolennixTheme.colors.primaryLight
                                    else -> SolennixTheme.colors.surfaceAlt
                                }
                            ),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            imageVector = if (isCompleted) Icons.Default.Check else step.icon,
                            contentDescription = null,
                            tint = when {
                                isCompleted -> Color.White
                                isActive -> SolennixTheme.colors.primary
                                else -> SolennixTheme.colors.secondaryText
                            },
                            modifier = Modifier.size(18.dp),
                        )
                    }
                    if (isActive) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = step.label,
                            style = MaterialTheme.typography.labelSmall,
                            color = SolennixTheme.colors.primary,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StepGeneralInfo(viewModel: EventFormViewModel) {
    var showClientPicker by remember { mutableStateOf(false) }
    var showDatePicker by remember { mutableStateOf(false) }
    var showStartTimePicker by remember { mutableStateOf(false) }
    var showEndTimePicker by remember { mutableStateOf(false) }
    var showStatusMenu by remember { mutableStateOf(false) }
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

            // Hora Inicio / Hora Fin — siempre 2 columnas inline (también en
            // phone portrait). Son campos cortos y se leen mejor juntos.
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Box(modifier = Modifier.weight(1f)) {
                    TimePickerField(
                        label = "Hora Inicio",
                        value = viewModel.startTime,
                        onClick = { showStartTimePicker = true },
                    )
                }
                Box(modifier = Modifier.weight(1f)) {
                    TimePickerField(
                        label = "Hora Fin",
                        value = viewModel.endTime,
                        onClick = { showEndTimePicker = true },
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Servicio + Personas en una fila. Personas usa un stepper +/-
            // nativo M3 (iconos IconButton) como en iOS, no text input libre.
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.Top,
            ) {
                Box(modifier = Modifier.weight(1f)) {
                    SolennixTextField(
                        value = viewModel.serviceType,
                        onValueChange = { viewModel.serviceType = it },
                        label = "Tipo de Servicio",
                        placeholder = "Ej: Boda, XV Años"
                    )
                }
                Box(modifier = Modifier.weight(1f)) {
                    GuestCountStepper(
                        value = viewModel.numPeople.toIntOrNull() ?: 1,
                        onValueChange = { viewModel.numPeople = it.toString() },
                    )
                }
            }

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

            // ExposedDropdownMenu en vez de FilterChip row — 4 chips en una
            // pantalla pequeña hacían wrap a 2 líneas. Un single-line dropdown
            // es el patrón M3 cuando hay 3+ opciones exclusivas.
            Text("Estado del Evento", style = MaterialTheme.typography.labelMedium, color = SolennixTheme.colors.secondaryText)
            ExposedDropdownMenuBox(
                expanded = showStatusMenu,
                onExpandedChange = { showStatusMenu = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp),
            ) {
                OutlinedTextField(
                    value = statusLabels[viewModel.status] ?: viewModel.status.name,
                    onValueChange = {},
                    readOnly = true,
                    modifier = Modifier
                        .fillMaxWidth()
                        .menuAnchor(MenuAnchorType.PrimaryNotEditable),
                    trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = showStatusMenu) },
                    shape = RoundedCornerShape(12.dp),
                )
                ExposedDropdownMenu(
                    expanded = showStatusMenu,
                    onDismissRequest = { showStatusMenu = false },
                ) {
                    EventStatus.entries.forEach { status ->
                        DropdownMenuItem(
                            text = { Text(statusLabels[status] ?: status.name) },
                            onClick = {
                                viewModel.status = status
                                showStatusMenu = false
                            },
                            leadingIcon = if (viewModel.status == status) {
                                { Icon(Icons.Default.Check, contentDescription = null, tint = SolennixTheme.colors.primary) }
                            } else null,
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Notas: multiline con minLines = 3 para no apretar el área útil.
            // SolennixTextField no expone minLines, por eso uso OutlinedTextField
            // directo aquí (decisión puntual, no vale la pena extender la API
            // del design system solo por esto).
            OutlinedTextField(
                value = viewModel.notes,
                onValueChange = { viewModel.notes = it },
                label = { Text("Notas Adicionales") },
                placeholder = { Text("Instrucciones especiales para el montaje...") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 3,
                maxLines = 6,
                shape = MaterialTheme.shapes.small,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = SolennixTheme.colors.primary,
                    focusedLabelColor = SolennixTheme.colors.primary,
                    cursorColor = SolennixTheme.colors.primary,
                ),
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
                                // Parity con iOS: si el evento aún no tiene
                                // ubicación o ciudad, pre-rellenar desde el
                                // perfil del cliente. Si ya tenían algo escrito,
                                // respetar lo que el usuario puso.
                                if (viewModel.location.isBlank()) {
                                    client.address?.takeIf { it.isNotBlank() }
                                        ?.let { viewModel.location = it }
                                }
                                if (viewModel.city.isBlank()) {
                                    client.city?.takeIf { it.isNotBlank() }
                                        ?.let { viewModel.city = it }
                                }
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

    if (showStartTimePicker) {
        TimePickerDialogM3(
            initialTime = parseHHmmOrNull(viewModel.startTime),
            onDismiss = { showStartTimePicker = false },
            onConfirm = { hh, mm ->
                viewModel.startTime = "%02d:%02d".format(hh, mm)
                showStartTimePicker = false
            },
        )
    }

    if (showEndTimePicker) {
        TimePickerDialogM3(
            initialTime = parseHHmmOrNull(viewModel.endTime),
            onDismiss = { showEndTimePicker = false },
            onConfirm = { hh, mm ->
                viewModel.endTime = "%02d:%02d".format(hh, mm)
                showEndTimePicker = false
            },
        )
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
        // Botón prominente de "Agregar Producto" — mismo patrón que iOS.
        // Reemplaza el header "Productos y Menú" + icon button pequeño que
        // saturaban visualmente el paso.
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { showProductPicker = true },
            colors = CardDefaults.cardColors(
                containerColor = SolennixTheme.colors.primaryLight,
            ),
            border = androidx.compose.foundation.BorderStroke(
                1.dp,
                SolennixTheme.colors.primary.copy(alpha = 0.3f),
            ),
            shape = MaterialTheme.shapes.medium,
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    Icons.Default.AddCircle,
                    contentDescription = null,
                    tint = SolennixTheme.colors.primary,
                )
                Spacer(modifier = Modifier.width(12.dp))
                Text(
                    "Agregar Producto",
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Medium,
                    color = SolennixTheme.colors.primary,
                )
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
            // Empty state simplificado — una sola variante, sin botón de acción.
            // El CTA ya está arriba como card prominente. Parity con iOS.
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 48.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Icon(
                    Icons.Default.Inventory2,
                    contentDescription = null,
                    tint = SolennixTheme.colors.secondaryText,
                    modifier = Modifier.size(48.dp),
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    "Sin productos",
                    style = MaterialTheme.typography.titleMedium,
                    color = SolennixTheme.colors.secondaryText,
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    "Agrega productos al evento",
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText,
                )
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
                        )
                    }
                }

                // Subtotal Productos — mismo patrón visual que iOS.
                item {
                    Spacer(modifier = Modifier.height(12.dp))
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = SolennixTheme.colors.surfaceAlt,
                        ),
                        shape = MaterialTheme.shapes.medium,
                    ) {
                        Row(
                            modifier = Modifier.padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                "Subtotal Productos",
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Medium,
                                color = SolennixTheme.colors.secondaryText,
                                modifier = Modifier.weight(1f),
                            )
                            Text(
                                viewModel.subtotalProducts.asMXN(),
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.SemiBold,
                                color = SolennixTheme.colors.primary,
                            )
                        }
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
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        product.name,
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.Medium,
                    )
                    Text(
                        "${item.unitPrice.asMXN()} c/u",
                        style = MaterialTheme.typography.bodyMedium,
                        color = SolennixTheme.colors.primary,
                    )
                    product.staffTeamId?.takeIf { it.isNotBlank() }?.let {
                        Spacer(modifier = Modifier.height(4.dp))
                        AssistChip(
                            onClick = {},
                            enabled = false,
                            label = {
                                Text(
                                    "Incluye equipo",
                                    style = MaterialTheme.typography.labelSmall
                                )
                            },
                            leadingIcon = {
                                Icon(
                                    Icons.Default.Groups,
                                    contentDescription = null,
                                    modifier = Modifier.size(14.dp)
                                )
                            },
                            colors = AssistChipDefaults.assistChipColors(
                                disabledContainerColor = SolennixTheme.colors.primary.copy(alpha = 0.08f),
                                disabledLabelColor = SolennixTheme.colors.primary,
                                disabledLeadingIconContentColor = SolennixTheme.colors.primary
                            ),
                            border = null,
                            modifier = Modifier.height(24.dp)
                        )
                    }
                }

                // Stepper compacto — IconButton default es 48dp y quedaba
                // con mucho aire alrededor del número. Lo achico a 32dp para
                // acercar los botones al count, patrón más tight de iOS.
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                    IconButton(
                        onClick = { onQuantityChange(item.quantity - 1.0) },
                        enabled = item.quantity > 1,
                        modifier = Modifier.size(32.dp),
                    ) {
                        Icon(
                            Icons.Default.RemoveCircle,
                            contentDescription = "Menos",
                            tint = if (item.quantity > 1) SolennixTheme.colors.primary
                                   else SolennixTheme.colors.secondaryText,
                            modifier = Modifier.size(22.dp),
                        )
                    }
                    Text(
                        item.quantity.toInt().toString(),
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.SemiBold,
                    )
                    IconButton(
                        onClick = { onQuantityChange(item.quantity + 1.0) },
                        modifier = Modifier.size(32.dp),
                    ) {
                        Icon(
                            Icons.Default.AddCircle,
                            contentDescription = "Mas",
                            tint = SolennixTheme.colors.primary,
                            modifier = Modifier.size(22.dp),
                        )
                    }
                }

                IconButton(
                    onClick = onRemove,
                    modifier = Modifier.size(32.dp),
                ) {
                    Icon(
                        Icons.Default.Delete,
                        contentDescription = "Eliminar",
                        tint = SolennixTheme.colors.error,
                        modifier = Modifier.size(18.dp),
                    )
                }
            }

            // Per-product discount row — sin height fija para que el label
            // de Material flote arriba del border como en los otros fields.
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
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
                    label = { Text("Descuento") },
                    placeholder = { Text("0") },
                    modifier = Modifier.width(140.dp),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal),
                    shape = MaterialTheme.shapes.small,
                )
                Spacer(modifier = Modifier.width(12.dp))
                Text(
                    text = "Total: ${lineTotal.asMXN()}",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold,
                    color = if (item.discount > 0) SolennixTheme.colors.success else SolennixTheme.colors.primaryText
                )
            }
        }
    }
}

@Composable
fun StepExtras(viewModel: EventFormViewModel) {
    AdaptiveCenteredContent(maxWidth = 800.dp) {
    Column(modifier = Modifier.padding(24.dp)) {
        // Botón prominente "Agregar Extra" — mismo patrón que iOS y que
        // StepProducts. Agrega un extra vacío que se edita in-place.
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { viewModel.addBlankExtra() },
            colors = CardDefaults.cardColors(
                containerColor = SolennixTheme.colors.primaryLight,
            ),
            border = androidx.compose.foundation.BorderStroke(
                1.dp,
                SolennixTheme.colors.primary.copy(alpha = 0.3f),
            ),
            shape = MaterialTheme.shapes.medium,
        ) {
            Row(
                modifier = Modifier.padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    Icons.Default.AddCircle,
                    contentDescription = null,
                    tint = SolennixTheme.colors.primary,
                )
                Spacer(modifier = Modifier.width(12.dp))
                Text(
                    "Agregar Extra",
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Medium,
                    color = SolennixTheme.colors.primary,
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        if (viewModel.eventExtras.isEmpty()) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 48.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Icon(
                    Icons.Default.StarOutline,
                    contentDescription = null,
                    tint = SolennixTheme.colors.secondaryText,
                    modifier = Modifier.size(48.dp),
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    "Sin extras",
                    style = MaterialTheme.typography.titleMedium,
                    color = SolennixTheme.colors.secondaryText,
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    "Agrega servicios o items adicionales",
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText,
                )
            }
        } else {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                viewModel.eventExtras.forEachIndexed { index, extra ->
                    EditableExtraCard(
                        index = index,
                        extra = extra,
                        onDescriptionChange = { viewModel.updateExtraFields(extra.id, description = it) },
                        onCostChange = { viewModel.updateExtraFields(extra.id, cost = it) },
                        onPriceChange = { viewModel.updateExtraFields(extra.id, price = it) },
                        onExcludeUtilityChange = { viewModel.updateExtraFields(extra.id, excludeUtility = it) },
                        onIncludeInChecklistChange = { viewModel.updateExtraFields(extra.id, includeInChecklist = it) },
                        onRemove = { viewModel.removeExtra(extra.id) },
                    )
                }

                // Subtotal Extras — parity con iOS.
                Spacer(modifier = Modifier.height(4.dp))
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = SolennixTheme.colors.surfaceAlt,
                    ),
                    shape = MaterialTheme.shapes.medium,
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            "Subtotal Extras",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Medium,
                            color = SolennixTheme.colors.secondaryText,
                            modifier = Modifier.weight(1f),
                        )
                        Text(
                            viewModel.subtotalExtras.asMXN(),
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = SolennixTheme.colors.primary,
                        )
                    }
                }
            }
        }
    }
}
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun EditableExtraCard(
    index: Int,
    extra: com.creapolis.solennix.core.model.EventExtra,
    onDescriptionChange: (String) -> Unit,
    onCostChange: (Double) -> Unit,
    onPriceChange: (Double) -> Unit,
    onExcludeUtilityChange: (Boolean) -> Unit,
    onIncludeInChecklistChange: (Boolean) -> Unit,
    onRemove: () -> Unit,
) {
    // Texto del TextField "rebota" del modelo — si el usuario borra y escribe
    // un valor inválido, mostramos lo que él tipeó pero al VM le mandamos el
    // double parseado (fallback 0.0).
    var costText by remember(extra.id, extra.cost) {
        mutableStateOf(if (extra.cost > 0) "%g".format(extra.cost) else "")
    }
    var priceText by remember(extra.id, extra.price) {
        mutableStateOf(if (extra.price > 0) "%g".format(extra.price) else "")
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        border = androidx.compose.foundation.BorderStroke(1.dp, SolennixTheme.colors.borderLight),
        shape = MaterialTheme.shapes.medium,
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    "Extra ${index + 1}",
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = SolennixTheme.colors.secondaryText,
                    modifier = Modifier.weight(1f),
                )
                IconButton(onClick = onRemove, modifier = Modifier.size(32.dp)) {
                    Icon(
                        Icons.Default.Delete,
                        contentDescription = "Eliminar",
                        tint = SolennixTheme.colors.error,
                        modifier = Modifier.size(18.dp),
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            SolennixTextField(
                value = extra.description,
                onValueChange = onDescriptionChange,
                label = "Descripcion",
                placeholder = "Descripcion del extra",
                leadingIcon = Icons.Default.Description,
            )

            Spacer(modifier = Modifier.height(8.dp))

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = costText,
                    onValueChange = { value ->
                        costText = value
                        onCostChange(value.replace(",", ".").toDoubleOrNull() ?: 0.0)
                    },
                    label = { Text("Costo") },
                    placeholder = { Text("0.00") },
                    leadingIcon = { Text("$", color = SolennixTheme.colors.secondaryText) },
                    keyboardOptions = KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal),
                    singleLine = true,
                    shape = MaterialTheme.shapes.small,
                    modifier = Modifier.weight(1f),
                )
                OutlinedTextField(
                    value = priceText,
                    onValueChange = { value ->
                        if (!extra.excludeUtility) {
                            priceText = value
                            onPriceChange(value.replace(",", ".").toDoubleOrNull() ?: 0.0)
                        }
                    },
                    label = { Text("Precio") },
                    placeholder = { Text("0.00") },
                    leadingIcon = { Text("$", color = SolennixTheme.colors.secondaryText) },
                    enabled = !extra.excludeUtility,
                    keyboardOptions = KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal),
                    singleLine = true,
                    shape = MaterialTheme.shapes.small,
                    modifier = Modifier.weight(1f),
                )
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Toggles — M3 Switch en vez de Checkbox: más moderno y pareado
            // con el Toggle nativo de iOS.
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    "Solo cobrar costo (sin utilidad)",
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText,
                    modifier = Modifier.weight(1f),
                )
                Switch(
                    checked = extra.excludeUtility,
                    onCheckedChange = {
                        onExcludeUtilityChange(it)
                        // Mantener sincronizado el texto local del price
                        // cuando al toggle se fuerza price = cost.
                        if (it) priceText = costText
                    },
                )
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(
                    Icons.Default.Checklist,
                    contentDescription = null,
                    tint = SolennixTheme.colors.secondaryText,
                    modifier = Modifier.size(16.dp),
                )
                Spacer(modifier = Modifier.width(6.dp))
                Text(
                    "Incluir en checklist",
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText,
                    modifier = Modifier.weight(1f),
                )
                Switch(
                    checked = extra.includeInChecklist,
                    onCheckedChange = onIncludeInChecklistChange,
                )
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
/**
 * Sección Equipamiento — reutilizable, conflictos, sugerencias. Sin Staff;
 * ese va en StaffSection aparte. Usada dentro de StepInventoryAndPersonnel.
 */
@Composable
private fun EquipmentSection(viewModel: EventFormViewModel) {
    var showEquipmentPicker by remember { mutableStateOf(false) }
    val suggestions by viewModel.equipmentSuggestions.collectAsStateWithLifecycle()
    val conflicts by viewModel.equipmentConflicts.collectAsStateWithLifecycle()
    val isWideScreen = LocalIsWideScreen.current

    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            "Equipamiento",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = SolennixTheme.colors.primaryText,
        )
        Spacer(modifier = Modifier.height(12.dp))

        // Conflict warnings primero — son lo más urgente.
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

        // Suggestions banner — warning tint para parity con Insumos + iOS.
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

        AddItemCard(label = "Agregar Equipamiento") { showEquipmentPicker = true }

        Spacer(modifier = Modifier.height(16.dp))

        if (viewModel.selectedEquipment.isEmpty()) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Icon(
                    Icons.Default.Build,
                    contentDescription = null,
                    tint = SolennixTheme.colors.secondaryText,
                    modifier = Modifier.size(48.dp),
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    "Sin equipamiento (opcional)",
                    style = MaterialTheme.typography.titleSmall,
                    color = SolennixTheme.colors.secondaryText,
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    "Agrega equipo reutilizable para el evento",
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText,
                )
            }
        } else {
            // Column + forEach — parent provee el verticalScroll.
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
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
    }

    if (showEquipmentPicker) {
        EquipmentPickerSheet(
            viewModel = viewModel,
            onDismiss = { showEquipmentPicker = false }
        )
    }
}

/**
 * Sección Personal — wrapper con header y el StaffAssignmentPanel existente.
 * Antes vivía dentro de EquipmentAndStaffSection. Separada ahora para que
 * las 3 subsecciones (Insumos · Equipamiento · Personal) sean simétricas.
 */
@Composable
private fun StaffSection(viewModel: EventFormViewModel) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            "Personal",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = SolennixTheme.colors.primaryText,
        )
        Spacer(modifier = Modifier.height(12.dp))
        StaffAssignmentPanel(viewModel = viewModel)
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
                    Text(
                        equipment.equipmentName ?: "Equipo",
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.Medium,
                    )
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

/**
 * Sección Insumos — render-only, sin scroll propio. El scroll lo coordina
 * StepInventoryAndPersonnel que la contiene junto a EquipmentAndStaffSection.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SuppliesSection(viewModel: EventFormViewModel) {
    var showSupplyPicker by remember { mutableStateOf(false) }
    val suggestions by viewModel.supplySuggestions.collectAsStateWithLifecycle()
    val isWideScreen = LocalIsWideScreen.current

    Column(modifier = Modifier.fillMaxWidth()) {
        Text(
            "Insumos",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = SolennixTheme.colors.primaryText,
        )
        Spacer(modifier = Modifier.height(12.dp))

        // Suggestions banner — siempre ANTES del botón para señalar lo
        // recomendado primero.
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

        // Card prominente "Agregar Insumo" — mismo patrón que StepProducts.
        AddItemCard(label = "Agregar Insumo") { showSupplyPicker = true }

        Spacer(modifier = Modifier.height(16.dp))

        if (viewModel.selectedSupplies.isEmpty()) {
            // Empty state sin action button — el CTA está arriba.
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 32.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Icon(
                    Icons.Default.Inventory2,
                    contentDescription = null,
                    tint = SolennixTheme.colors.secondaryText,
                    modifier = Modifier.size(48.dp),
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    "Sin insumos (opcional)",
                    style = MaterialTheme.typography.titleSmall,
                    color = SolennixTheme.colors.secondaryText,
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    "Agrega consumibles del inventario",
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText,
                )
            }
        } else {
            // Column + forEach — nested scroll no permitido (el parent ya
            // tiene verticalScroll).
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                if (isWideScreen) {
                    viewModel.selectedSupplies.chunked(2).forEach { pair ->
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
                    viewModel.selectedSupplies.forEach { supply ->
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

            // Subtotal card — mismo patrón que StepProducts.
            Spacer(modifier = Modifier.height(12.dp))
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.surfaceAlt),
                shape = MaterialTheme.shapes.medium,
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        "Costo insumos",
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium,
                        color = SolennixTheme.colors.secondaryText,
                        modifier = Modifier.weight(1f),
                    )
                    Text(
                        viewModel.costSupplies.asMXN(),
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = SolennixTheme.colors.primary,
                    )
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

/**
 * Card prominente reutilizable — mismo patrón visual que los "Agregar X"
 * de StepProducts / StepExtras. Wrapper con `primaryLight` bg + icono
 * AddCircle + label primary.
 */
@Composable
private fun AddItemCard(label: String, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        colors = CardDefaults.cardColors(
            containerColor = SolennixTheme.colors.primaryLight,
        ),
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            SolennixTheme.colors.primary.copy(alpha = 0.3f),
        ),
        shape = MaterialTheme.shapes.medium,
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                Icons.Default.AddCircle,
                contentDescription = null,
                tint = SolennixTheme.colors.primary,
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(
                label,
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Medium,
                color = SolennixTheme.colors.primary,
            )
        }
    }
}

/**
 * Paso unificado de Inventario & Personal — 3 subsecciones apiladas
 * (Insumos · Equipamiento · Personal) con el mismo patrón de Productos
 * (card "Agregar X" prominente, banner de sugerencias, lista, subtotal).
 * Scroll compartido para todo el paso.
 */
@Composable
fun StepInventoryAndPersonnel(viewModel: EventFormViewModel) {
    AdaptiveCenteredContent(maxWidth = 800.dp) {
        Column(
            modifier = Modifier
                .padding(24.dp)
                .verticalScroll(rememberScrollState())
        ) {
            SuppliesSection(viewModel)
            Spacer(modifier = Modifier.height(32.dp))
            HorizontalDivider(color = SolennixTheme.colors.divider)
            Spacer(modifier = Modifier.height(32.dp))
            EquipmentSection(viewModel)
            Spacer(modifier = Modifier.height(32.dp))
            HorizontalDivider(color = SolennixTheme.colors.divider)
            Spacer(modifier = Modifier.height(32.dp))
            StaffSection(viewModel)
        }
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

            // Discount section — tipo (%/$) como chips segmented ANTES del
            // textfield (mismo patrón que iOS). Siempre una sola línea, no
            // stackea en phone.
            Text("Descuento", style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                // Toggle buttons compactos "%" / "$" — altura igual al field.
                Row(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(SolennixTheme.colors.surfaceAlt),
                ) {
                    DiscountTypeButton(
                        label = "%",
                        selected = viewModel.discountType == DiscountType.PERCENT,
                        onClick = { viewModel.discountType = DiscountType.PERCENT },
                    )
                    DiscountTypeButton(
                        label = "$",
                        selected = viewModel.discountType == DiscountType.FIXED,
                        onClick = { viewModel.discountType = DiscountType.FIXED },
                    )
                }
                SolennixTextField(
                    value = viewModel.discount,
                    onValueChange = { viewModel.discount = it },
                    label = if (viewModel.discountType == DiscountType.PERCENT) "Descuento (%)" else "Descuento ($)",
                    keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal,
                    modifier = Modifier.weight(1f),
                )
            }

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

            // Deposit section — % a la izquierda, monto calculado a la
            // derecha. Siempre una línea (no stackea), igual que iOS.
            Text("Anticipo", style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                SolennixTextField(
                    value = viewModel.depositPercent,
                    onValueChange = { viewModel.depositPercent = it },
                    label = "Anticipo (%)",
                    keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal,
                    modifier = Modifier.weight(1f),
                )
                Text(
                    "= ${depositAmount.asMXN()}",
                    style = MaterialTheme.typography.titleSmall,
                    color = SolennixTheme.colors.primary,
                    fontWeight = FontWeight.SemiBold,
                )
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Cancellation policy — 2 columnas inline siempre (no stackea).
            Text("Política de Cancelación", style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.Top,
            ) {
                Box(modifier = Modifier.weight(1f)) {
                    SolennixTextField(
                        value = viewModel.cancellationDays,
                        onValueChange = { viewModel.cancellationDays = it },
                        label = "Días anticipación",
                        keyboardType = androidx.compose.ui.text.input.KeyboardType.Number,
                    )
                }
                Box(modifier = Modifier.weight(1f)) {
                    SolennixTextField(
                        value = viewModel.refundPercent,
                        onValueChange = { viewModel.refundPercent = it },
                        label = "Reembolso (%)",
                        keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal,
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Notes — multiline 3 líneas por default (SolennixTextField no
            // expone minLines, uso OutlinedTextField directo aquí).
            Text("Notas", style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedTextField(
                value = viewModel.notes,
                onValueChange = { viewModel.notes = it },
                label = { Text("Notas del evento") },
                placeholder = { Text("Instrucciones especiales, observaciones...") },
                modifier = Modifier.fillMaxWidth(),
                minLines = 3,
                maxLines = 6,
                shape = MaterialTheme.shapes.small,
                colors = OutlinedTextFieldDefaults.colors(
                    focusedBorderColor = SolennixTheme.colors.primary,
                    focusedLabelColor = SolennixTheme.colors.primary,
                    cursorColor = SolennixTheme.colors.primary,
                ),
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

/**
 * Botón segmentado compacto para el selector de tipo de descuento (% o $).
 * Mismo patrón visual que el toggle de iOS en Step5: 44x36, background primary
 * cuando seleccionado, surface alt cuando no.
 */
@Composable
private fun DiscountTypeButton(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    Box(
        modifier = Modifier
            .size(width = 44.dp, height = 56.dp)
            .clickable { onClick() }
            .background(
                if (selected) SolennixTheme.colors.primary
                else Color.Transparent
            ),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            label,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = if (selected) Color.White else SolennixTheme.colors.secondaryText,
        )
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

/**
 * Stepper de invitados — usa OutlinedTextField read-only para quedar idéntico
 * en altura y estilo a los demás fields (ej. "Tipo de Servicio"). Los botones
 * -/+ son IconButton de tamaño M3 default (48dp touch target) — cómodos para
 * el dedo. Label flota arriba como cualquier Material TextField.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun GuestCountStepper(
    value: Int,
    onValueChange: (Int) -> Unit,
) {
    OutlinedTextField(
        value = value.toString(),
        onValueChange = {},
        readOnly = true,
        label = { Text("Personas") },
        textStyle = LocalTextStyle.current.copy(
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            fontWeight = FontWeight.SemiBold,
        ),
        leadingIcon = {
            IconButton(
                onClick = { if (value > 1) onValueChange(value - 1) },
                enabled = value > 1,
            ) {
                Icon(
                    Icons.Default.RemoveCircle,
                    contentDescription = "Menos",
                    tint = if (value > 1) SolennixTheme.colors.primary
                           else SolennixTheme.colors.secondaryText,
                    modifier = Modifier.size(28.dp),
                )
            }
        },
        trailingIcon = {
            IconButton(onClick = { onValueChange(value + 1) }) {
                Icon(
                    Icons.Default.AddCircle,
                    contentDescription = "Más",
                    tint = SolennixTheme.colors.primary,
                    modifier = Modifier.size(28.dp),
                )
            }
        },
        modifier = Modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.small,
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = SolennixTheme.colors.borderLight,
            unfocusedBorderColor = SolennixTheme.colors.borderLight,
            focusedLabelColor = SolennixTheme.colors.secondaryText,
        ),
    )
}

/**
 * Read-only OutlinedTextField con icono de reloj que abre el TimePicker M3
 * al tap. Patrón nativo Android para selección de hora.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TimePickerField(
    label: String,
    value: String,
    onClick: () -> Unit,
) {
    val isBlank = value.isBlank()
    // Cuando no hay hora cargada, mostramos "Opcional" como texto del field
    // (iOS hace lo mismo). Truco: al pasar un value no vacío, el label flota
    // al tope del OutlinedTextField aún con enabled=false; sin eso, el label
    // quedaría en el medio y no se vería la pista de "opcional".
    val displayValue = if (isBlank) "Opcional" else value
    OutlinedTextField(
        value = displayValue,
        onValueChange = {},
        label = { Text(label) },
        readOnly = true,
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        trailingIcon = {
            IconButton(onClick = onClick) {
                Icon(Icons.Default.Schedule, contentDescription = label)
            }
        },
        shape = RoundedCornerShape(12.dp),
        enabled = false,
        colors = OutlinedTextFieldDefaults.colors(
            disabledTextColor = if (isBlank) SolennixTheme.colors.secondaryText
                                else SolennixTheme.colors.primaryText,
            disabledBorderColor = SolennixTheme.colors.borderLight,
            disabledLabelColor = SolennixTheme.colors.secondaryText,
            disabledTrailingIconColor = SolennixTheme.colors.primary,
            disabledContainerColor = SolennixTheme.colors.card,
        ),
    )
}

/**
 * Diálogo nativo M3 TimePicker. Se abre en modo Input (teclado numérico)
 * con toggle para switchear a dial. 24h por default siguiendo el locale.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun TimePickerDialogM3(
    initialTime: java.time.LocalTime?,
    onDismiss: () -> Unit,
    onConfirm: (Int, Int) -> Unit,
) {
    val state = rememberTimePickerState(
        initialHour = initialTime?.hour ?: 18,
        initialMinute = initialTime?.minute ?: 0,
        is24Hour = true,
    )
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Elegir hora") },
        text = {
            TimePicker(state = state)
        },
        confirmButton = {
            TextButton(onClick = { onConfirm(state.hour, state.minute) }) {
                Text("Aceptar")
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text("Cancelar") }
        },
    )
}

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
