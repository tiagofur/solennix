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
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
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
import com.creapolis.solennix.feature.events.R
import com.creapolis.solennix.feature.events.viewmodel.EventFormViewModel
import com.creapolis.solennix.feature.events.viewmodel.SelectedStaffAssignment
import kotlinx.coroutines.launch
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
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
        contentWindowInsets = WindowInsets(0),
        topBar = {
            SolennixTopAppBar(
                title = { Text(stringResource(if (viewModel.isEditMode) R.string.events_form_title_edit else R.string.events_form_title_new)) },
                onSearchClick = onSearchClick,
                navigationIcon = {
                    IconButton(onClick = onNavigateBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.events_form_back))
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
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
                Column(modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .navigationBarsPadding()
                    .imePadding()
                ) {
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
                        modifier = Modifier.weight(1f),
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

                    // Bottom step navigation — inside Column so IME insets are respected
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
            }
        }
    }

    if (viewModel.saveSuccess) {
        LaunchedEffect(Unit) { onNavigateBack() }
    }

    viewModel.saveError?.let { error ->
        AlertDialog(
            onDismissRequest = { viewModel.saveError = null },
            title = { Text(stringResource(R.string.events_form_error_title)) },
            text = { Text(error) },
            confirmButton = {
                TextButton(onClick = { viewModel.saveError = null }) {
                    Text(stringResource(R.string.events_form_ok))
                }
            }
        )
    }

    viewModel.planLimitMessage?.let { message ->
        UpgradePlanDialog(
            message = message,
            onUpgradeClick = {
                viewModel.planLimitMessage = null
                onNavigateBack()
            },
            onDismiss = { viewModel.planLimitMessage = null }
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
            text = stringResource(R.string.events_form_load_error_title),
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
            Text(stringResource(R.string.events_form_retry))
        }
        Spacer(modifier = Modifier.height(8.dp))
        TextButton(onClick = onNavigateBack) {
            Text(stringResource(R.string.events_form_back_action))
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
                    Text(stringResource(R.string.events_form_previous))
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
                    text = if (isLastPage) (if (isEditMode) stringResource(R.string.events_form_save_changes) else stringResource(R.string.events_form_finish)) else stringResource(R.string.events_form_next),
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
        StepMeta(Icons.Default.Info, stringResource(R.string.events_form_step_general)),
        StepMeta(Icons.Default.Inventory2, stringResource(R.string.events_form_step_products)),
        StepMeta(Icons.Default.AutoAwesome, stringResource(R.string.events_form_step_extras)),
        StepMeta(Icons.Default.ShoppingCart, stringResource(R.string.events_form_step_inventory)),
        StepMeta(Icons.Default.Payments, stringResource(R.string.events_form_step_finances)),
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
    val context = LocalContext.current
    val locale = context.resources.configuration.locales[0] ?: Locale.getDefault()
    var showClientPicker by remember { mutableStateOf(false) }
    var showDatePicker by remember { mutableStateOf(false) }
    var showStartTimePicker by remember { mutableStateOf(false) }
    var showEndTimePicker by remember { mutableStateOf(false) }
    var showStatusMenu by remember { mutableStateOf(false) }
    var showQuickClientDialog by remember { mutableStateOf(false) }

    val statusLabels = mapOf(
        EventStatus.QUOTED to stringResource(R.string.events_form_general_status_quoted),
        EventStatus.CONFIRMED to stringResource(R.string.events_form_general_status_confirmed),
        EventStatus.COMPLETED to stringResource(R.string.events_form_general_status_completed),
        EventStatus.CANCELLED to stringResource(R.string.events_form_general_status_cancelled)
    )

    LazyColumn(
        modifier = Modifier
            .padding(24.dp)
            .imePadding()
    ) {
        item {
            AdaptiveCenteredContent(maxWidth = 800.dp) {
            Column {

            // Client Selection
            Text(stringResource(R.string.events_form_general_client), style = MaterialTheme.typography.labelMedium, color = SolennixTheme.colors.secondaryText)
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
                        text = viewModel.selectedClient?.name ?: stringResource(R.string.events_form_general_select_client),
                        style = MaterialTheme.typography.bodyLarge,
                        color = if (viewModel.selectedClient == null) SolennixTheme.colors.secondaryText else SolennixTheme.colors.primaryText,
                        modifier = Modifier.weight(1f)
                    )
                    Icon(Icons.Default.ChevronRight, contentDescription = null, tint = SolennixTheme.colors.secondaryText)
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            // Date Selection
            Text(stringResource(R.string.events_form_general_event_date), style = MaterialTheme.typography.labelMedium, color = SolennixTheme.colors.secondaryText)
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
                        text = viewModel.eventDate.format(DateTimeFormatter.ofLocalizedDate(FormatStyle.LONG).localizedBy(locale)),
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
                        label = stringResource(R.string.events_form_general_start_time),
                        value = viewModel.startTime,
                        onClick = { showStartTimePicker = true },
                    )
                }
                Box(modifier = Modifier.weight(1f)) {
                    TimePickerField(
                        label = stringResource(R.string.events_form_general_end_time),
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
                        label = stringResource(R.string.events_form_general_service_type),
                        placeholder = stringResource(R.string.events_form_general_service_placeholder)
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
                        label = stringResource(R.string.events_form_general_location),
                        placeholder = stringResource(R.string.events_form_general_location_placeholder)
                    )
                },
                right = {
                    SolennixTextField(
                        value = viewModel.city,
                        onValueChange = { viewModel.city = it },
                        label = stringResource(R.string.events_form_general_city),
                        placeholder = stringResource(R.string.events_form_general_city_placeholder)
                    )
                }
            )

            Spacer(modifier = Modifier.height(16.dp))

            // ExposedDropdownMenu en vez de FilterChip row — 4 chips en una
            // pantalla pequeña hacían wrap a 2 líneas. Un single-line dropdown
            // es el patrón M3 cuando hay 3+ opciones exclusivas.
            Text(stringResource(R.string.events_form_general_status), style = MaterialTheme.typography.labelMedium, color = SolennixTheme.colors.secondaryText)
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
                label = { Text(stringResource(R.string.events_form_general_notes)) },
                placeholder = { Text(stringResource(R.string.events_form_general_notes_placeholder)) },
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
                    Text(stringResource(R.string.events_form_general_select_client_title), style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
                    TextButton(onClick = { showQuickClientDialog = true }) {
                        Icon(Icons.Default.Add, contentDescription = null)
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(stringResource(R.string.events_form_general_new_client))
                    }
                }
                Spacer(modifier = Modifier.height(16.dp))
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { viewModel.onClientSearchQueryChange(it) },
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = { Text(stringResource(R.string.events_form_general_search_client)) },
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
                }) { Text(stringResource(R.string.events_form_general_select)) }
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
            title = { Text(stringResource(R.string.events_form_general_quick_client_title)) },
            text = {
                Column {
                    SolennixTextField(value = name, onValueChange = { name = it }, label = stringResource(R.string.events_form_general_full_name))
                    Spacer(modifier = Modifier.height(8.dp))
                    SolennixTextField(value = email, onValueChange = { email = it }, label = stringResource(R.string.events_form_general_email), keyboardType = androidx.compose.ui.text.input.KeyboardType.Email)
                    Spacer(modifier = Modifier.height(8.dp))
                    SolennixTextField(value = phone, onValueChange = { phone = it }, label = stringResource(R.string.events_form_general_phone), keyboardType = androidx.compose.ui.text.input.KeyboardType.Phone)
                    
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
                    else Text(stringResource(R.string.events_form_general_save))
                }
            },
            dismissButton = {
                TextButton(onClick = { showQuickClientDialog = false }) { Text(stringResource(R.string.events_form_cancel)) }
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
    Column(
        modifier = Modifier
            .padding(24.dp)
            .verticalScroll(rememberScrollState())
            .imePadding()
    ) {
        // Botón prominente de "Agregar Producto" — mismo patrón que iOS.
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
                    stringResource(R.string.events_form_products_add),
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
                        viewModel.productLoadError ?: stringResource(R.string.events_form_products_load_error),
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.error
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    TextButton(onClick = { viewModel.retryLoadProducts() }) {
                        Text(stringResource(R.string.events_form_retry))
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
                    stringResource(R.string.events_form_products_empty_title),
                    style = MaterialTheme.typography.titleMedium,
                    color = SolennixTheme.colors.secondaryText,
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    stringResource(R.string.events_form_products_empty_desc),
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText,
                )
            }
        } else {
            // LazyColumn removed: outer Column already has verticalScroll.
            // Nesting a lazy scrollable in the same direction causes an
            // IllegalStateException at runtime. A plain Column is sufficient
            // because event product lists are short (< 50 items).
            Column(modifier = Modifier.fillMaxWidth()) {
                if (isWideScreen) {
                    val chunkedProducts = viewModel.selectedProducts.chunked(2)
                    chunkedProducts.forEachIndexed { chunkIndex, pair ->
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                            Box(modifier = Modifier.weight(1f)) {
                                ProductSelectionItem(
                                    index = chunkIndex * 2,
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
                                        index = chunkIndex * 2 + 1,
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
                    viewModel.selectedProducts.forEachIndexed { index, item ->
                        ProductSelectionItem(
                            index = index,
                            item = item,
                            availableProducts = availableProducts,
                            onQuantityChange = { viewModel.updateProductQuantity(item.productId, it) },
                            onDiscountChange = { viewModel.updateProductDiscount(item.productId, it) },
                            onRemove = { viewModel.removeProduct(item.productId) },
                        )
                    }
                }

                // Subtotal Productos — mismo patrón visual que iOS.
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
                            stringResource(R.string.events_form_products_subtotal),
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
    index: Int,
    item: com.creapolis.solennix.core.model.EventProduct,
    availableProducts: List<com.creapolis.solennix.core.model.Product>,
    onQuantityChange: (Double) -> Unit,
    onDiscountChange: (Double) -> Unit,
    onRemove: () -> Unit,
) {
    val product = availableProducts.find { it.id == item.productId } ?: return
    // Ojo: la key del remember es item.id (no item.discount). Si usáramos el
    // discount como key, cada keystroke dispararía la VM → rebote al state
    // local → texto sobrescrito (aparecía "2.0" tras tipear "2" y se borraba
    // al intentar tipear un decimal). Con item.id el texto es autoritativo
    // durante la edición y sólo se recalcula si esta fila se rebinda a otro
    // producto.
    var discountText by remember(item.id) {
        mutableStateOf(if (item.discount > 0) formatDiscountClean(item.discount) else "")
    }
    var showDeleteDialog by remember { mutableStateOf(false) }
    val effectivePrice = item.unitPrice - item.discount
    val lineTotal = effectivePrice * item.quantity

    if (showDeleteDialog) {
        AlertDialog(
            onDismissRequest = { showDeleteDialog = false },
            title = { Text(stringResource(R.string.events_form_products_delete_named, product.name)) },
            confirmButton = {
                TextButton(
                    onClick = {
                        showDeleteDialog = false
                        onRemove()
                    }
                ) {
                    Text(stringResource(R.string.events_form_products_delete), color = SolennixTheme.colors.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDeleteDialog = false }) { Text(stringResource(R.string.events_form_cancel)) }
            }
        )
    }

    Card(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        border = androidx.compose.foundation.BorderStroke(1.dp, SolennixTheme.colors.borderLight),
        shape = MaterialTheme.shapes.medium
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            // Header: ordinal + trash rojo alineado a la derecha. Paridad
            // visual con EditableExtraCard — trash vive en su propia fila
            // separado del contenido.
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    stringResource(R.string.events_form_products_row_title, index + 1),
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = SolennixTheme.colors.secondaryText,
                    modifier = Modifier.weight(1f),
                )
                IconButton(onClick = { showDeleteDialog = true }, modifier = Modifier.size(32.dp)) {
                    Icon(
                        Icons.Default.Delete,
                        contentDescription = stringResource(R.string.events_form_products_delete_a11y),
                        tint = SolennixTheme.colors.error,
                        modifier = Modifier.size(18.dp),
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        product.name,
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.Medium,
                    )
                    Text(
                        stringResource(R.string.events_form_products_unit_price, item.unitPrice.asMXN()),
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
                                    stringResource(R.string.events_form_products_includes_team),
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

                // Stepper con hit target Material mínimo (44dp). Cantidad
                // con ancho fijo de 36dp + FontFeatureSettings tabular para
                // que 1, 99, 999 ocupen lo mismo y los botones no se muevan.
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(0.dp)
                ) {
                    IconButton(
                        onClick = { onQuantityChange(item.quantity - 1.0) },
                        enabled = item.quantity > 1,
                        modifier = Modifier.size(44.dp),
                    ) {
                        Icon(
                            Icons.Default.RemoveCircle,
                            contentDescription = stringResource(R.string.events_form_products_decrease_a11y),
                            tint = if (item.quantity > 1) SolennixTheme.colors.primary
                                   else SolennixTheme.colors.secondaryText,
                            modifier = Modifier.size(26.dp),
                        )
                    }
                    EditableQuantityField(
                        value = item.quantity.toInt(),
                        onValueChange = { onQuantityChange(it.toDouble()) },
                        minValue = 1,
                        key = item.productId,
                        width = 36.dp,
                        textStyle = MaterialTheme.typography.bodyLarge.copy(
                            fontWeight = FontWeight.SemiBold,
                        ),
                    )
                    IconButton(
                        onClick = { onQuantityChange(item.quantity + 1.0) },
                        modifier = Modifier.size(44.dp),
                    ) {
                        Icon(
                            Icons.Default.AddCircle,
                            contentDescription = stringResource(R.string.events_form_products_increase_a11y),
                            tint = SolennixTheme.colors.primary,
                            modifier = Modifier.size(26.dp),
                        )
                    }
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
                    onValueChange = { raw ->
                        // Aceptamos coma como separador decimal (teclado
                        // LATAM) y solo dejamos pasar input numérico parcial
                        // válido — incluye estados intermedios como "2." o
                        // ".5" para que el usuario pueda tipear decimales
                        // fluido sin que el filtro los rechace.
                        val normalized = raw.replace(',', '.')
                        if (normalized.isEmpty() || normalized.matches(Regex("""^\d*\.?\d*$"""))) {
                            discountText = normalized
                            onDiscountChange(normalized.toDoubleOrNull() ?: 0.0)
                        }
                    },
                    label = { Text(stringResource(R.string.events_form_products_discount)) },
                    placeholder = { Text("0") },
                    modifier = Modifier.width(140.dp),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal),
                    shape = MaterialTheme.shapes.small,
                )
                Spacer(modifier = Modifier.width(12.dp))
                Text(
                    text = stringResource(R.string.events_form_products_total, lineTotal.asMXN()),
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
    Column(
        modifier = Modifier
            .padding(24.dp)
            .verticalScroll(rememberScrollState())
            .imePadding()
    ) {
        // Botón prominente "Agregar Extra" — mismo patrón que iOS y que
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
                    stringResource(R.string.events_form_extras_add),
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
                    stringResource(R.string.events_form_extras_empty_title),
                    style = MaterialTheme.typography.titleMedium,
                    color = SolennixTheme.colors.secondaryText,
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    stringResource(R.string.events_form_extras_empty_desc),
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
                            stringResource(R.string.events_form_extras_subtotal),
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
    // Texto local del card. Clave = extra.id SOLO — usar el cost/price como
    // clave hacía que cada keystroke rebote del VM y re-semille el texto,
    // forzando cosas como "2.00000" (Java %g no trunca ceros como Swift) y
    // borrando decimales en curso. Con id estable, el input del usuario es
    // autoritativo mientras edita.
    var costText by remember(extra.id) {
        mutableStateOf(if (extra.cost > 0) formatDiscountClean(extra.cost) else "")
    }
    var priceText by remember(extra.id) {
        mutableStateOf(if (extra.price > 0) formatDiscountClean(extra.price) else "")
    }
    // Cuando el toggle "solo costo" está on, el precio se fuerza = costo. En
    // vez de mantener los dos estados sincronizados a mano, derivamos el
    // display del price field desde el costText — un solo source of truth.
    val displayedPriceText = if (extra.excludeUtility) costText else priceText

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        border = androidx.compose.foundation.BorderStroke(1.dp, SolennixTheme.colors.borderLight),
        shape = MaterialTheme.shapes.medium,
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    stringResource(R.string.events_form_extras_row_title, index + 1),
                    style = MaterialTheme.typography.labelSmall,
                    fontWeight = FontWeight.SemiBold,
                    color = SolennixTheme.colors.secondaryText,
                    modifier = Modifier.weight(1f),
                )
                IconButton(onClick = onRemove, modifier = Modifier.size(32.dp)) {
                    Icon(
                        Icons.Default.Delete,
                        contentDescription = stringResource(R.string.events_form_extras_delete_a11y),
                        tint = SolennixTheme.colors.error,
                        modifier = Modifier.size(18.dp),
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            SolennixTextField(
                value = extra.description,
                onValueChange = onDescriptionChange,
                label = stringResource(R.string.events_form_extras_description),
                placeholder = stringResource(R.string.events_form_extras_description_placeholder),
                leadingIcon = Icons.Default.Description,
            )

            Spacer(modifier = Modifier.height(8.dp))

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(
                    value = costText,
                    onValueChange = { raw ->
                        val normalized = raw.replace(',', '.')
                        if (normalized.isEmpty() || normalized.matches(Regex("""^\d*\.?\d*$"""))) {
                            costText = normalized
                            onCostChange(normalized.toDoubleOrNull() ?: 0.0)
                        }
                    },
                    label = { Text(stringResource(R.string.events_form_extras_cost)) },
                    placeholder = { Text("0.00") },
                    leadingIcon = { Text("$", color = SolennixTheme.colors.secondaryText) },
                    keyboardOptions = KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal),
                    singleLine = true,
                    shape = MaterialTheme.shapes.small,
                    modifier = Modifier.weight(1f),
                )
                OutlinedTextField(
                    value = displayedPriceText,
                    onValueChange = { raw ->
                        if (!extra.excludeUtility) {
                            val normalized = raw.replace(',', '.')
                            if (normalized.isEmpty() || normalized.matches(Regex("""^\d*\.?\d*$"""))) {
                                priceText = normalized
                                onPriceChange(normalized.toDoubleOrNull() ?: 0.0)
                            }
                        }
                    },
                    label = { Text(stringResource(R.string.events_form_extras_price)) },
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
                    stringResource(R.string.events_form_extras_exclude_utility),
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText,
                    modifier = Modifier.weight(1f),
                )
                Switch(
                    checked = extra.excludeUtility,
                    onCheckedChange = onExcludeUtilityChange,
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
                    stringResource(R.string.events_form_extras_include_checklist),
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
            stringResource(R.string.events_form_inventory_equipment),
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
                        Text(stringResource(R.string.events_form_inventory_conflicts), style = MaterialTheme.typography.labelMedium, color = SolennixTheme.colors.error)
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
                        Text(stringResource(R.string.events_form_inventory_suggestions), style = MaterialTheme.typography.labelMedium, color = SolennixTheme.colors.warning)
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

        AddItemCard(label = stringResource(R.string.events_form_inventory_add_equipment)) { showEquipmentPicker = true }

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
                    stringResource(R.string.events_form_inventory_empty_equipment_title),
                    style = MaterialTheme.typography.titleSmall,
                    color = SolennixTheme.colors.secondaryText,
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    stringResource(R.string.events_form_inventory_empty_equipment_desc),
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
            stringResource(R.string.events_form_inventory_staff),
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
    // Stock no es date-aware: es total de inventario sin descontar reservas
    // del mismo día (ver banner de conflictos arriba). Follow-up en issue.
    val stock = equipment.currentStock
    val overstock = stock != null && stock > 0 && equipment.quantity > stock

    Card(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        border = androidx.compose.foundation.BorderStroke(1.dp, SolennixTheme.colors.borderLight),
        shape = MaterialTheme.shapes.medium
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    equipment.equipmentName ?: stringResource(R.string.events_detail_equipment_fallback),
                    style = MaterialTheme.typography.bodyLarge,
                    fontWeight = FontWeight.Medium,
                )
                // Stock + unit debajo del nombre. Rojo + warning cuando qty
                // > stock — feedback inline sin bloquear (el usuario puede
                // querer ordenar más igual).
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp),
                ) {
                    if (overstock) {
                        Icon(
                            Icons.Default.Warning,
                            contentDescription = null,
                            tint = SolennixTheme.colors.error,
                            modifier = Modifier.size(12.dp),
                        )
                    }
                    Text(
                        stockLabel(stock = stock, unit = equipment.unit),
                        style = MaterialTheme.typography.bodySmall,
                        color = if (overstock) SolennixTheme.colors.error else SolennixTheme.colors.secondaryText,
                    )
                }
            }

            // Stepper con hit area Material 44dp + width fija de 36dp
            // (paridad con Paso 2). Evita que el layout salte con 3 dígitos.
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(
                    onClick = { onQuantityChange(equipment.quantity - 1) },
                    enabled = equipment.quantity > 1,
                    modifier = Modifier.size(44.dp),
                ) {
                    Icon(
                        Icons.Default.RemoveCircle,
                        contentDescription = stringResource(R.string.events_form_products_decrease_a11y),
                        tint = if (equipment.quantity > 1) SolennixTheme.colors.primary
                               else SolennixTheme.colors.secondaryText,
                        modifier = Modifier.size(26.dp),
                    )
                }
                EditableQuantityField(
                    value = equipment.quantity,
                    onValueChange = { onQuantityChange(it) },
                    minValue = 1,
                    key = equipment.inventoryId,
                    width = 36.dp,
                    textStyle = MaterialTheme.typography.bodyLarge.copy(
                        fontWeight = FontWeight.SemiBold,
                    ),
                    colorOverride = if (overstock) SolennixTheme.colors.error else null,
                )
                IconButton(
                    onClick = { onQuantityChange(equipment.quantity + 1) },
                    modifier = Modifier.size(44.dp),
                ) {
                    Icon(
                        Icons.Default.AddCircle,
                        contentDescription = stringResource(R.string.events_form_products_increase_a11y),
                        tint = SolennixTheme.colors.primary,
                        modifier = Modifier.size(26.dp),
                    )
                }
            }

            IconButton(onClick = onRemove) {
                Icon(
                    Icons.Default.Delete,
                    contentDescription = stringResource(R.string.events_form_products_delete_a11y),
                    tint = SolennixTheme.colors.error,
                )
            }
        }
    }
}

@Composable
private fun stockLabel(stock: Double?, unit: String?): String {
    val stockStr = stock?.let {
        if (it % 1.0 == 0.0) it.toInt().toString() else "%.1f".format(it)
    } ?: stringResource(R.string.events_form_inventory_not_available)
    return if (unit.isNullOrBlank()) {
        stringResource(R.string.events_form_inventory_stock_only_value, stockStr)
    } else {
        stringResource(R.string.events_form_inventory_stock_value, stockStr, unit)
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
            Text(stringResource(R.string.events_form_inventory_select_equipment), style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(bottom = 12.dp))
            SolennixTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                label = stringResource(R.string.events_form_inventory_search_equipment),
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
                                    stringResource(R.string.events_form_inventory_available_value, item.currentStock.toInt().toString(), item.unit),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = SolennixTheme.colors.secondaryText
                                )
                            }
                            if (isSelected) {
                                Icon(Icons.Default.CheckCircle, contentDescription = stringResource(R.string.events_form_products_selected_a11y), tint = SolennixTheme.colors.success, modifier = Modifier.size(20.dp))
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
            stringResource(R.string.events_form_inventory_supplies),
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
                        Text(stringResource(R.string.events_form_inventory_suggestions), style = MaterialTheme.typography.labelMedium, color = SolennixTheme.colors.warning)
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
        AddItemCard(label = stringResource(R.string.events_form_inventory_add_supply)) { showSupplyPicker = true }

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
                    stringResource(R.string.events_form_inventory_empty_supplies_title),
                    style = MaterialTheme.typography.titleSmall,
                    color = SolennixTheme.colors.secondaryText,
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    stringResource(R.string.events_form_inventory_empty_supplies_desc),
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
                        stringResource(R.string.events_form_inventory_supplies_cost),
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
                .imePadding()
        ) {
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
    // Si la unidad es contable (unidad, pz, bolsa, caja…) mostramos stepper
    // +/- 1. Si es pesada/líquida (kg, L, g, ml…) mostramos text field
    // decimal. No tiene sentido pedir 1.5 bolsas pero sí 0.5 kg de sal.
    val isInteger = isIntegerSupplyUnit(supply.unit)
    var qtyText by remember(supply.inventoryId, isInteger) {
        mutableStateOf(
            if (isInteger) supply.quantity.toInt().toString()
            else if (supply.quantity > 0) "%.1f".format(supply.quantity) else ""
        )
    }

    Card(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        border = androidx.compose.foundation.BorderStroke(1.dp, SolennixTheme.colors.borderLight),
        shape = MaterialTheme.shapes.medium
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(supply.supplyName ?: stringResource(R.string.events_detail_supplies_fallback), style = MaterialTheme.typography.titleSmall)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        val unit = supply.unit
                        if (unit != null) {
                            Text(stringResource(R.string.events_form_inventory_unit_value, unit), style = MaterialTheme.typography.bodySmall, color = SolennixTheme.colors.secondaryText)
                        }
                        val currentStock = supply.currentStock
                        if (currentStock != null) {
                            Text(
                                stringResource(R.string.events_form_inventory_stock_only_value, String.format("%.1f", currentStock)),
                                style = MaterialTheme.typography.bodySmall,
                                color = if (currentStock >= supply.quantity) SolennixTheme.colors.success else SolennixTheme.colors.error
                            )
                        }
                    }
                    Text(
                        stringResource(R.string.events_form_inventory_cost_formula, supply.unitCost.asMXN(), String.format("%.1f", supply.quantity), (supply.unitCost * supply.quantity).asMXN()),
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.primary
                    )
                }
                IconButton(onClick = onRemove) {
                    Icon(
                        Icons.Default.Delete,
                        contentDescription = stringResource(R.string.events_form_products_delete_a11y),
                        tint = SolennixTheme.colors.error,
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Quantity controls: stepper si es contable, text field si decimal.
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (isInteger) {
                    IconButton(
                        onClick = { onQuantityChange((supply.quantity - 1).coerceAtLeast(1.0)) },
                        enabled = supply.quantity > 1,
                        modifier = Modifier.size(36.dp)
                    ) {
                        Icon(
                            Icons.Default.RemoveCircle,
                            contentDescription = stringResource(R.string.events_form_products_decrease_a11y),
                            tint = if (supply.quantity > 1) SolennixTheme.colors.primary
                                   else SolennixTheme.colors.secondaryText,
                            modifier = Modifier.size(22.dp),
                        )
                    }
                    EditableQuantityField(
                        value = supply.quantity.toInt(),
                        onValueChange = { onQuantityChange(it.toDouble()) },
                        minValue = 1,
                        key = supply.inventoryId,
                        width = 32.dp,
                        textStyle = MaterialTheme.typography.titleMedium.copy(
                            fontWeight = FontWeight.Bold,
                        ),
                    )
                    IconButton(
                        onClick = { onQuantityChange(supply.quantity + 1) },
                        modifier = Modifier.size(36.dp)
                    ) {
                        Icon(
                            Icons.Default.AddCircle,
                            contentDescription = stringResource(R.string.events_form_products_increase_a11y),
                            tint = SolennixTheme.colors.primary,
                            modifier = Modifier.size(22.dp),
                        )
                    }
                } else {
                    OutlinedTextField(
                        value = qtyText,
                        onValueChange = { raw ->
                            val normalized = raw.replace(',', '.')
                            if (normalized.isEmpty() || normalized.matches(Regex("""^\d*\.?\d*$"""))) {
                                qtyText = normalized
                                onQuantityChange(normalized.toDoubleOrNull() ?: 0.0)
                            }
                        },
                        label = { Text(stringResource(R.string.events_form_inventory_quantity)) },
                        placeholder = { Text("0.0") },
                        modifier = Modifier.width(110.dp),
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal),
                        shape = MaterialTheme.shapes.small,
                    )
                }

                Spacer(modifier = Modifier.width(12.dp))

                // Source toggle
                FilterChip(
                    selected = supply.source == SupplySource.STOCK,
                    onClick = { onSourceChange(SupplySource.STOCK) },
                    label = { Text(stringResource(R.string.events_form_inventory_source_stock)) }
                )
                FilterChip(
                    selected = supply.source == SupplySource.PURCHASE,
                    onClick = { onSourceChange(SupplySource.PURCHASE) },
                    label = { Text(stringResource(R.string.events_form_inventory_source_purchase)) }
                )
            }

            // Exclude cost (only for stock items). Switch — paridad con
            // los otros toggles (Extras "Solo cobrar costo", etc.)
            if (supply.source == SupplySource.STOCK) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        stringResource(R.string.events_form_inventory_exclude_cost),
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.secondaryText,
                        modifier = Modifier.weight(1f),
                    )
                    Switch(
                        checked = supply.excludeCost,
                        onCheckedChange = { onExcludeCostChange(it) },
                        colors = androidx.compose.material3.SwitchDefaults.colors(
                            checkedThumbColor = SolennixTheme.colors.primary,
                            checkedTrackColor = SolennixTheme.colors.primary.copy(alpha = 0.5f),
                        ),
                    )
                }
            }
        }
    }
}

private fun isIntegerSupplyUnit(unit: String?): Boolean {
    val normalized = unit?.trim()?.lowercase().orEmpty()
    if (normalized.isEmpty()) return true
    return normalized in setOf(
        "unidad", "unidades", "u", "ud", "uds",
        "pz", "pza", "pzas", "pieza", "piezas",
        "bolsa", "bolsas",
        "caja", "cajas",
        "botella", "botellas",
        "pack", "packs",
    )
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
            Text(stringResource(R.string.events_form_inventory_select_supply), style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(bottom = 12.dp))
            SolennixTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                label = stringResource(R.string.events_form_inventory_search_supply),
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
                                        stringResource(R.string.events_form_inventory_stock_value, String.format("%.1f", item.currentStock), item.unit),
                                        style = MaterialTheme.typography.bodySmall,
                                        color = SolennixTheme.colors.secondaryText
                                    )
                                    val unitCost = item.unitCost
                                    if (unitCost != null) {
                                        Text(
                                            stringResource(R.string.events_form_inventory_unit_cost_value, unitCost.asMXN(), item.unit),
                                            style = MaterialTheme.typography.bodySmall,
                                            color = SolennixTheme.colors.primary
                                        )
                                    }
                                }
                            }
                            if (isSelected) {
                                Icon(Icons.Default.CheckCircle, contentDescription = stringResource(R.string.events_form_products_selected_a11y), tint = SolennixTheme.colors.success, modifier = Modifier.size(20.dp))
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
                .imePadding()
        ) {
            Spacer(modifier = Modifier.height(20.dp))

            // Discount section — tipo (%/$) como chips segmented ANTES del
            // textfield (mismo patrón que iOS). Siempre una sola línea, no
            // stackea en phone.
            Text(stringResource(R.string.events_form_summary_discount_title), style = MaterialTheme.typography.titleMedium)
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
                    label = if (viewModel.discountType == DiscountType.PERCENT) stringResource(R.string.events_form_summary_discount_percent) else stringResource(R.string.events_form_summary_discount_amount),
                    keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal,
                    modifier = Modifier.weight(1f),
                )
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Invoice / Tax section
            Text(stringResource(R.string.events_form_summary_invoice_title), style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(8.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(stringResource(R.string.events_form_summary_invoice_required), style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
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
                    label = stringResource(R.string.events_form_summary_tax_rate),
                    keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal
                )
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Deposit section — % a la izquierda, monto calculado a la
            // derecha. Siempre una línea (no stackea), igual que iOS.
            Text(stringResource(R.string.events_form_summary_deposit_title), style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(8.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                SolennixTextField(
                    value = viewModel.depositPercent,
                    onValueChange = { viewModel.depositPercent = it },
                    label = stringResource(R.string.events_form_summary_deposit_percent),
                    keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal,
                    modifier = Modifier.weight(1f),
                )
                Text(
                    stringResource(R.string.events_form_summary_deposit_amount, depositAmount.asMXN()),
                    style = MaterialTheme.typography.titleSmall,
                    color = SolennixTheme.colors.primary,
                    fontWeight = FontWeight.SemiBold,
                )
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Cancellation policy — 2 columnas inline siempre (no stackea).
            Text(stringResource(R.string.events_form_summary_cancellation_title), style = MaterialTheme.typography.titleMedium)
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
                        label = stringResource(R.string.events_form_summary_cancellation_days),
                        keyboardType = androidx.compose.ui.text.input.KeyboardType.Number,
                    )
                }
                Box(modifier = Modifier.weight(1f)) {
                    SolennixTextField(
                        value = viewModel.refundPercent,
                        onValueChange = { viewModel.refundPercent = it },
                        label = stringResource(R.string.events_form_summary_refund_percent),
                        keyboardType = androidx.compose.ui.text.input.KeyboardType.Decimal,
                    )
                }
            }

            Spacer(modifier = Modifier.height(20.dp))

            // Notes — multiline 3 líneas por default (SolennixTextField no
            // expone minLines, uso OutlinedTextField directo aquí).
            Text(stringResource(R.string.events_form_summary_notes_title), style = MaterialTheme.typography.titleMedium)
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedTextField(
                value = viewModel.notes,
                onValueChange = { viewModel.notes = it },
                label = { Text(stringResource(R.string.events_form_summary_notes_label)) },
                placeholder = { Text(stringResource(R.string.events_form_summary_notes_placeholder)) },
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
                    Text(stringResource(R.string.events_form_summary_summary), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(12.dp))

                    if (viewModel.hasPendingProductCosts) {
                        Text(
                            stringResource(R.string.events_form_summary_pending_costs),
                            style = MaterialTheme.typography.bodySmall,
                            color = SolennixTheme.colors.warning
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                    }

                    SummaryRow(stringResource(R.string.events_form_summary_subtotal_products), viewModel.subtotalProducts.asMXN())
                    SummaryRow(stringResource(R.string.events_form_summary_subtotal_extras), viewModel.subtotalExtras.asMXN())

                    if (viewModel.discountAmount > 0) {
                        SummaryRow(stringResource(R.string.events_form_summary_discount_title), "-${viewModel.discountAmount.asMXN()}", valueColor = SolennixTheme.colors.error)
                    }

                    if (viewModel.requiresInvoice && viewModel.taxAmount > 0) {
                        val rate = viewModel.taxRate.toDoubleOrNull() ?: 0.0
                        SummaryRow(stringResource(R.string.events_form_summary_tax_value, String.format("%.0f", rate)), "+${viewModel.taxAmount.asMXN()}")
                    }

                    HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = SolennixTheme.colors.borderLight)

                    Row(modifier = Modifier.fillMaxWidth()) {
                        Text(stringResource(R.string.events_form_summary_total), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                        Text(viewModel.total.asMXN(), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = SolennixTheme.colors.primary)
                    }

                    Spacer(modifier = Modifier.height(4.dp))
                    SummaryRow(stringResource(R.string.events_form_summary_deposit_value, String.format("%.0f", depositPct)), depositAmount.asMXN(), valueColor = SolennixTheme.colors.primary)

                    HorizontalDivider(modifier = Modifier.padding(vertical = 8.dp), color = SolennixTheme.colors.borderLight)

                    // Profitability section
                    Text(stringResource(R.string.events_form_summary_profitability), style = MaterialTheme.typography.labelMedium, color = SolennixTheme.colors.secondaryText)
                    Spacer(modifier = Modifier.height(6.dp))
                    SummaryRow(stringResource(R.string.events_form_summary_total_costs), viewModel.totalCosts.asMXN())
                    SummaryRow(
                        stringResource(R.string.events_form_summary_net_profit),
                        viewModel.netProfit.asMXN(),
                        valueColor = if (viewModel.netProfit >= 0) SolennixTheme.colors.success else SolennixTheme.colors.error
                    )
                    SummaryRow(
                        stringResource(R.string.events_form_summary_margin),
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
                stringResource(R.string.events_form_products_picker_title),
                style = MaterialTheme.typography.titleLarge,
                modifier = Modifier.padding(bottom = 12.dp)
            )
            SolennixTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                label = stringResource(R.string.events_form_products_search),
                leadingIcon = Icons.Default.Search,
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(modifier = Modifier.height(12.dp))
            if (viewModel.isLoadingProducts && products.value.isEmpty()) {
                Text(
                    stringResource(R.string.events_form_products_loading),
                    style = MaterialTheme.typography.bodyMedium,
                    color = SolennixTheme.colors.secondaryText
                )
            } else if (filteredProducts.isEmpty()) {
                EmptyState(
                    icon = Icons.Default.RestaurantMenu,
                    title = stringResource(R.string.events_form_products_no_results),
                    message = stringResource(R.string.events_form_products_no_results_message),
                    actionText = stringResource(R.string.events_form_retry),
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
                                        contentDescription = stringResource(R.string.events_form_products_selected_a11y),
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
                stringResource(R.string.events_form_staff_assigned_title),
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.weight(1f)
            )
            IconButton(onClick = { showStaffPicker = true }) {
                Icon(
                    Icons.Default.AddCircle,
                    contentDescription = stringResource(R.string.events_form_staff_add_collaborator_a11y),
                    tint = SolennixTheme.colors.primary
                )
            }
        }

        Spacer(modifier = Modifier.height(4.dp))
        Text(
            stringResource(R.string.events_form_staff_helper),
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
                        stringResource(R.string.events_form_staff_empty_catalog_title),
                        style = MaterialTheme.typography.bodyMedium,
                        color = SolennixTheme.colors.primaryText
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        stringResource(R.string.events_form_staff_empty_catalog_desc),
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
                    Text(stringResource(R.string.events_form_staff_add_collaborator))
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
                    Text(stringResource(R.string.events_form_staff_add_team))
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
                    stringResource(R.string.events_form_staff_total_cost, viewModel.costStaff.asMXN()),
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
                Text(stringResource(R.string.events_form_staff_add_team))
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
                        assignment.staffName ?: stringResource(R.string.events_detail_staff_fallback),
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
                        contentDescription = stringResource(R.string.events_form_staff_remove_a11y),
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
                        label = { Text(stringResource(R.string.events_form_staff_fee_optional)) },
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
                        label = { Text(stringResource(R.string.events_form_staff_role_optional)) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            )
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedTextField(
                value = assignment.notes,
                onValueChange = onNotesChange,
                label = { Text(stringResource(R.string.events_form_staff_notes_optional)) },
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
                    if (shiftExpanded) stringResource(R.string.events_form_staff_shift_schedule) else stringResource(R.string.events_form_staff_shift_add),
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
                            startLocalTime?.let { formatTime(it) } ?: stringResource(R.string.events_form_staff_shift_start)
                        )
                    }
                    OutlinedButton(
                        onClick = { showEndPicker = true },
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(Icons.Default.Schedule, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            endLocalTime?.let { formatTime(it) } ?: stringResource(R.string.events_form_staff_shift_end)
                        )
                    }
                    if (startLocalTime != null || endLocalTime != null) {
                        IconButton(onClick = onShiftClear) {
                            Icon(
                                Icons.Default.Clear,
                                contentDescription = stringResource(R.string.events_form_staff_shift_clear_a11y),
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
                        }) { Text(stringResource(R.string.events_form_staff_done)) }
                    },
                    dismissButton = {
                        TextButton(onClick = { showStartPicker = false }) { Text(stringResource(R.string.events_form_cancel)) }
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
                        }) { Text(stringResource(R.string.events_form_staff_done)) }
                    },
                    dismissButton = {
                        TextButton(onClick = { showEndPicker = false }) { Text(stringResource(R.string.events_form_cancel)) }
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
 * Formato de display para el descuento por producto — paridad con iOS
 * que usa `%g`. Un entero se imprime sin el ".0" (2.0 → "2"), un decimal
 * se conserva tal cual (2.5 → "2.5"). Evita que el card muestre "2.0" al
 * abrir un producto con descuento redondo.
 */
private fun formatDiscountClean(value: Double): String =
    if (value == value.toLong().toDouble()) value.toLong().toString() else value.toString()

/**
 * Numero tappable dentro de los steppers +/-. Al tocarlo abre el teclado
 * numerico y permite tipear directamente — evita decenas de clicks cuando
 * la cantidad es alta (100 platos, 200 personas).
 *
 * Estado local (`textValue` con TextFieldValue) es autoritativo mientras el
 * usuario edita. Se hidrata del VM en mount y cuando cambia `key` (rebind a
 * otro item). Durante la edicion, los push del VM NO pisan lo que se tipia.
 * Al blur: clamp a `minValue` y rehidratar display.
 *
 * @param key cualquier valor hashable que cambia al apuntar a otro item
 *        (product.id, extra.id). Gatilla rehidrate.
 * @param minValue clamp al blur. 0 para personas (transitorio), 1 para
 *        productos/equipamiento/insumos.
 */
@Composable
private fun EditableQuantityField(
    value: Int,
    onValueChange: (Int) -> Unit,
    minValue: Int,
    key: Any,
    modifier: Modifier = Modifier,
    width: androidx.compose.ui.unit.Dp = 36.dp,
    textStyle: androidx.compose.ui.text.TextStyle = LocalTextStyle.current,
    colorOverride: androidx.compose.ui.graphics.Color? = null,
) {
    var textValue by remember(key) {
        mutableStateOf(androidx.compose.ui.text.input.TextFieldValue(value.toString()))
    }
    var isFocused by remember { mutableStateOf(false) }

    // Sync cuando el valor cambia desde afuera (stepper +/-, edit event) y
    // el usuario no esta editando. Durante focus, ignorar para no pisar.
    LaunchedEffect(value, isFocused) {
        if (!isFocused && textValue.text != value.toString()) {
            textValue = androidx.compose.ui.text.input.TextFieldValue(value.toString())
        }
    }

    androidx.compose.foundation.text.BasicTextField(
        value = textValue,
        onValueChange = { new ->
            // Filtrar a solo digitos. Permite vacio transitorio (no
            // propaga 0 que podria eliminar el item).
            val digits = new.text.filter { it.isDigit() }
            val filtered = new.copy(text = digits)
            textValue = filtered
            digits.toIntOrNull()?.let { onValueChange(it) }
        },
        modifier = modifier
            .width(width)
            .onFocusChanged { focusState ->
                if (isFocused != focusState.isFocused) {
                    isFocused = focusState.isFocused
                    if (focusState.isFocused) {
                        // Selecciona todo al entrar — tipear pisa.
                        textValue = textValue.copy(
                            selection = androidx.compose.ui.text.TextRange(0, textValue.text.length)
                        )
                    } else {
                        // Blur: clamp + rehydrate.
                        val clamped = (textValue.text.toIntOrNull() ?: minValue)
                            .coerceAtLeast(minValue)
                        if (clamped != value) onValueChange(clamped)
                        textValue = androidx.compose.ui.text.input.TextFieldValue(clamped.toString())
                    }
                }
            },
        singleLine = true,
        keyboardOptions = KeyboardOptions(
            keyboardType = androidx.compose.ui.text.input.KeyboardType.Number,
            imeAction = androidx.compose.ui.text.input.ImeAction.Done,
        ),
        textStyle = textStyle.copy(
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            color = colorOverride ?: textStyle.color,
            fontFeatureSettings = "tnum",
        ),
        cursorBrush = androidx.compose.ui.graphics.SolidColor(SolennixTheme.colors.primary),
    )
}

@Composable
private fun GuestCountStepper(
    value: Int,
    onValueChange: (Int) -> Unit,
) {
    // OutlinedTextField con el numero tappable en vez de read-only. El
    // campo interior (BasicTextField) maneja edit directo + filtrado de
    // digitos; los botones +/- en leading/trailing siguen funcionando.
    Column {
        Text(
            stringResource(R.string.events_form_general_people),
            style = MaterialTheme.typography.labelMedium,
            color = SolennixTheme.colors.secondaryText,
        )
        Spacer(modifier = Modifier.height(4.dp))
        androidx.compose.material3.Surface(
            shape = MaterialTheme.shapes.small,
            border = androidx.compose.foundation.BorderStroke(1.dp, SolennixTheme.colors.borderLight),
            color = androidx.compose.ui.graphics.Color.Transparent,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(horizontal = 4.dp, vertical = 4.dp),
            ) {
                IconButton(
                    onClick = { if (value > 0) onValueChange(value - 1) },
                    enabled = value > 0,
                ) {
                    Icon(
                        Icons.Default.RemoveCircle,
                        contentDescription = stringResource(R.string.events_form_products_decrease_a11y),
                        tint = if (value > 0) SolennixTheme.colors.primary
                               else SolennixTheme.colors.secondaryText,
                        modifier = Modifier.size(28.dp),
                    )
                }
                EditableQuantityField(
                    value = value,
                    onValueChange = onValueChange,
                    minValue = 0,
                    key = "guestCount",
                    modifier = Modifier.weight(1f),
                    width = 80.dp,
                    textStyle = LocalTextStyle.current.copy(
                        fontWeight = FontWeight.SemiBold,
                        fontSize = MaterialTheme.typography.titleMedium.fontSize,
                        color = if (value == 0) SolennixTheme.colors.secondaryText
                                else SolennixTheme.colors.primaryText,
                    ),
                )
                IconButton(onClick = { onValueChange(value + 1) }) {
                    Icon(
                        Icons.Default.AddCircle,
                        contentDescription = stringResource(R.string.events_form_products_increase_a11y),
                        tint = SolennixTheme.colors.primary,
                        modifier = Modifier.size(28.dp),
                    )
                }
            }
        }
    }
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
    val displayValue = if (isBlank) stringResource(R.string.events_form_general_optional) else value
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
        title = { Text(stringResource(R.string.events_form_general_time_picker_title)) },
        text = {
            TimePicker(state = state)
        },
        confirmButton = {
            TextButton(onClick = { onConfirm(state.hour, state.minute) }) {
                Text(stringResource(R.string.events_form_general_time_picker_confirm))
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text(stringResource(R.string.events_form_cancel)) }
        },
    )
}

@Composable
private fun AssignmentStatus.uiLabel(): String = when (this) {
    AssignmentStatus.PENDING -> stringResource(R.string.events_form_staff_status_pending)
    AssignmentStatus.CONFIRMED -> stringResource(R.string.events_form_staff_status_confirmed)
    AssignmentStatus.DECLINED -> stringResource(R.string.events_form_staff_status_declined)
    AssignmentStatus.CANCELLED -> stringResource(R.string.events_form_staff_status_cancelled)
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
                stringResource(R.string.events_form_staff_select_collaborator),
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(12.dp))
            OutlinedTextField(
                value = query,
                onValueChange = { query = it },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text(stringResource(R.string.events_form_staff_search_placeholder)) },
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
                            stringResource(R.string.events_form_staff_empty_picker_message)
                        else
                            stringResource(R.string.events_form_products_no_results),
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
                                            stringResource(R.string.events_form_staff_busy),
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                            style = MaterialTheme.typography.labelSmall,
                                            color = Color(0xFFB7791F),
                                            fontWeight = FontWeight.Medium
                                        )
                                    }
                                }
                                Icon(
                                    Icons.Default.Add,
                                    contentDescription = stringResource(R.string.events_form_staff_assign_a11y),
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
    val context = LocalContext.current

    ModalBottomSheet(onDismissRequest = onDismiss, sheetState = sheetState) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                stringResource(R.string.events_form_staff_select_team),
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                stringResource(R.string.events_form_staff_team_hint),
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
                            stringResource(R.string.events_form_staff_empty_teams_picker),
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
                                            append(context.getString(R.string.events_form_staff_team_applied_prefix))
                                            append(
                                                when (added) {
                                                    0 -> context.getString(R.string.events_form_staff_team_applied_none)
                                                    1 -> context.getString(R.string.events_form_staff_team_applied_one)
                                                    else -> context.getString(R.string.events_form_staff_team_applied_many, added)
                                                }
                                            )
                                            if (skipped > 0) {
                                                append(context.getString(R.string.events_form_staff_team_skipped, skipped))
                                            }
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
                                                0 -> stringResource(R.string.events_form_staff_team_members_none)
                                                1 -> stringResource(R.string.events_form_staff_team_members_one)
                                                else -> stringResource(R.string.events_form_staff_team_members_many, count)
                                            },
                                            style = MaterialTheme.typography.labelSmall,
                                            color = SolennixTheme.colors.secondaryText
                                        )
                                    }
                                    Icon(
                                        Icons.Default.Add,
                                        contentDescription = stringResource(R.string.events_form_staff_apply_a11y),
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
