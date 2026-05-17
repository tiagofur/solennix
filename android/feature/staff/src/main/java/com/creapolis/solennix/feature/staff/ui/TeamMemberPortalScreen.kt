package com.creapolis.solennix.feature.staff.ui

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.AssistChip
import androidx.compose.material3.AssistChipDefaults
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Tab
import androidx.compose.material3.TabRow
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.AssignmentPortalResponse
import com.creapolis.solennix.core.model.AssignmentStatus
import com.creapolis.solennix.core.model.TeamMemberAssignment
import com.creapolis.solennix.core.model.UnavailableDate
import com.creapolis.solennix.core.network.AuthManager
import com.creapolis.solennix.feature.staff.viewmodel.TeamMemberPortalViewModel
import kotlinx.coroutines.launch
import java.text.NumberFormat
import java.time.DayOfWeek
import java.time.Instant
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.TextStyle
import java.time.temporal.WeekFields
import java.util.Locale

private enum class TeamCalendarMode {
    MONTH,
    WEEK,
    DAY
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TeamMemberPortalScreen(
    viewModel: TeamMemberPortalViewModel,
    authManager: AuthManager
) {
    val uiState = viewModel.uiState.collectAsStateWithLifecycle().value
    val snackbarHostState = remember { SnackbarHostState() }
    val coroutineScope = rememberCoroutineScope()
    var selectedTab by remember { mutableIntStateOf(0) }
    var calendarMode by remember { androidx.compose.runtime.mutableStateOf(TeamCalendarMode.MONTH) }
    var selectedAssignmentDetail by remember { androidx.compose.runtime.mutableStateOf<TeamMemberAssignment?>(null) }
    var selectedDate by remember { androidx.compose.runtime.mutableStateOf(LocalDate.now()) }
    var displayedMonth by remember { androidx.compose.runtime.mutableStateOf(YearMonth.now()) }
    var availabilityStartDate by remember { mutableStateOf("") }
    var availabilityEndDate by remember { mutableStateOf("") }
    var availabilityStartTime by remember { mutableStateOf("") }
    var availabilityEndTime by remember { mutableStateOf("") }
    var availabilityReason by remember { mutableStateOf("") }
    var editingUnavailableId by remember { mutableStateOf<String?>(null) }

    val pendingAssignments = remember(uiState.assignments) {
        uiState.assignments.filter { AssignmentStatus.fromString(it.status) == AssignmentStatus.PENDING }
    }

    val selectedDayAssignments = remember(uiState.assignments, selectedDate) {
        uiState.assignments.filter { assignment ->
            assignment.eventDate.toLocalDateOrNull() == selectedDate
        }.sortedBy(::sortMillis)
    }

    val weekDays = remember(selectedDate) {
        val firstDayOfWeek = WeekFields.of(Locale.forLanguageTag("es-MX")).firstDayOfWeek
        val offset = (selectedDate.dayOfWeek.value - firstDayOfWeek.value + 7) % 7
        val start = selectedDate.minusDays(offset.toLong())
        (0..6).map { start.plusDays(it.toLong()) }
    }

    val weekAssignments = remember(uiState.assignments, weekDays) {
        weekDays.map { day ->
            day to uiState.assignments
                .filter { it.eventDate.toLocalDateOrNull() == day }
                .sortedBy(::sortMillis)
        }
    }

    LaunchedEffect(selectedDate) {
        if (YearMonth.from(selectedDate) != displayedMonth) {
            displayedMonth = YearMonth.from(selectedDate)
        }
    }

    LaunchedEffect(uiState.errorMessage) {
        uiState.errorMessage?.let {
            snackbarHostState.showSnackbar(it)
            viewModel.clearError()
        }
    }

    Scaffold(
        topBar = {
            SolennixTopAppBar(
                title = { Text("Mi jornada") },
                actions = {
                    IconButton(onClick = { viewModel.refresh() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Recargar")
                    }
                },
                navigationIcon = {
                    IconButton(onClick = {
                        coroutineScope.launch {
                            authManager.logout()
                        }
                    }) {
                        Icon(Icons.Default.Close, contentDescription = "Salir")
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) }
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = uiState.isRefreshing,
            onRefresh = { viewModel.refresh() },
            modifier = Modifier
                .padding(padding)
                .fillMaxSize()
        ) {
            when {
                uiState.isLoading && uiState.assignments.isEmpty() -> {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = SolennixTheme.colors.primary)
                    }
                }

                uiState.assignments.isEmpty() -> {
                    Box(Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                Icons.Default.CalendarMonth,
                                contentDescription = null,
                                tint = SolennixTheme.colors.secondaryText
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                "Todavia no tenes asignaciones",
                                style = MaterialTheme.typography.titleMedium,
                                color = SolennixTheme.colors.primaryText
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                "Cuando te asignen a un evento, va a aparecer aca.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = SolennixTheme.colors.secondaryText
                            )
                        }
                    }
                }

                else -> {
                    LazyColumn(
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        item {
                            TabRow(selectedTabIndex = selectedTab) {
                                Tab(selected = selectedTab == 0, onClick = { selectedTab = 0 }, text = { Text("Mi jornada") })
                                Tab(selected = selectedTab == 1, onClick = { selectedTab = 1 }, text = { Text("Calendario") })
                            }
                        }

                        if (selectedTab == 0) {
                            item {
                                Text(
                                    text = "Pendientes por responder",
                                    style = MaterialTheme.typography.titleSmall,
                                    color = SolennixTheme.colors.secondaryText,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }

                            if (pendingAssignments.isEmpty()) {
                                item {
                                    InfoCard("No tenes invitaciones pendientes.")
                                }
                            } else {
                                items(pendingAssignments, key = { it.eventStaffId }) { assignment ->
                                    TeamMemberAssignmentCard(
                                        assignment = assignment,
                                        isResponding = uiState.respondingAssignmentIds.contains(assignment.eventStaffId),
                                        onAccept = { viewModel.respond(assignment, AssignmentPortalResponse.ACCEPT) },
                                        onDecline = { viewModel.respond(assignment, AssignmentPortalResponse.DECLINE) }
                                    )
                                }
                            }

                            item {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = "Cambios recientes",
                                        style = MaterialTheme.typography.titleSmall,
                                        color = SolennixTheme.colors.secondaryText,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                    AssistChip(
                                        onClick = {},
                                        label = { Text("${uiState.timeline.count { it.readAt == null }}") },
                                        colors = AssistChipDefaults.assistChipColors(
                                            containerColor = SolennixTheme.colors.surface,
                                            labelColor = SolennixTheme.colors.secondaryText
                                        )
                                    )
                                }
                            }

                            if (uiState.timeline.isEmpty()) {
                                item {
                                    InfoCard("Sin cambios recientes en tus asignaciones.")
                                }
                            } else {
                                items(uiState.timeline, key = { it.id }) { item ->
                                    Card(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clickable {
                                                if (item.readAt == null) {
                                                    viewModel.markTimelineRead(item.id)
                                                }
                                                val assignment = uiState.assignments.firstOrNull { it.eventStaffId == item.eventStaffId }
                                                if (assignment != null) {
                                                    selectedTab = 1
                                                    assignment.eventDate.toLocalDateOrNull()?.let { date ->
                                                        selectedDate = date
                                                        displayedMonth = YearMonth.from(date)
                                                    }
                                                    selectedAssignmentDetail = assignment
                                                }
                                            },
                                        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card)
                                    ) {
                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .padding(12.dp),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.Top
                                        ) {
                                            Column(verticalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.weight(1f)) {
                                                Text(
                                                    text = item.eventName,
                                                    style = MaterialTheme.typography.bodyMedium,
                                                    color = SolennixTheme.colors.primaryText,
                                                    fontWeight = FontWeight.SemiBold
                                                )
                                                Text(
                                                    text = timelineLabel(item.changeType),
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = SolennixTheme.colors.secondaryText
                                                )
                                                Text(
                                                    text = item.eventDate,
                                                    style = MaterialTheme.typography.bodySmall,
                                                    color = SolennixTheme.colors.secondaryText
                                                )
                                            }
                                            if (item.readAt == null) {
                                                AssistChip(
                                                    onClick = {},
                                                    label = { Text("Nuevo") },
                                                    colors = AssistChipDefaults.assistChipColors(
                                                        containerColor = SolennixTheme.colors.warning.copy(alpha = 0.2f),
                                                        labelColor = SolennixTheme.colors.warning
                                                    )
                                                )
                                            }
                                        }
                                    }
                                }
                            }

                            item {
                                Text(
                                    text = "Mi disponibilidad",
                                    style = MaterialTheme.typography.titleSmall,
                                    color = SolennixTheme.colors.secondaryText,
                                    fontWeight = FontWeight.SemiBold,
                                    modifier = Modifier.padding(top = 4.dp)
                                )
                            }

                            item {
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card)
                                ) {
                                    Column(
                                        modifier = Modifier.padding(12.dp),
                                        verticalArrangement = Arrangement.spacedBy(8.dp)
                                    ) {
                                        OutlinedTextField(
                                            value = availabilityStartDate,
                                            onValueChange = { availabilityStartDate = it },
                                            label = { Text("Desde (YYYY-MM-DD)") },
                                            modifier = Modifier.fillMaxWidth(),
                                            singleLine = true
                                        )
                                        OutlinedTextField(
                                            value = availabilityEndDate,
                                            onValueChange = { availabilityEndDate = it },
                                            label = { Text("Hasta (YYYY-MM-DD)") },
                                            modifier = Modifier.fillMaxWidth(),
                                            singleLine = true
                                        )
                                        OutlinedTextField(
                                            value = availabilityStartTime,
                                            onValueChange = { availabilityStartTime = it },
                                            label = { Text("Hora inicio (HH:MM)") },
                                            modifier = Modifier.fillMaxWidth(),
                                            singleLine = true
                                        )
                                        OutlinedTextField(
                                            value = availabilityEndTime,
                                            onValueChange = { availabilityEndTime = it },
                                            label = { Text("Hora fin (HH:MM)") },
                                            modifier = Modifier.fillMaxWidth(),
                                            singleLine = true
                                        )
                                        OutlinedTextField(
                                            value = availabilityReason,
                                            onValueChange = { availabilityReason = it },
                                            label = { Text("Motivo (opcional)") },
                                            modifier = Modifier.fillMaxWidth(),
                                            singleLine = true
                                        )

                                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                            Button(
                                                onClick = {
                                                    val normalizedStart = availabilityStartTime.trim().ifBlank { null }
                                                    val normalizedEnd = availabilityEndTime.trim().ifBlank { null }
                                                    val normalizedReason = availabilityReason.trim().ifBlank { null }
                                                    if (editingUnavailableId != null) {
                                                        viewModel.updateUnavailableDate(
                                                            id = editingUnavailableId!!,
                                                            startDate = availabilityStartDate.trim(),
                                                            endDate = availabilityEndDate.trim(),
                                                            startTime = normalizedStart,
                                                            endTime = normalizedEnd,
                                                            reason = normalizedReason
                                                        )
                                                    } else {
                                                        viewModel.createUnavailableDate(
                                                            startDate = availabilityStartDate.trim(),
                                                            endDate = availabilityEndDate.trim(),
                                                            startTime = normalizedStart,
                                                            endTime = normalizedEnd,
                                                            reason = normalizedReason
                                                        )
                                                    }
                                                    availabilityStartDate = ""
                                                    availabilityEndDate = ""
                                                    availabilityStartTime = ""
                                                    availabilityEndTime = ""
                                                    availabilityReason = ""
                                                    editingUnavailableId = null
                                                },
                                                enabled = !uiState.isSavingAvailability && availabilityStartDate.isNotBlank() && availabilityEndDate.isNotBlank()
                                            ) {
                                                Text(if (editingUnavailableId != null) "Guardar cambios" else "Bloquear fechas")
                                            }

                                            if (editingUnavailableId != null) {
                                                OutlinedButton(
                                                    onClick = {
                                                        availabilityStartDate = ""
                                                        availabilityEndDate = ""
                                                        availabilityStartTime = ""
                                                        availabilityEndTime = ""
                                                        availabilityReason = ""
                                                        editingUnavailableId = null
                                                    },
                                                    enabled = !uiState.isSavingAvailability
                                                ) {
                                                    Text("Cancelar")
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            if (uiState.unavailableDates.isEmpty()) {
                                item {
                                    InfoCard("No tenes bloqueos cargados.")
                                }
                            } else {
                                items(
                                    uiState.unavailableDates.sortedBy { it.startDate },
                                    key = { it.id }
                                ) { item ->
                                    UnavailableDateRow(
                                        item = item,
                                        isBusy = uiState.isSavingAvailability,
                                        onEdit = {
                                            editingUnavailableId = item.id
                                            availabilityStartDate = item.startDate
                                            availabilityEndDate = item.endDate
                                            availabilityStartTime = item.startTime.orEmpty()
                                            availabilityEndTime = item.endTime.orEmpty()
                                            availabilityReason = item.reason.orEmpty()
                                        },
                                        onDelete = { viewModel.deleteUnavailableDate(item.id) }
                                    )
                                }
                            }

                            item {
                                Text(
                                    text = "Mi agenda",
                                    style = MaterialTheme.typography.titleSmall,
                                    color = SolennixTheme.colors.secondaryText,
                                    fontWeight = FontWeight.SemiBold,
                                    modifier = Modifier.padding(top = 4.dp)
                                )
                            }

                            items(uiState.assignments, key = { it.eventStaffId }) { assignment ->
                                TeamMemberAssignmentCard(
                                    assignment = assignment,
                                    isResponding = uiState.respondingAssignmentIds.contains(assignment.eventStaffId),
                                    onAccept = { viewModel.respond(assignment, AssignmentPortalResponse.ACCEPT) },
                                    onDecline = { viewModel.respond(assignment, AssignmentPortalResponse.DECLINE) }
                                )
                            }
                        } else {
                            item {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    CalendarModeButton(
                                        label = "Mes",
                                        selected = calendarMode == TeamCalendarMode.MONTH,
                                        onClick = { calendarMode = TeamCalendarMode.MONTH },
                                        modifier = Modifier.weight(1f)
                                    )
                                    CalendarModeButton(
                                        label = "Semana",
                                        selected = calendarMode == TeamCalendarMode.WEEK,
                                        onClick = { calendarMode = TeamCalendarMode.WEEK },
                                        modifier = Modifier.weight(1f)
                                    )
                                    CalendarModeButton(
                                        label = "Dia",
                                        selected = calendarMode == TeamCalendarMode.DAY,
                                        onClick = { calendarMode = TeamCalendarMode.DAY },
                                        modifier = Modifier.weight(1f)
                                    )
                                }
                            }

                            item {
                                TeamMemberPortalCalendar(
                                    assignments = uiState.assignments,
                                    selectedDate = selectedDate,
                                    displayedMonth = displayedMonth,
                                    onSelectDate = { selectedDate = it },
                                    onMonthChange = { displayedMonth = it }
                                )
                            }

                            when (calendarMode) {
                                TeamCalendarMode.MONTH,
                                TeamCalendarMode.DAY -> {
                                    item {
                                        Text(
                                            text = if (calendarMode == TeamCalendarMode.DAY) "Agenda del dia" else "Eventos del dia",
                                            style = MaterialTheme.typography.titleSmall,
                                            color = SolennixTheme.colors.secondaryText,
                                            fontWeight = FontWeight.SemiBold
                                        )
                                    }

                                    if (selectedDayAssignments.isEmpty()) {
                                        item {
                                            InfoCard("No hay asignaciones para esta fecha.")
                                        }
                                    } else {
                                        items(selectedDayAssignments, key = { it.eventStaffId }) { assignment ->
                                            TeamMemberAssignmentCard(
                                                assignment = assignment,
                                                isResponding = uiState.respondingAssignmentIds.contains(assignment.eventStaffId),
                                                onAccept = { viewModel.respond(assignment, AssignmentPortalResponse.ACCEPT) },
                                                onDecline = { viewModel.respond(assignment, AssignmentPortalResponse.DECLINE) },
                                                onTap = { selectedAssignmentDetail = assignment },
                                                mode = if (calendarMode == TeamCalendarMode.DAY) TeamAssignmentCardMode.DAY else TeamAssignmentCardMode.DEFAULT
                                            )
                                        }
                                    }
                                }

                                TeamCalendarMode.WEEK -> {
                                    item {
                                        Text(
                                            text = "Agenda semanal",
                                            style = MaterialTheme.typography.titleSmall,
                                            color = SolennixTheme.colors.secondaryText,
                                            fontWeight = FontWeight.SemiBold
                                        )
                                    }

                                    items(weekAssignments, key = { it.first.toString() }) { (day, dayItems) ->
                                        WeekDayAgendaCard(
                                            day = day,
                                            assignments = dayItems,
                                            respondingIds = uiState.respondingAssignmentIds,
                                            onAccept = { assignment -> viewModel.respond(assignment, AssignmentPortalResponse.ACCEPT) },
                                            onDecline = { assignment -> viewModel.respond(assignment, AssignmentPortalResponse.DECLINE) },
                                            onTap = { assignment -> selectedAssignmentDetail = assignment }
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

    selectedAssignmentDetail?.let { assignment ->
        TeamMemberAssignmentDetailDialog(
            assignment = assignment,
            onDismiss = { selectedAssignmentDetail = null }
        )
    }
}

@Composable
private fun UnavailableDateRow(
    item: UnavailableDate,
    isBusy: Boolean,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(
                    text = "${item.startDate} - ${item.endDate}",
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = SolennixTheme.colors.primaryText
                )
                if (!item.startTime.isNullOrBlank() && !item.endTime.isNullOrBlank()) {
                    Text(
                        text = "${item.startTime} - ${item.endTime}",
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.secondaryText
                    )
                }
                if (!item.reason.isNullOrBlank()) {
                    Text(
                        text = item.reason.orEmpty(),
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.secondaryText
                    )
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = onEdit, enabled = !isBusy) {
                    Text("Editar")
                }
                OutlinedButton(onClick = onDelete, enabled = !isBusy) {
                    Text("Eliminar")
                }
            }
        }
    }
}

@Composable
private fun CalendarModeButton(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    if (selected) {
        Button(onClick = onClick, modifier = modifier) {
            Text(label)
        }
    } else {
        OutlinedButton(onClick = onClick, modifier = modifier) {
            Text(label)
        }
    }
}

@Composable
private fun InfoCard(message: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card)
    ) {
        Text(
            text = message,
            color = SolennixTheme.colors.secondaryText,
            style = MaterialTheme.typography.bodyMedium,
            modifier = Modifier.padding(16.dp)
        )
    }
}

private fun String.toLocalDateOrNull(): LocalDate? {
    return runCatching { LocalDate.parse(this) }.getOrNull()
}

private fun sortMillis(assignment: TeamMemberAssignment): Long {
    val shiftStart = assignment.shiftStart
    if (!shiftStart.isNullOrBlank()) {
        val parsed = runCatching { Instant.parse(shiftStart).toEpochMilli() }.getOrNull()
        if (parsed != null) return parsed
    }
    val day = assignment.eventDate.toLocalDateOrNull() ?: LocalDate.MAX
    return day.toEpochDay() * 86_400_000L
}

private fun shiftRangeLabel(assignment: TeamMemberAssignment): String? {
    val start = assignment.shiftStart
    val end = assignment.shiftEnd
    if (start.isNullOrBlank() || end.isNullOrBlank()) return null

    val startText = runCatching { Instant.parse(start).atZone(java.time.ZoneId.systemDefault()).toLocalTime().toString().take(5) }.getOrNull()
    val endText = runCatching { Instant.parse(end).atZone(java.time.ZoneId.systemDefault()).toLocalTime().toString().take(5) }.getOrNull()
    return if (startText != null && endText != null) "$startText - $endText" else null
}

private fun timelineLabel(changeType: String): String {
    return when (changeType) {
        "location_changed" -> "Cambio de ubicación"
        "role_changed" -> "Cambio de rol"
        "shift_changed" -> "Cambio de turno"
        "status_changed" -> "Cambio de estado"
        "assignment_added" -> "Nueva asignación"
        "assignment_removed" -> "Asignación removida"
        else -> "Actualización de asignación"
    }
}

@Composable
private fun TeamMemberAssignmentDetailDialog(
    assignment: TeamMemberAssignment,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val moneyFormatter = remember { NumberFormat.getCurrencyInstance(Locale.forLanguageTag("es-MX")) }
    val prefs = remember(context) { context.getSharedPreferences("team_event_detail", Context.MODE_PRIVATE) }
    var checklistArrival by remember(assignment.eventId) { mutableStateOf(prefs.getBoolean("${assignment.eventId}_arrival", false)) }
    var checklistMaterials by remember(assignment.eventId) { mutableStateOf(prefs.getBoolean("${assignment.eventId}_materials", false)) }
    var checklistClosing by remember(assignment.eventId) { mutableStateOf(prefs.getBoolean("${assignment.eventId}_closing", false)) }
    var quickNote by remember(assignment.eventId) { mutableStateOf(prefs.getString("${assignment.eventId}_quick_note", "") ?: "") }

    LaunchedEffect(assignment.eventId, checklistArrival, checklistMaterials, checklistClosing, quickNote) {
        prefs.edit()
            .putBoolean("${assignment.eventId}_arrival", checklistArrival)
            .putBoolean("${assignment.eventId}_materials", checklistMaterials)
            .putBoolean("${assignment.eventId}_closing", checklistClosing)
            .putString("${assignment.eventId}_quick_note", quickNote)
            .apply()
    }

    val locationLabel = listOfNotNull(assignment.location, assignment.city)
        .map { it.trim() }
        .filter { it.isNotBlank() }
        .joinToString(", ")
        .ifBlank { null }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(assignment.eventName) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text("Fecha: ${assignment.eventDate}")
                shiftRangeLabel(assignment)?.let { Text("Turno: $it") }
                assignment.roleOverride?.takeIf { it.isNotBlank() }?.let { Text("Rol: $it") }
                assignment.feeAmount?.let { Text("Pago: ${moneyFormatter.format(it)}") }
                assignment.notes?.takeIf { it.isNotBlank() }?.let { Text("Notas: $it") }
                assignment.organizerNotes?.takeIf { it.isNotBlank() }?.let { Text("Notas del organizador: $it") }
                listOfNotNull(assignment.contactName, assignment.contactPhone)
                    .map { it.trim() }
                    .filter { it.isNotBlank() }
                    .takeIf { it.isNotEmpty() }
                    ?.joinToString(" · ")
                    ?.let { Text("Contacto operativo: $it") }
                locationLabel?.let { Text("Ubicacion: $it") }

                if (locationLabel != null) {
                    OutlinedButton(
                        onClick = {
                            val uri = Uri.parse("https://www.google.com/maps/search/?api=1&query=${Uri.encode(locationLabel)}")
                            context.startActivity(Intent(Intent.ACTION_VIEW, uri))
                        }
                    ) {
                        Text("Abrir en mapas")
                    }
                }

                Text("Checklist de ejecucion", fontWeight = FontWeight.SemiBold)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(checked = checklistArrival, onCheckedChange = { checklistArrival = it })
                    Text("Llegada y acceso confirmados")
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(checked = checklistMaterials, onCheckedChange = { checklistMaterials = it })
                    Text("Material y montaje listos")
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(checked = checklistClosing, onCheckedChange = { checklistClosing = it })
                    Text("Cierre operativo completado")
                }

                OutlinedTextField(
                    value = quickNote,
                    onValueChange = { quickNote = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Notas rapidas personales") },
                    minLines = 2
                )
            }
        },
        confirmButton = {
            Button(onClick = onDismiss) {
                Text("Cerrar")
            }
        }
    )
}

@Composable
private fun WeekDayAgendaCard(
    day: LocalDate,
    assignments: List<TeamMemberAssignment>,
    respondingIds: Set<String>,
    onAccept: (TeamMemberAssignment) -> Unit,
    onDecline: (TeamMemberAssignment) -> Unit,
    onTap: (TeamMemberAssignment) -> Unit
) {
    val locale = Locale.forLanguageTag("es-MX")
    val dayLabel = "${day.dayOfWeek.getDisplayName(TextStyle.FULL, locale).replaceFirstChar { it.uppercase() }} ${day.dayOfMonth}"
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card)
    ) {
        Column(modifier = Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                text = dayLabel,
                style = MaterialTheme.typography.titleSmall,
                color = SolennixTheme.colors.primaryText,
                fontWeight = FontWeight.SemiBold
            )

            if (assignments.isEmpty()) {
                Text(
                    text = "Sin asignaciones",
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText
                )
            } else {
                assignments.forEach { assignment ->
                    TeamMemberAssignmentCard(
                        assignment = assignment,
                        isResponding = respondingIds.contains(assignment.eventStaffId),
                        onAccept = { onAccept(assignment) },
                        onDecline = { onDecline(assignment) },
                        onTap = { onTap(assignment) },
                        mode = TeamAssignmentCardMode.DAY
                    )
                }
            }
        }
    }
}

private enum class TeamAssignmentCardMode {
    DEFAULT,
    DAY
}

@Composable
private fun TeamMemberPortalCalendar(
    assignments: List<TeamMemberAssignment>,
    selectedDate: LocalDate,
    displayedMonth: YearMonth,
    onSelectDate: (LocalDate) -> Unit,
    onMonthChange: (YearMonth) -> Unit
) {
    val locale = Locale.forLanguageTag("es-MX")
    val firstDayOfWeek = WeekFields.of(locale).firstDayOfWeek
    val monthDays = remember(displayedMonth, firstDayOfWeek) {
        buildMonthDays(displayedMonth, firstDayOfWeek)
    }
    val statusDotsByDate = remember(assignments) {
        assignments
            .mapNotNull { assignment -> assignment.eventDate.toLocalDateOrNull()?.let { it to AssignmentStatus.fromString(assignment.status) } }
            .groupBy({ it.first }, { it.second })
            .mapValues { (_, statuses) ->
                val ordered = listOf(AssignmentStatus.PENDING, AssignmentStatus.CONFIRMED, AssignmentStatus.DECLINED, AssignmentStatus.CANCELLED)
                    .filter { statuses.contains(it) }
                ordered.take(3)
            }
    }
    val weekdayHeaders = remember(firstDayOfWeek, locale) {
        (0..6).map { index ->
            firstDayOfWeek.plus(index.toLong()).getDisplayName(TextStyle.NARROW_STANDALONE, locale)
        }
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = { onMonthChange(displayedMonth.minusMonths(1)) }) {
                    Icon(Icons.Default.ChevronLeft, contentDescription = "Mes anterior")
                }

                Text(
                    text = displayedMonth.month.getDisplayName(TextStyle.FULL, locale).replaceFirstChar { it.uppercase() } + " ${displayedMonth.year}",
                    style = MaterialTheme.typography.titleSmall,
                    color = SolennixTheme.colors.primaryText,
                    modifier = Modifier.weight(1f)
                )

                AssistChip(
                    onClick = {
                        val today = LocalDate.now()
                        onMonthChange(YearMonth.from(today))
                        onSelectDate(today)
                    },
                    label = { Text("Hoy") },
                    colors = AssistChipDefaults.assistChipColors(
                        containerColor = SolennixTheme.colors.surface,
                        labelColor = SolennixTheme.colors.secondaryText
                    )
                )

                IconButton(onClick = { onMonthChange(displayedMonth.plusMonths(1)) }) {
                    Icon(Icons.Default.ChevronRight, contentDescription = "Mes siguiente")
                }
            }

            Row(modifier = Modifier.fillMaxWidth()) {
                weekdayHeaders.forEach { header ->
                    Text(
                        text = header,
                        style = MaterialTheme.typography.labelSmall,
                        color = SolennixTheme.colors.secondaryText,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.weight(1f),
                        maxLines = 1
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            LazyVerticalGrid(
                columns = GridCells.Fixed(7),
                userScrollEnabled = false,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                items(monthDays) { day ->
                    if (day == null) {
                        Spacer(modifier = Modifier.height(44.dp))
                    } else {
                        TeamPortalDayCell(
                            date = day,
                            isSelected = day == selectedDate,
                            isToday = day == LocalDate.now(),
                            isCurrentMonth = YearMonth.from(day) == displayedMonth,
                            dots = statusDotsByDate[day].orEmpty(),
                            onClick = { onSelectDate(day) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun TeamPortalDayCell(
    date: LocalDate,
    isSelected: Boolean,
    isToday: Boolean,
    isCurrentMonth: Boolean,
    dots: List<AssignmentStatus>,
    onClick: () -> Unit
) {
    val dayTextColor = when {
        isSelected -> Color.White
        !isCurrentMonth -> SolennixTheme.colors.secondaryText
        isToday -> SolennixTheme.colors.primary
        else -> SolennixTheme.colors.primaryText
    }

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .fillMaxWidth()
            .height(44.dp)
            .clip(RoundedCornerShape(8.dp))
            .clickable(onClick = onClick)
            .padding(vertical = 2.dp)
            .background(Color.Transparent)
    ) {
        Box(
            modifier = Modifier
                .clip(CircleShape)
                .background(if (isSelected) SolennixTheme.colors.primary else Color.Transparent)
                .then(
                    if (!isSelected && isToday) Modifier.border(BorderStroke(1.5.dp, SolennixTheme.colors.primary), CircleShape)
                    else Modifier
                )
                .height(28.dp)
                .width(28.dp),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = date.dayOfMonth.toString(),
                style = MaterialTheme.typography.bodySmall,
                fontWeight = if (isSelected || isToday) FontWeight.SemiBold else FontWeight.Normal,
                color = dayTextColor
            )
        }

        Row(horizontalArrangement = Arrangement.spacedBy(3.dp), modifier = Modifier.height(8.dp)) {
            dots.forEach { status ->
                Box(
                    modifier = Modifier
                        .width(5.dp)
                        .height(5.dp)
                        .clip(CircleShape)
                        .background(dotColorForStatus(status))
                )
            }
        }
    }
}

@Composable
private fun dotColorForStatus(status: AssignmentStatus): Color {
    return when (status) {
        AssignmentStatus.PENDING -> SolennixTheme.colors.warning
        AssignmentStatus.CONFIRMED -> SolennixTheme.colors.success
        AssignmentStatus.DECLINED -> SolennixTheme.colors.error
        AssignmentStatus.CANCELLED -> SolennixTheme.colors.secondaryText
    }
}

private fun buildMonthDays(month: YearMonth, firstDayOfWeek: DayOfWeek): List<LocalDate?> {
    val first = month.atDay(1)
    val offset = (first.dayOfWeek.value - firstDayOfWeek.value + 7) % 7
    val days = mutableListOf<LocalDate?>()
    repeat(offset) { days += null }
    repeat(month.lengthOfMonth()) { dayIndex -> days += month.atDay(dayIndex + 1) }
    while (days.size % 7 != 0) {
        days += null
    }
    return days
}

@Composable
private fun TeamMemberAssignmentCard(
    assignment: TeamMemberAssignment,
    isResponding: Boolean,
    onAccept: () -> Unit,
    onDecline: () -> Unit,
    onTap: (() -> Unit)? = null,
    mode: TeamAssignmentCardMode = TeamAssignmentCardMode.DEFAULT
) {
    val status = AssignmentStatus.fromString(assignment.status)
    val isPending = status == AssignmentStatus.PENDING
    val moneyFormatter = remember { NumberFormat.getCurrencyInstance(Locale.forLanguageTag("es-MX")) }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .then(if (onTap != null) Modifier.clickable(onClick = onTap) else Modifier),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = assignment.eventName,
                style = MaterialTheme.typography.titleMedium,
                color = SolennixTheme.colors.primaryText,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                text = assignment.eventDate,
                style = MaterialTheme.typography.bodySmall,
                color = SolennixTheme.colors.secondaryText
            )

            if (mode == TeamAssignmentCardMode.DAY) {
                shiftRangeLabel(assignment)?.let { label ->
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = "Turno: $label",
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.secondaryText
                    )
                }
            }

            if (!assignment.roleOverride.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "Rol: ${assignment.roleOverride}",
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText
                )
            }

            if (assignment.feeAmount != null) {
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = "Pago: ${moneyFormatter.format(assignment.feeAmount)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.primary
                )
            }

            if (!assignment.notes.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    text = assignment.notes.orEmpty(),
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText
                )
            }

            Spacer(modifier = Modifier.height(12.dp))

            if (isPending) {
                androidx.compose.foundation.layout.Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(
                        onClick = onDecline,
                        enabled = !isResponding,
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(Icons.Default.Close, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Rechazar")
                    }
                    Button(
                        onClick = onAccept,
                        enabled = !isResponding,
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(Icons.Default.Check, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Aceptar")
                    }
                }
            } else {
                Text(
                    text = when (status) {
                        AssignmentStatus.CONFIRMED -> "Confirmada"
                        AssignmentStatus.DECLINED -> "Rechazada"
                        AssignmentStatus.CANCELLED -> "Cancelada"
                        AssignmentStatus.PENDING -> "Pendiente"
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText
                )
            }
        }
    }
}