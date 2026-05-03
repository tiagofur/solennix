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
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.LifecycleResumeEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.component.SolennixSectionTopAppBar
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveCenteredContent
import com.creapolis.solennix.core.designsystem.theme.LocalIsWideScreen
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.designsystem.component.StatusBadge
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.EventStatus
import com.creapolis.solennix.core.model.UnavailableDate
import com.creapolis.solennix.feature.calendar.R
import com.creapolis.solennix.feature.calendar.viewmodel.CalendarError
import com.creapolis.solennix.feature.calendar.viewmodel.CalendarUiState
import com.creapolis.solennix.feature.calendar.viewmodel.CalendarViewModel
import kotlinx.coroutines.launch
import java.io.File
import java.time.LocalDate
import java.time.YearMonth
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.FileProvider
import android.content.Intent
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import com.creapolis.solennix.core.model.extensions.parseFlexibleDate
import java.time.format.DateTimeFormatter
import java.time.format.TextStyle
import java.util.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CalendarScreen(
    viewModel: CalendarViewModel,
    onEventClick: (String) -> Unit,
    onCreateEventClick: (LocalDate) -> Unit = {},
    onSearchClick: () -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val error by viewModel.error.collectAsStateWithLifecycle()
    val isExportingCalendar by viewModel.isExportingCalendar.collectAsStateWithLifecycle()
    val isWideScreen = LocalIsWideScreen.current
    val context = LocalContext.current
    var showBlockDialog by remember { mutableStateOf(false) }

    LifecycleResumeEffect(viewModel) {
        viewModel.refresh()
        onPauseOrDispose { }
    }
    var showUnblockDialog by remember { mutableStateOf(false) }
    var longPressedDate by remember { mutableStateOf<LocalDate?>(null) }
    var showManageUnavailableSheet by remember { mutableStateOf(false) }
    var showAddRangeDialog by remember { mutableStateOf(false) }

    // Snackbar plumbing for the ViewModel's error StateFlow. Pre-resolve the
    // localized strings here (composition context) because the LaunchedEffect
    // body runs outside of @Composable scope and can't call stringResource.
    val snackbarHostState = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val loadFailedMessage = stringResource(R.string.calendar_error_load_failed)
    val blockFailedMessage = stringResource(R.string.calendar_error_block_failed)
    val unblockFailedMessage = stringResource(R.string.calendar_error_unblock_failed)
    val exportFailedMessage = stringResource(R.string.calendar_error_export_failed)

    LaunchedEffect(error) {
        val message = when (error) {
            CalendarError.LoadFailed -> loadFailedMessage
            CalendarError.BlockFailed -> blockFailedMessage
            CalendarError.UnblockFailed -> unblockFailedMessage
            CalendarError.ExportFailed -> exportFailedMessage
            null -> null
        }
        if (message != null) {
            scope.launch {
                snackbarHostState.showSnackbar(message)
                viewModel.clearError()
            }
        }
    }

    // Share .ics file when the ViewModel emits a successful export
    LaunchedEffect(Unit) {
        viewModel.exportIcalResult.collect { icsContent ->
            val file = withContext(Dispatchers.IO) {
                File(context.cacheDir, "solennix-calendar.ics").also { it.writeText(icsContent) }
            }
            val uri = FileProvider.getUriForFile(
                context, "${context.packageName}.fileprovider", file
            )
            val sendIntent = Intent(Intent.ACTION_SEND).apply {
                type = "text/calendar"
                putExtra(Intent.EXTRA_STREAM, uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            context.startActivity(Intent.createChooser(sendIntent, null))
        }
    }

    Scaffold(
        topBar = {
            SolennixSectionTopAppBar(
                title = stringResource(R.string.calendar_title),
                onSearchClick = onSearchClick,
                actions = {
                    IconButton(
                        onClick = { viewModel.exportCalendar() },
                        enabled = !isExportingCalendar
                    ) {
                        if (isExportingCalendar) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(20.dp),
                                strokeWidth = 2.dp
                            )
                        } else {
                            Icon(
                                Icons.Default.IosShare,
                                contentDescription = stringResource(R.string.calendar_export_ical)
                            )
                        }
                    }
                    IconButton(onClick = {
                        viewModel.loadAllUnavailableDates()
                        showManageUnavailableSheet = true
                    }) {
                        Icon(
                            Icons.Default.Lock,
                            contentDescription = stringResource(R.string.calendar_manage_blocks)
                        )
                    }
                }
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { onCreateEventClick(uiState.selectedDate) },
                containerColor = SolennixTheme.colors.primary,
                contentColor = androidx.compose.ui.graphics.Color.White
            ) {
                Icon(
                    Icons.Default.Add,
                    contentDescription = stringResource(R.string.calendar_new_event)
                )
            }
        }
    ) { padding ->
        Column(modifier = Modifier.padding(padding)) {
            StatusFilterChips(
                selected = uiState.statusFilter,
                onSelect = viewModel::setStatusFilter
            )
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

/**
 * M3 FilterChip row above the calendar grid. Keeps the grid dots + the
 * selected-day list in sync with the chosen status. `null` = "Todos".
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun StatusFilterChips(
    selected: EventStatus?,
    onSelect: (EventStatus?) -> Unit
) {
    val options: List<Pair<EventStatus?, Int>> = listOf(
        null to R.string.calendar_filter_all,
        EventStatus.QUOTED to R.string.calendar_filter_quoted,
        EventStatus.CONFIRMED to R.string.calendar_filter_confirmed,
        EventStatus.COMPLETED to R.string.calendar_filter_completed,
        EventStatus.CANCELLED to R.string.calendar_filter_cancelled
    )
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(horizontal = 12.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        options.forEach { (status, labelRes) ->
            FilterChip(
                selected = selected == status,
                onClick = { onSelect(status) },
                label = { Text(stringResource(labelRes)) }
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
    // Use the device locale so month names + day-of-week follow the
    // user's language (es → "lunes 20 de abril", en → "Monday, April 20").
    val dateFormatter = DateTimeFormatter.ofPattern("EEEE d MMMM", Locale.getDefault())

    if (isWideScreen) {
        // Tablet: compact calendar (left, max 480dp) + events panel (right)
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(12.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Left panel: Calendar card
            Surface(
                modifier = Modifier
                    .widthIn(max = 480.dp)
                    .fillMaxHeight(),
                color = SolennixTheme.colors.card,
                shape = MaterialTheme.shapes.large
            ) {
                Column {
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
                        isWideScreen = true,
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            // Right panel: Selected day's events card
            Surface(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight(),
                color = SolennixTheme.colors.card,
                shape = MaterialTheme.shapes.large
            ) {
                Column {
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
                                    text = stringResource(R.string.calendar_no_events_scheduled),
                                    color = SolennixTheme.colors.secondaryText
                                )
                            }
                        }
                    } else {
                        // Tablet events panel — add horizontal padding here
                        // (the card no longer carries its own) so items don't
                        // touch the Surface edges.
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 0.dp)
                        ) {
                            items(uiState.eventsForSelectedDate) { event ->
                                CalendarEventItem(
                                    event = event,
                                    clientName = uiState.clientNames[event.clientId],
                                    onClick = { onEventClick(event.id) }
                                )
                            }
                        }
                    }
                }
            }
        }
    } else {
        // Phone: single-column layout with calendar in a card
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            item {
                Surface(
                    color = SolennixTheme.colors.card,
                    shape = MaterialTheme.shapes.large
                ) {
                    Column(modifier = Modifier.padding(bottom = 8.dp)) {
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
                            unavailableDates = uiState.unavailableDates
                        )
                    }
                }
            }

            item {
                Text(
                    text = uiState.selectedDate.format(dateFormatter).replaceFirstChar { it.uppercase() },
                    modifier = Modifier.padding(horizontal = 4.dp),
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
                                text = stringResource(R.string.calendar_no_events_scheduled),
                                color = SolennixTheme.colors.secondaryText
                            )
                        }
                    }
                }
            } else {
                items(uiState.eventsForSelectedDate) { event ->
                    CalendarEventItem(
                                    event = event,
                                    clientName = uiState.clientNames[event.clientId],
                                    onClick = { onEventClick(event.id) }
                                )
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
            Icon(
                Icons.AutoMirrored.Filled.KeyboardArrowLeft,
                contentDescription = stringResource(R.string.calendar_previous_month)
            )
        }
        Text(
            text = "${currentMonth.month.getDisplayName(TextStyle.FULL, Locale.getDefault()).replaceFirstChar { it.uppercase() }} ${currentMonth.year}",
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
                    stringResource(R.string.calendar_today),
                    style = MaterialTheme.typography.labelMedium,
                    color = SolennixTheme.colors.primary,
                    fontWeight = FontWeight.SemiBold
                )
            }
            IconButton(onClick = onNextMonth) {
                Icon(
                    Icons.AutoMirrored.Filled.KeyboardArrowRight,
                    contentDescription = stringResource(R.string.calendar_next_month)
                )
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
    isWideScreen: Boolean = false,
    modifier: Modifier = Modifier
) {
    val daysInMonth = currentMonth.lengthOfMonth()
    val firstDayOfMonth = currentMonth.atDay(1).dayOfWeek.value % 7 // Sunday = 0
    val days = (1..daysInMonth).toList()
    val previousMonthDays = (0 until firstDayOfMonth).map { null }
    val allDays = previousMonthDays + days

    val errorColor = SolennixTheme.colors.error
    val today = LocalDate.now()
    val haptic = LocalHapticFeedback.current

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
                    val eventsOnDate = events.filter {
                        parseFlexibleDate(it.eventDate) == date
                    }
                    val hasEvents = eventsOnDate.isNotEmpty()

                    /// CORREGIDO BUG OVERFLOW
                    /// Antes: overflow = eventsOnDate.size - 3 (restaba siempre 3, incluso si <3 eventos únicos)
                    /// Ahora: cuenta eventos ÚNICOS por status que SE RENDERIZARÁN como dots, restará esos:
                    ///   - 5 eventos × "confirmed" → 1 dot azul → overflow = 4  
                    ///   - 2 confirmed + 3 quoted = 2 dots (azul+gris) → overflow = 0  
                    /// Fórmula: totalEvents - min(unique_statuses_count, 3)
                    val uniqueDotsCount = eventsOnDate.groupBy { it.status }.values.size.coerceAtMost(3)
                    val overflow = maxOf(0, eventsOnDate.size - uniqueDotsCount)

                    val bgColor = when {
                        isSelected -> SolennixTheme.colors.primary
                        isToday -> SolennixTheme.colors.primaryLight
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
                                onLongClick = {
                                    // Haptic at the moment the dialog is about
                                    // to open — user gets a tactile "gotcha"
                                    // before the dialog shifts focus away.
                                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                    onDateLongPress(date)
                                }
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
                                // Up to 3 colored dots by event status.
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
                                // "+N más" overflow when more than 3 events
                                // land on the same day. Tiny caption below the
                                // dots so it doesn't fight with the day number.
                                if (overflow > 0) {
                                    Text(
                                        text = stringResource(
                                            R.string.calendar_overflow_more,
                                            overflow
                                        ),
                                        fontSize = 8.sp,
                                        color = SolennixTheme.colors.secondaryText,
                                        maxLines = 1
                                    )
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

/**
 * Baseline event card shared with iOS — the same information density so
 * the user sees the same card on both phones:
 *   - vertical status bar (left, Android-native idiom vs. iOS's dot)
 *   - client name (bold, primary row)
 *   - service type (caption)
 *   - status badge (right of the client row)
 *   - time range (start - end, or "Todo el día")
 *   - people count + MXN total (bottom meta row)
 */
@Composable
fun CalendarEventItem(
    event: Event,
    clientName: String?,
    onClick: () -> Unit
) {
    // No horizontal padding here — the LazyColumn that hosts these cards
    // already applies `contentPadding(horizontal = 12.dp)` (phone mode) or
    // sits inside a Surface with its own inset (tablet mode).
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
            .clickable(onClick = onClick),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.medium
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Left: status color bar (Android's native marker vs. iOS's dot).
            Box(
                modifier = Modifier
                    .width(4.dp)
                    .height(56.dp)
                    .clip(CircleShape)
                    .background(getStatusColor(event.status))
            )
            Spacer(modifier = Modifier.width(12.dp))

            Column(modifier = Modifier.weight(1f)) {
                // Row 1: client (bold) + status badge (right).
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = clientName
                            ?: stringResource(R.string.calendar_unknown_client),
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.SemiBold,
                        color = SolennixTheme.colors.primaryText,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f)
                    )
                    StatusBadge(status = event.status.name.lowercase())
                }
                // Row 2: service type.
                Text(
                    text = event.serviceType,
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(modifier = Modifier.height(6.dp))
                // Row 3: time range · people · amount.
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    val timeLabel = when {
                        event.startTime == null -> stringResource(R.string.calendar_all_day)
                        event.endTime != null -> stringResource(
                            R.string.calendar_event_time_range,
                            event.startTime!!.take(5),
                            event.endTime!!.take(5)
                        )
                        else -> event.startTime!!.take(5)
                    }
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(
                            Icons.Default.Schedule,
                            contentDescription = null,
                            modifier = Modifier.size(14.dp),
                            tint = SolennixTheme.colors.secondaryText
                        )
                        Text(
                            text = timeLabel,
                            style = MaterialTheme.typography.bodySmall,
                            color = SolennixTheme.colors.secondaryText
                        )
                    }
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Icon(
                            Icons.Default.People,
                            contentDescription = null,
                            modifier = Modifier.size(14.dp),
                            tint = SolennixTheme.colors.secondaryText
                        )
                        Text(
                            text = stringResource(
                                R.string.calendar_event_people_count,
                                event.numPeople
                            ),
                            style = MaterialTheme.typography.bodySmall,
                            color = SolennixTheme.colors.secondaryText
                        )
                    }
                    Spacer(modifier = Modifier.weight(1f))
                    // Amount rendered without decimals (dashboard parity) —
                    // cents belong to the event detail screen, not a list card.
                    Text(
                        text = "$${String.format("%,.0f", event.totalAmount)}",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.SemiBold,
                        color = SolennixTheme.colors.primary
                    )
                }
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
    val dateFormatter = DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.getDefault())

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.calendar_block_title)) },
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
                    label = { Text(stringResource(R.string.calendar_block_reason_label)) },
                    placeholder = {
                        Text(stringResource(R.string.calendar_block_reason_placeholder_single))
                    },
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
                Text(
                    stringResource(R.string.calendar_block_confirm),
                    color = SolennixTheme.colors.error
                )
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(stringResource(R.string.calendar_action_cancel))
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
    val dateFormatter = DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.getDefault())

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.calendar_unblock_title)) },
        text = {
            Column {
                Text(
                    text = date.format(dateFormatter),
                    style = MaterialTheme.typography.bodyLarge,
                    color = SolennixTheme.colors.primaryText
                )
                if (!reason.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = stringResource(R.string.calendar_unblock_reason_prefix, reason),
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.secondaryText
                    )
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onConfirm) {
                Text(
                    stringResource(R.string.calendar_unblock_confirm),
                    color = SolennixTheme.colors.primary
                )
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(stringResource(R.string.calendar_action_cancel))
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
    val dateFormatter = DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.getDefault())

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
                    text = stringResource(R.string.calendar_blocked_dates_title),
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
                    Text(stringResource(R.string.calendar_block_add_range))
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
                            text = stringResource(R.string.calendar_blocked_dates_empty),
                            style = MaterialTheme.typography.bodyLarge,
                            color = SolennixTheme.colors.secondaryText
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = stringResource(R.string.calendar_blocked_dates_empty_subtitle),
                            style = MaterialTheme.typography.bodySmall,
                            color = SolennixTheme.colors.secondaryText
                        )
                    }
                }
            } else {
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
                                        contentDescription = stringResource(R.string.calendar_action_delete),
                                        tint = SolennixTheme.colors.error
                                    )
                                }
                            }
                        }

                        if (showDeleteConfirm) {
                            AlertDialog(
                                onDismissRequest = { showDeleteConfirm = false },
                                title = { Text(stringResource(R.string.calendar_delete_block_title)) },
                                confirmButton = {
                                    TextButton(onClick = {
                                        onDelete(ud.id)
                                        showDeleteConfirm = false
                                    }) {
                                        Text(
                                            stringResource(R.string.calendar_action_delete),
                                            color = SolennixTheme.colors.error
                                        )
                                    }
                                },
                                dismissButton = {
                                    TextButton(onClick = { showDeleteConfirm = false }) {
                                        Text(stringResource(R.string.calendar_action_cancel))
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
    val dateFormatter = DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.getDefault())

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.calendar_block_range_title)) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                // Start date
                Text(
                    stringResource(R.string.calendar_block_start_date),
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
                    stringResource(R.string.calendar_block_end_date),
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
                    label = { Text(stringResource(R.string.calendar_block_reason_label)) },
                    placeholder = {
                        Text(stringResource(R.string.calendar_block_reason_placeholder_range))
                    },
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
                        text = stringResource(R.string.calendar_block_range_invalid),
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
                Text(
                    stringResource(R.string.calendar_block_confirm),
                    color = if (!endDate.isBefore(startDate)) SolennixTheme.colors.error else SolennixTheme.colors.secondaryText
                )
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text(stringResource(R.string.calendar_action_cancel))
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
                    Text(stringResource(R.string.calendar_action_ok))
                }
            },
            dismissButton = {
                TextButton(onClick = { showStartPicker = false }) {
                    Text(stringResource(R.string.calendar_action_cancel))
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
                    Text(stringResource(R.string.calendar_action_ok))
                }
            },
            dismissButton = {
                TextButton(onClick = { showEndPicker = false }) {
                    Text(stringResource(R.string.calendar_action_cancel))
                }
            }
        ) {
            DatePicker(state = datePickerState)
        }
    }
}
