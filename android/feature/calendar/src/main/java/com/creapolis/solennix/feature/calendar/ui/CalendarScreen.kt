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
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.runtime.LaunchedEffect
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveCenteredContent
import com.creapolis.solennix.core.designsystem.theme.LocalIsWideScreen
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
import com.creapolis.solennix.core.model.extensions.parseFlexibleDate
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CalendarScreen(
    viewModel: CalendarViewModel,
    onEventClick: (String) -> Unit,
    onBlockDatesRequested: Boolean = false,
    onBlockDatesConsumed: () -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val isWideScreen = LocalIsWideScreen.current
    var showBlockDialog by remember { mutableStateOf(false) }
    var showUnblockDialog by remember { mutableStateOf(false) }
    var longPressedDate by remember { mutableStateOf<LocalDate?>(null) }
    var showManageUnavailableSheet by remember { mutableStateOf(false) }
    var showAddRangeDialog by remember { mutableStateOf(false) }

    LaunchedEffect(onBlockDatesRequested) {
        if (onBlockDatesRequested) {
            viewModel.loadAllUnavailableDates()
            showManageUnavailableSheet = true
            onBlockDatesConsumed()
        }
    }

    Scaffold(
        topBar = {
            SolennixTopAppBar(
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

            when (uiState.viewMode) {
                CalendarViewMode.CALENDAR -> {
                    CalendarViewContent(
                        uiState = uiState,
                        isWideScreen = isWideScreen,
                        onPreviousMonth = { viewModel.onMonthChange(uiState.currentMonth.minusMonths(1)) },
                        onNextMonth = { viewModel.onMonthChange(uiState.currentMonth.plusMonths(1)) },
                        onGoToToday = { viewModel.goToToday() },
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
                    // Status filters only in list view (saves space for calendar grid)
                    StatusFilterRow(
                        filters = uiState.statusFilters,
                        selectedStatus = uiState.selectedStatus,
                        onFilterSelected = { viewModel.onStatusFilterChange(it) }
                    )
                    ListViewContent(
                        uiState = uiState,
                        isWideScreen = isWideScreen,
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

    // Manage unavailable dates bottom sheet
    if (showManageUnavailableSheet) {
        ManageUnavailableDatesSheet(
            unavailableDates = uiState.unavailableDates,
            onDismiss = { showManageUnavailableSheet = false },
            onDelete = { id -> viewModel.deleteUnavailableDate(id) },
            onAddRange = { showAddRangeDialog = true }
        )
    }

    // Add date range dialog
    if (showAddRangeDialog) {
        AddDateRangeDialog(
            onConfirm = { startDate, endDate, reason ->
                viewModel.blockDateRange(startDate, endDate, reason)
                showAddRangeDialog = false
            },
            onDismiss = { showAddRangeDialog = false }
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
    isWideScreen: Boolean = false,
    onPreviousMonth: () -> Unit,
    onNextMonth: () -> Unit,
    onGoToToday: () -> Unit = {},
    onDateSelected: (LocalDate) -> Unit,
    onDateLongPress: (LocalDate) -> Unit = {},
    onEventClick: (String) -> Unit
) {
    val dateFormatter = DateTimeFormatter.ofPattern("EEEE d 'de' MMMM", Locale("es", "MX"))

    if (isWideScreen) {
        // Tablet: compact calendar (left, max 480dp) + events panel (right)
        Row(modifier = Modifier.fillMaxSize()) {
            // Left panel: Calendar — constrained width so cells stay small
            Column(
                modifier = Modifier
                    .widthIn(max = 480.dp)
                    .fillMaxHeight()
            ) {
                CalendarHeader(
                    currentMonth = uiState.currentMonth,
                    onPreviousMonth = onPreviousMonth,
                    onNextMonth = onNextMonth,
                    onGoToToday = onGoToToday
                )
                CalendarGrid(
                    currentMonth = uiState.currentMonth,
                    selectedDate = uiState.selectedDate,
                    onDateSelected = onDateSelected,
                    onDateLongPress = onDateLongPress,
                    events = uiState.events,
                    unavailableDates = uiState.unavailableDates,
                    selectedStatus = uiState.selectedStatus,
                    isWideScreen = true,
                    modifier = Modifier.weight(1f)
                )
            }

            // Right panel: Selected day's events — takes remaining space
            Column(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight()
            ) {
                Text(
                    text = uiState.selectedDate.format(dateFormatter).replaceFirstChar { it.uppercase() },
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 16.dp),
                    style = MaterialTheme.typography.titleMedium,
                    color = SolennixTheme.colors.primaryText
                )

                if (uiState.eventsForSelectedDate.isEmpty()) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                Icons.Outlined.CalendarMonth,
                                contentDescription = null,
                                modifier = Modifier.size(48.dp),
                                tint = SolennixTheme.colors.secondaryText
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = "No hay eventos programados",
                                color = SolennixTheme.colors.secondaryText
                            )
                        }
                    }
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(bottom = 16.dp)
                    ) {
                        items(uiState.eventsForSelectedDate) { event ->
                            CalendarEventItem(event = event, onClick = { onEventClick(event.id) })
                        }
                    }
                }
            }
        }
    } else {
        // Phone: original single-column LazyColumn layout
        LazyColumn(modifier = Modifier.fillMaxSize()) {
            item {
                CalendarHeader(
                    currentMonth = uiState.currentMonth,
                    onPreviousMonth = onPreviousMonth,
                    onNextMonth = onNextMonth,
                    onGoToToday = onGoToToday
                )
            }

            item {
                CalendarGrid(
                    currentMonth = uiState.currentMonth,
                    selectedDate = uiState.selectedDate,
                    onDateSelected = onDateSelected,
                    onDateLongPress = onDateLongPress,
                    events = uiState.events,
                    unavailableDates = uiState.unavailableDates,
                    selectedStatus = uiState.selectedStatus
                )
            }

            item {
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = uiState.selectedDate.format(dateFormatter).replaceFirstChar { it.uppercase() },
                    modifier = Modifier.padding(horizontal = 16.dp),
                    style = MaterialTheme.typography.titleMedium,
                    color = SolennixTheme.colors.primaryText
                )
            }

            if (uiState.eventsForSelectedDate.isEmpty()) {
                item {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 48.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                Icons.Outlined.CalendarMonth,
                                contentDescription = null,
                                modifier = Modifier.size(48.dp),
                                tint = SolennixTheme.colors.secondaryText
                            )
                            Spacer(modifier = Modifier.height(12.dp))
                            Text(
                                text = "No hay eventos programados",
                                color = SolennixTheme.colors.secondaryText
                            )
                        }
                    }
                }
            } else {
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
    isWideScreen: Boolean = false,
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
                .then(if (isWideScreen) Modifier.widthIn(max = 600.dp) else Modifier.fillMaxWidth())
                .padding(horizontal = 16.dp, vertical = 8.dp),
            placeholder = { Text("Buscar por cliente o servicio...") },
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

        // Results count
        Text(
            text = "${uiState.filteredCount} evento${if (uiState.filteredCount != 1) "s" else ""}",
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelMedium,
            color = SolennixTheme.colors.secondaryText
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
                    if (searchQuery.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Intenta ajustar los filtros de busqueda",
                            style = MaterialTheme.typography.bodySmall,
                            color = SolennixTheme.colors.secondaryText
                        )
                    }
                }
            }
        } else if (isWideScreen) {
            // Tablet: 2-column grid of event cards
            LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(vertical = 8.dp, horizontal = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(uiState.filteredEvents) { event ->
                    ListEventItem(event = event, onClick = { onEventClick(event.id) })
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
    onNextMonth: () -> Unit,
    onGoToToday: () -> Unit = {}
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        IconButton(onClick = onPreviousMonth) {
            Icon(Icons.AutoMirrored.Filled.KeyboardArrowLeft, contentDescription = "Mes anterior")
        }
        Text(
            text = "${currentMonth.month.getDisplayName(TextStyle.FULL, Locale("es", "MX")).replaceFirstChar { it.uppercase() }} ${currentMonth.year}",
            style = MaterialTheme.typography.titleLarge,
            color = SolennixTheme.colors.primaryText
        )
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            OutlinedButton(
                onClick = onGoToToday,
                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                border = ButtonDefaults.outlinedButtonBorder.copy(
                    brush = androidx.compose.ui.graphics.SolidColor(SolennixTheme.colors.primary)
                ),
                modifier = Modifier.height(32.dp)
            ) {
                Text(
                    "Hoy",
                    style = MaterialTheme.typography.labelMedium,
                    color = SolennixTheme.colors.primary,
                    fontWeight = FontWeight.SemiBold
                )
            }
            IconButton(onClick = onNextMonth) {
                Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, contentDescription = "Mes siguiente")
            }
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
    selectedStatus: EventStatus? = null,
    isWideScreen: Boolean = false,
    modifier: Modifier = Modifier
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
    val today = LocalDate.now()

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
            modifier = modifier.then(
                if (modifier == Modifier) Modifier.height(280.dp) else Modifier
            )
        ) {
            items(allDays) { day ->
                if (day != null) {
                    val date = currentMonth.atDay(day)
                    val isSelected = date == selectedDate
                    val isToday = date == today
                    val dateStr = date.toString()
                    val isBlocked = unavailableDates.any { ud ->
                        dateStr >= ud.startDate && dateStr <= ud.endDate
                    }
                    val eventsOnDate = filteredEvents.filter {
                        parseFlexibleDate(it.eventDate) == date
                    }
                    val hasEvents = eventsOnDate.isNotEmpty()

                    val bgColor = when {
                        isSelected -> SolennixTheme.colors.primary
                        isToday -> SolennixTheme.colors.primaryLight
                        isBlocked -> errorColor.copy(alpha = 0.15f)
                        else -> Color.Transparent
                    }

                    val borderModifier = if (isToday && !isSelected) {
                        Modifier
                            .aspectRatio(1f)
                            .padding(4.dp)
                            .clip(CircleShape)
                            .background(bgColor)
                    } else {
                        Modifier
                            .aspectRatio(1f)
                            .padding(4.dp)
                            .clip(CircleShape)
                            .background(bgColor)
                    }

                    Box(
                        modifier = borderModifier
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
                                    isToday -> SolennixTheme.colors.primary
                                    isBlocked -> errorColor
                                    else -> SolennixTheme.colors.primaryText
                                },
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = when {
                                    isSelected -> FontWeight.Bold
                                    isToday -> FontWeight.Bold
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
    val eventDate = parseFlexibleDate(event.eventDate)?.format(dateFormatter) ?: event.eventDate

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

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ManageUnavailableDatesSheet(
    unavailableDates: List<UnavailableDate>,
    onDismiss: () -> Unit,
    onDelete: (String) -> Unit,
    onAddRange: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val dateFormatter = DateTimeFormatter.ofPattern("dd MMM yyyy", Locale("es", "MX"))

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = SolennixTheme.colors.card
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .padding(bottom = 32.dp)
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Fechas No Disponibles",
                    style = MaterialTheme.typography.titleLarge,
                    color = SolennixTheme.colors.primaryText
                )
                FilledTonalButton(
                    onClick = onAddRange,
                    colors = ButtonDefaults.filledTonalButtonColors(
                        containerColor = SolennixTheme.colors.primaryLight,
                        contentColor = SolennixTheme.colors.primary
                    )
                ) {
                    Icon(
                        Icons.Default.Add,
                        contentDescription = null,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Agregar rango")
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            if (unavailableDates.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 32.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.EventAvailable,
                            contentDescription = null,
                            modifier = Modifier.size(48.dp),
                            tint = SolennixTheme.colors.secondaryText
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            text = "No hay fechas bloqueadas",
                            style = MaterialTheme.typography.bodyLarge,
                            color = SolennixTheme.colors.secondaryText
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Todas las fechas estan disponibles",
                            style = MaterialTheme.typography.bodySmall,
                            color = SolennixTheme.colors.secondaryText
                        )
                    }
                }
            } else {
                Text(
                    text = "${unavailableDates.size} rango${if (unavailableDates.size != 1) "s" else ""} bloqueado${if (unavailableDates.size != 1) "s" else ""}",
                    style = MaterialTheme.typography.labelMedium,
                    color = SolennixTheme.colors.secondaryText
                )
                Spacer(modifier = Modifier.height(8.dp))

                LazyColumn(
                    modifier = Modifier.heightIn(max = 400.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(unavailableDates) { ud ->
                        var showDeleteConfirm by remember { mutableStateOf(false) }

                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            colors = CardDefaults.cardColors(
                                containerColor = SolennixTheme.colors.error.copy(alpha = 0.08f)
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
                                    Icons.Default.Block,
                                    contentDescription = null,
                                    modifier = Modifier.size(20.dp),
                                    tint = SolennixTheme.colors.error
                                )
                                Spacer(modifier = Modifier.width(12.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    val startFormatted = try {
                                        LocalDate.parse(ud.startDate).format(dateFormatter)
                                    } catch (e: Exception) { ud.startDate }
                                    val endFormatted = try {
                                        LocalDate.parse(ud.endDate).format(dateFormatter)
                                    } catch (e: Exception) { ud.endDate }

                                    Text(
                                        text = if (ud.startDate == ud.endDate) {
                                            startFormatted
                                        } else {
                                            "$startFormatted - $endFormatted"
                                        },
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.Medium,
                                        color = SolennixTheme.colors.primaryText
                                    )
                                    if (!ud.reason.isNullOrBlank()) {
                                        Text(
                                            text = ud.reason.orEmpty(),
                                            style = MaterialTheme.typography.bodySmall,
                                            color = SolennixTheme.colors.secondaryText,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis
                                        )
                                    }
                                }
                                IconButton(
                                    onClick = { showDeleteConfirm = true }
                                ) {
                                    Icon(
                                        Icons.Default.Delete,
                                        contentDescription = "Eliminar",
                                        tint = SolennixTheme.colors.error
                                    )
                                }
                            }
                        }

                        if (showDeleteConfirm) {
                            AlertDialog(
                                onDismissRequest = { showDeleteConfirm = false },
                                title = { Text("Eliminar bloqueo") },
                                text = {
                                    Text("¿Estas seguro de que deseas eliminar este rango bloqueado?")
                                },
                                confirmButton = {
                                    TextButton(onClick = {
                                        onDelete(ud.id)
                                        showDeleteConfirm = false
                                    }) {
                                        Text("Eliminar", color = SolennixTheme.colors.error)
                                    }
                                },
                                dismissButton = {
                                    TextButton(onClick = { showDeleteConfirm = false }) {
                                        Text("Cancelar")
                                    }
                                }
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
fun AddDateRangeDialog(
    onConfirm: (LocalDate, LocalDate, String?) -> Unit,
    onDismiss: () -> Unit
) {
    var startDate by remember { mutableStateOf(LocalDate.now()) }
    var endDate by remember { mutableStateOf(LocalDate.now()) }
    var reason by remember { mutableStateOf("") }
    var showStartPicker by remember { mutableStateOf(false) }
    var showEndPicker by remember { mutableStateOf(false) }
    val dateFormatter = DateTimeFormatter.ofPattern("dd MMM yyyy", Locale("es", "MX"))

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Bloquear rango de fechas") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                // Start date
                Text(
                    "Fecha inicio",
                    style = MaterialTheme.typography.labelMedium,
                    color = SolennixTheme.colors.secondaryText
                )
                OutlinedCard(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { showStartPicker = true },
                    shape = MaterialTheme.shapes.medium
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.CalendarToday,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp),
                            tint = SolennixTheme.colors.primary
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = startDate.format(dateFormatter),
                            style = MaterialTheme.typography.bodyMedium,
                            color = SolennixTheme.colors.primaryText
                        )
                    }
                }

                // End date
                Text(
                    "Fecha fin",
                    style = MaterialTheme.typography.labelMedium,
                    color = SolennixTheme.colors.secondaryText
                )
                OutlinedCard(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { showEndPicker = true },
                    shape = MaterialTheme.shapes.medium
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Default.CalendarToday,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp),
                            tint = SolennixTheme.colors.primary
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = endDate.format(dateFormatter),
                            style = MaterialTheme.typography.bodyMedium,
                            color = SolennixTheme.colors.primaryText
                        )
                    }
                }

                // Reason
                OutlinedTextField(
                    value = reason,
                    onValueChange = { reason = it },
                    label = { Text("Motivo (opcional)") },
                    placeholder = { Text("Ej: Vacaciones, mantenimiento...") },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = SolennixTheme.colors.primary,
                        unfocusedBorderColor = SolennixTheme.colors.divider
                    )
                )

                // Validation message
                if (endDate.isBefore(startDate)) {
                    Text(
                        text = "La fecha fin no puede ser anterior a la fecha inicio",
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.error
                    )
                }
            }
        },
        confirmButton = {
            TextButton(
                onClick = { onConfirm(startDate, endDate, reason.ifBlank { null }) },
                enabled = !endDate.isBefore(startDate)
            ) {
                Text("Bloquear", color = if (!endDate.isBefore(startDate)) SolennixTheme.colors.error else SolennixTheme.colors.secondaryText)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancelar")
            }
        }
    )

    // Start date picker
    if (showStartPicker) {
        val datePickerState = rememberDatePickerState(
            initialSelectedDateMillis = startDate.toEpochDay() * 86400000L
        )
        DatePickerDialog(
            onDismissRequest = { showStartPicker = false },
            confirmButton = {
                TextButton(onClick = {
                    datePickerState.selectedDateMillis?.let { millis ->
                        startDate = LocalDate.ofEpochDay(millis / 86400000L)
                        if (endDate.isBefore(startDate)) {
                            endDate = startDate
                        }
                    }
                    showStartPicker = false
                }) {
                    Text("Aceptar")
                }
            },
            dismissButton = {
                TextButton(onClick = { showStartPicker = false }) {
                    Text("Cancelar")
                }
            }
        ) {
            DatePicker(state = datePickerState)
        }
    }

    // End date picker
    if (showEndPicker) {
        val datePickerState = rememberDatePickerState(
            initialSelectedDateMillis = endDate.toEpochDay() * 86400000L
        )
        DatePickerDialog(
            onDismissRequest = { showEndPicker = false },
            confirmButton = {
                TextButton(onClick = {
                    datePickerState.selectedDateMillis?.let { millis ->
                        endDate = LocalDate.ofEpochDay(millis / 86400000L)
                    }
                    showEndPicker = false
                }) {
                    Text("Aceptar")
                }
            },
            dismissButton = {
                TextButton(onClick = { showEndPicker = false }) {
                    Text("Cancelar")
                }
            }
        ) {
            DatePicker(state = datePickerState)
        }
    }
}
