package com.creapolis.solennix.feature.events.ui

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.component.Avatar
import com.creapolis.solennix.core.designsystem.component.SolennixTextField
import com.creapolis.solennix.core.designsystem.component.UpgradePlanDialog
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveCenteredContent
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveFormRow
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.EventStatus
import com.creapolis.solennix.feature.events.R
import com.creapolis.solennix.feature.events.viewmodel.EventFormViewModel
import java.time.format.DateTimeFormatter
import java.time.format.FormatStyle
import java.util.Locale

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

private fun parseHHmmOrNull(hhmm: String): java.time.LocalTime? = try {
    java.time.LocalTime.parse(hhmm)
} catch (_: Exception) {
    null
}
