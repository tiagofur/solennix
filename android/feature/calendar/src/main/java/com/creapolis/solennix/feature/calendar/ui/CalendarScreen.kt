package com.creapolis.solennix.feature.calendar.ui

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.ViewList
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.designsystem.component.StatusBadge
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.EventStatus
import com.creapolis.solennix.core.model.UnavailableDate
import com.creapolis.solennix.feature.calendar.viewmodel.CalendarUiState
import com.creapolis.solennix.feature.calendar.viewmodel.CalendarViewModel
import com.creapolis.solennix.feature.calendar.viewmodel.CalendarViewMode
import com.creapolis.solennix.feature.calendar.viewmodel.StatusFilter
import java.time.LocalDate
import java.time.YearMonth
import java.time.ZonedDateTime
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CalendarScreen(
    viewModel: CalendarViewModel,
    onEventClick: (String) -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var showBlockDialog by remember { mutableStateOf(false) }
    var showUnblockDialog by remember { mutableStateOf(false) }
    var longPressedDate by remember { mutableStateOf<LocalDate?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Calendario") }
            )
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            // View Mode Toggle
            ViewModeToggle(
                currentMode = uiState.viewMode,
                onModeChange = { viewModel.onViewModeChange(it) }
            )

            // Status Filter Chips
            StatusFilterRow(
                filters = uiState.statusFilters,
                selectedStatus = uiState.selectedStatus,
                onFilterSelected = { viewModel.onStatusFilterChange(it) }
            )

            when (uiState.viewMode) {
                CalendarViewMode.CALENDAR -> {
                    CalendarViewContent(
                        uiState = uiState,
                        onPreviousMonth = { viewModel.onMonthChange(uiState.currentMonth.minusMonths(1)) },
                        onNextMonth = { viewModel.onMonthChange(uiState.currentMonth.plusMonths(1)) },
                        onDateSelected = { viewModel.onDateSelected(it) },
                        onDateLongPress = { date ->
                            longPressedDate = date
                            if (viewModel.isDateBlocked(date)) {
                                showUnblockDialog = true
                            } else {
                                showBlockDialog = true
                            }
                        },
                        onEventClick = onEventClick
                    )
                }
                CalendarViewMode.LIST -> {
                    ListViewContent(
                        uiState = uiState,
                        searchQuery = uiState.searchQuery,
                        onSearchQueryChange = { viewModel.onSearchQueryChange(it) },
                        onEventClick = onEventClick
                    )
                }
            }
        }
    }

    // Block date dialog
    if (showBlockDialog && longPressedDate != null) {
        BlockDateDialog(
            date = longPressedDate!!,
            onConfirm = { reason ->
                viewModel.toggleDateBlock(longPressedDate!!, reason)
                showBlockDialog = false
                longPressedDate = null
            },
            onDismiss = {
                showBlockDialog = false
                longPressedDate = null
            }
        )
    }

    // Unblock date dialog
    if (showUnblockDialog && longPressedDate != null) {
        val unavailableDate = viewModel.getUnavailableDateFor(longPressedDate!!)
        UnblockDateDialog(
            date = longPressedDate!!,
            reason = unavailableDate?.reason,
            onConfirm = {
                viewModel.toggleDateBlock(longPressedDate!!)
                showUnblockDialog = false
                longPressedDate = null
            },
            onDismiss = {
                showUnblockDialog = false
                longPressedDate = null
            }
        )
    }
}

@Composable
fun ViewModeToggle(
    currentMode: CalendarViewMode,
    onModeChange: (CalendarViewMode) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.Center
    ) {
        SingleChoiceSegmentedButtonRow {
            SegmentedButton(
                shape = SegmentedButtonDefaults.itemShape(index = 0, count = 2),
                onClick = { onModeChange(CalendarViewMode.CALENDAR) },
                selected = currentMode == CalendarViewMode.CALENDAR,
                icon = {
                    Icon(
                        Icons.Outlined.CalendarMonth,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                }
            ) {
                Text("Calendario")
            }
            SegmentedButton(
                shape = SegmentedButtonDefaults.itemShape(index = 1, count = 2),
                onClick = { onModeChange(CalendarViewMode.LIST) },
                selected = currentMode == CalendarViewMode.LIST,
                icon = {
                    Icon(
                        Icons.Outlined.ViewList,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                }
            ) {
                Text("Lista")
            }
        }
    }
}

@Composable
fun StatusFilterRow(
    filters: List<StatusFilter>,
    selectedStatus: EventStatus?,
    onFilterSelected: (EventStatus?) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        filters.forEach { filter ->
            val isSelected = filter.status == selectedStatus
            FilterChip(
                selected = isSelected,
                onClick = { onFilterSelected(filter.status) },
                label = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(filter.label)
                        if (filter.count > 0) {
                            Spacer(modifier = Modifier.width(4.dp))
                            Badge(
                                containerColor = if (isSelected)
                                    MaterialTheme.colorScheme.primary
                                else
                                    SolennixTheme.colors.secondaryText.copy(alpha = 0.3f)
                            ) {
                                Text(
                                    filter.count.toString(),
                                    color = if (isSelected) Color.White else SolennixTheme.colors.primaryText
                                )
                            }
                        }
                    }
                },
                colors = FilterChipDefaults.filterChipColors(
                    selectedContainerColor = SolennixTheme.colors.primaryLight,
                    selectedLabelColor = SolennixTheme.colors.primary
                )
            )
        }
    }
}

@Composable
fun CalendarViewContent(
    uiState: CalendarUiState,
    onPreviousMonth: () -> Unit,
    onNextMonth: () -> Unit,
    onDateSelected: (LocalDate) -> Unit,
    onDateLongPress: (LocalDate) -> Unit = {},
    onEventClick: (String) -> Unit
) {
    Column {
        CalendarHeader(
            currentMonth = uiState.currentMonth,
            onPreviousMonth = onPreviousMonth,
            onNextMonth = onNextMonth
        )

        CalendarGrid(
            currentMonth = uiState.currentMonth,
            selectedDate = uiState.selectedDate,
            onDateSelected = onDateSelected,
            onDateLongPress = onDateLongPress,
            events = uiState.events,
            unavailableDates = uiState.unavailableDates,
            selectedStatus = uiState.selectedStatus
        )

        Spacer(modifier = Modifier.height(16.dp))

        Text(
            text = "Eventos del dia",
            modifier = Modifier.padding(horizontal = 16.dp),
            style = MaterialTheme.typography.titleMedium,
            color = SolennixTheme.colors.primaryText
        )

        if (uiState.eventsForSelectedDate.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "No hay eventos para este dia",
                    color = SolennixTheme.colors.secondaryText
                )
            }
        } else {
            LazyColumn(modifier = Modifier.fillMaxSize()) {
                items(uiState.eventsForSelectedDate) { event ->
                    CalendarEventItem(event = event, onClick = { onEventClick(event.id) })
                }
            }
        }
    }
}

@Composable
fun ListViewContent(
    uiState: CalendarUiState,
    searchQuery: String,
    onSearchQueryChange: (String) -> Unit,
    onEventClick: (String) -> Unit
) {
    Column {
        // Search Field
        OutlinedTextField(
            value = searchQuery,
            onValueChange = onSearchQueryChange,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            placeholder = { Text("Buscar eventos...") },
            leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
            trailingIcon = {
                if (searchQuery.isNotEmpty()) {
                    IconButton(onClick = { onSearchQueryChange("") }) {
                        Icon(Icons.Default.Clear, contentDescription = "Limpiar")
                    }
                }
            },
            singleLine = true,
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = SolennixTheme.colors.primary,
                unfocusedBorderColor = SolennixTheme.colors.divider
            )
        )

        if (uiState.filteredEvents.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize(),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        Icons.Default.EventBusy,
                        contentDescription = null,
                        modifier = Modifier.size(64.dp),
                        tint = SolennixTheme.colors.secondaryText
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = if (searchQuery.isNotEmpty())
                            "No se encontraron eventos"
                        else
                            "No hay eventos",
                        color = SolennixTheme.colors.secondaryText
                    )
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(vertical = 8.dp)
            ) {
                items(uiState.filteredEvents) { event ->
                    ListEventItem(event = event, onClick = { onEventClick(event.id) })
                }
            }
        }
    }
}

@Composable
fun CalendarHeader(
    currentMonth: YearMonth,
    onPreviousMonth: () -> Unit,
    onNextMonth: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        IconButton(onClick = onPreviousMonth) {
            Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, contentDescription = "Previous")
        }
        Text(
            text = "${currentMonth.month.getDisplayName(TextStyle.FULL, Locale("es", "MX")).replaceFirstChar { it.uppercase() }} ${currentMonth.year}",
            style = MaterialTheme.typography.titleLarge,
            color = SolennixTheme.colors.primaryText
        )
        IconButton(onClick = onNextMonth) {
            Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = "Next")
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun CalendarGrid(
    currentMonth: YearMonth,
    selectedDate: LocalDate,
    onDateSelected: (LocalDate) -> Unit,
    onDateLongPress: (LocalDate) -> Unit = {},
    events: List<Event>,
    unavailableDates: List<UnavailableDate> = emptyList(),
    selectedStatus: EventStatus? = null
) {
    val daysInMonth = currentMonth.lengthOfMonth()
    val firstDayOfMonth = currentMonth.atDay(1).dayOfWeek.value % 7 // Sunday = 0
    val days = (1..daysInMonth).toList()
    val previousMonthDays = (0 until firstDayOfMonth).map { null }
    val allDays = previousMonthDays + days

    // Filter events by status if selected
    val filteredEvents = if (selectedStatus != null) {
        events.filter { it.status == selectedStatus }
    } else {
        events
    }

    val errorColor = SolennixTheme.colors.error

    Column(modifier = Modifier.padding(horizontal = 8.dp)) {
        Row(modifier = Modifier.fillMaxWidth()) {
            listOf("D", "L", "M", "M", "J", "V", "S").forEach { day ->
                Text(
                    text = day,
                    modifier = Modifier.weight(1f),
                    textAlign = TextAlign.Center,
                    style = MaterialTheme.typography.labelMedium,
                    color = SolennixTheme.colors.secondaryText
                )
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        LazyVerticalGrid(
            columns = GridCells.Fixed(7),
            modifier = Modifier.height(280.dp)
        ) {
            items(allDays) { day ->
                if (day != null) {
                    val date = currentMonth.atDay(day)
                    val isSelected = date == selectedDate
                    val dateStr = date.toString()
                    val isBlocked = unavailableDates.any { ud ->
                        dateStr >= ud.startDate && dateStr <= ud.endDate
                    }
                    val eventsOnDate = filteredEvents.filter {
                        try {
                            ZonedDateTime.parse(it.eventDate).toLocalDate() == date
                        } catch (e: Exception) { false }
                    }
                    val hasEvents = eventsOnDate.isNotEmpty()

                    val bgColor = when {
                        isSelected -> SolennixTheme.colors.primary
                        isBlocked -> errorColor.copy(alpha = 0.15f)
                        else -> Color.Transparent
                    }

                    Box(
                        modifier = Modifier
                            .aspectRatio(1f)
                            .padding(4.dp)
                            .clip(CircleShape)
                            .background(bgColor)
                            .combinedClickable(
                                onClick = { onDateSelected(date) },
                                onLongClick = { onDateLongPress(date) }
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = day.toString(),
                                color = when {
                                    isSelected -> Color.White
                                    isBlocked -> errorColor
                                    else -> SolennixTheme.colors.primaryText
                                },
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = when {
                                    isSelected -> FontWeight.Bold
                                    isBlocked -> FontWeight.SemiBold
                                    else -> FontWeight.Normal
                                }
                            )
                            if (hasEvents && !isSelected) {
                                // Show colored dots based on event status
                                Row(horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                                    eventsOnDate.take(3).forEach { event ->
                                        Box(
                                            modifier = Modifier
                                                .size(4.dp)
                                                .clip(CircleShape)
                                                .background(getStatusColor(event.status))
                                        )
                                    }
                                }
                            }
                        }
                    }
                } else {
                    Box(modifier = Modifier.aspectRatio(1f))
                }
            }
        }
    }
}

@Composable
private fun getStatusColor(status: EventStatus): Color {
    return when (status) {
        EventStatus.QUOTED -> SolennixTheme.colors.statusQuoted
        EventStatus.CONFIRMED -> SolennixTheme.colors.statusConfirmed
        EventStatus.COMPLETED -> SolennixTheme.colors.statusCompleted
        EventStatus.CANCELLED -> SolennixTheme.colors.statusCancelled
    }
}

@Composable
fun CalendarEventItem(
    event: Event,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp)
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.medium
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .width(4.dp)
                    .height(40.dp)
                    .clip(CircleShape)
                    .background(getStatusColor(event.status))
            )
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = event.serviceType,
                        style = MaterialTheme.typography.titleSmall,
                        color = SolennixTheme.colors.primaryText
                    )
                    StatusBadge(status = event.status.name.lowercase())
                }
                Text(
                    text = event.startTime ?: "Todo el dia",
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText
                )
            }
            Text(
                text = "$${String.format("%.2f", event.totalAmount)}",
                style = MaterialTheme.typography.labelLarge,
                color = SolennixTheme.colors.primary
            )
        }
    }
}

@Composable
fun ListEventItem(
    event: Event,
    onClick: () -> Unit
) {
    val dateFormatter = DateTimeFormatter.ofPattern("dd MMM yyyy", Locale("es", "MX"))
    val eventDate = try {
        ZonedDateTime.parse(event.eventDate).toLocalDate().format(dateFormatter)
    } catch (e: Exception) {
        event.eventDate
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp)
            .clickable(onClick = onClick),
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
                    text = event.serviceType,
                    style = MaterialTheme.typography.titleMedium,
                    color = SolennixTheme.colors.primaryText
                )
                StatusBadge(status = event.status.name.lowercase())
            }

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.CalendarToday,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = SolennixTheme.colors.secondaryText
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = eventDate,
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.secondaryText
                    )
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.Schedule,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = SolennixTheme.colors.secondaryText
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = event.startTime ?: "Todo el dia",
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.secondaryText
                    )
                }
            }

            event.location?.let { location ->
                Spacer(modifier = Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.LocationOn,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = SolennixTheme.colors.secondaryText
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = location,
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.secondaryText,
                        maxLines = 1
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))
            HorizontalDivider(color = SolennixTheme.colors.divider)
            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.People,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp),
                        tint = SolennixTheme.colors.secondaryText
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "${event.numPeople} personas",
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.secondaryText
                    )
                }
                Text(
                    text = "$${String.format("%.2f", event.totalAmount)}",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = SolennixTheme.colors.primary
                )
            }
        }
    }
}

@Composable
fun BlockDateDialog(
    date: LocalDate,
    onConfirm: (String?) -> Unit,
    onDismiss: () -> Unit
) {
    var reason by remember { mutableStateOf("") }
    val dateFormatter = DateTimeFormatter.ofPattern("dd MMM yyyy", Locale("es", "MX"))

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Bloquear fecha") },
        text = {
            Column {
                Text(
                    text = date.format(dateFormatter),
                    style = MaterialTheme.typography.bodyLarge,
                    color = SolennixTheme.colors.primaryText
                )
                Spacer(modifier = Modifier.height(16.dp))
                OutlinedTextField(
                    value = reason,
                    onValueChange = { reason = it },
                    label = { Text("Motivo (opcional)") },
                    placeholder = { Text("Ej: Vacaciones, dia personal...") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = SolennixTheme.colors.primary,
                        unfocusedBorderColor = SolennixTheme.colors.divider
                    )
                )
            }
        },
        confirmButton = {
            TextButton(onClick = { onConfirm(reason.ifBlank { null }) }) {
                Text("Bloquear", color = SolennixTheme.colors.error)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancelar")
            }
        }
    )
}

@Composable
fun UnblockDateDialog(
    date: LocalDate,
    reason: String?,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit
) {
    val dateFormatter = DateTimeFormatter.ofPattern("dd MMM yyyy", Locale("es", "MX"))

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Desbloquear fecha") },
        text = {
            Column {
                Text(
                    text = "¿Desbloquear esta fecha?",
                    style = MaterialTheme.typography.bodyLarge,
                    color = SolennixTheme.colors.primaryText
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = date.format(dateFormatter),
                    style = MaterialTheme.typography.bodyMedium,
                    color = SolennixTheme.colors.secondaryText
                )
                if (!reason.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "Motivo: $reason",
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.secondaryText
                    )
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onConfirm) {
                Text("Desbloquear", color = SolennixTheme.colors.primary)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancelar")
            }
        }
    )
}
