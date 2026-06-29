@file:Suppress("LocalContextGetResourceValueCall", "NonObservableLocale", "LocalContextConfigurationRead")
package com.creapolis.solennix.feature.events.ui

import android.content.Context
import android.content.Intent
import android.widget.Toast
import androidx.annotation.StringRes
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.ExperimentalSharedTransitionApi
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.grid.itemsIndexed as gridItemsIndexed
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Sort
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.semantics.contentDescription
import com.creapolis.solennix.core.designsystem.theme.Spacing
import androidx.compose.ui.semantics.semantics
import androidx.core.content.FileProvider
import androidx.lifecycle.compose.LifecycleResumeEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.creapolis.solennix.core.designsystem.component.EmptyState
import com.creapolis.solennix.core.designsystem.component.SkeletonLoading
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.component.SwipeRevealActions
import com.creapolis.solennix.core.designsystem.component.StatusBadge
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveCardGrid
import com.creapolis.solennix.core.designsystem.util.LocalNavAnimatedVisibilityScope
import com.creapolis.solennix.core.designsystem.util.LocalSharedTransitionScope
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.Client
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.EventStatus
import com.creapolis.solennix.core.model.UnavailableDate
import com.creapolis.solennix.core.model.extensions.asMXN
import com.creapolis.solennix.core.model.extensions.parseFlexibleDate
import com.creapolis.solennix.feature.events.viewmodel.EventListViewModel
import com.creapolis.solennix.feature.events.viewmodel.EventSortField
import com.creapolis.solennix.feature.events.viewmodel.EventStatusFilter
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import kotlinx.coroutines.delay
import java.io.File
import com.creapolis.solennix.feature.events.R
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import java.util.*
import androidx.core.content.FileProvider as AndroidFileProvider
import android.content.Intent as AndroidIntent
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import com.creapolis.solennix.feature.events.ui.dialogs.BlockDateDialog
import com.creapolis.solennix.feature.events.ui.dialogs.UnblockDateDialog
import com.creapolis.solennix.feature.events.ui.dialogs.ManageUnavailableDatesSheet
import com.creapolis.solennix.feature.events.ui.dialogs.AddDateRangeDialog

private fun exportEventsCsv(
    context: Context,
    csvContent: String,
    subject: String,
    chooserTitle: String,
    errorMessage: (String) -> String
) {
    try {
        val file = File(context.cacheDir, "eventos.csv")
        file.writeText(csvContent)
        val uri = AndroidFileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            file
        )
        val intent = AndroidIntent(AndroidIntent.ACTION_SEND).apply {
            type = "text/csv"
            putExtra(AndroidIntent.EXTRA_STREAM, uri)
            putExtra(AndroidIntent.EXTRA_SUBJECT, subject)
            addFlags(AndroidIntent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(AndroidIntent.createChooser(intent, chooserTitle))
    } catch (e: Exception) {
        Toast.makeText(context, errorMessage(e.message.orEmpty()), Toast.LENGTH_SHORT).show()
    }
}

/**
 * View mode for EventsScreen - either LIST or CALENDAR.
 * Defaults to LIST on app launch with no persistence.
 */
enum class EventViewMode { LIST, CALENDAR }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EventsScreen(
    viewModel: EventListViewModel,
    onEventClick: (String) -> Unit,
    onEventEdit: (String) -> Unit = onEventClick,
    onNavigateBack: () -> Unit,
    onSearchClick: (() -> Unit)? = null,
    onCreateEventClick: (LocalDate) -> Unit = {},
    showBackButton: Boolean = true
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val snackbarHostState = remember { SnackbarHostState() }
    val hapticFeedback = com.creapolis.solennix.core.designsystem.util.rememberHapticFeedback()
    val retryLabel = stringResource(R.string.events_list_retry)
    val exportCsvSubject = stringResource(R.string.events_list_export_csv_subject)
    val exportCsvChooser = stringResource(R.string.events_list_export_csv_chooser)

    // View mode state - defaults to LIST, no persistence
    var viewMode by remember { mutableStateOf(EventViewMode.LIST) }

    // Calendar-specific state
    var currentMonth by remember { mutableStateOf(YearMonth.now()) }
    var selectedDate by remember { mutableStateOf(LocalDate.now()) }
    var showBlockDialog by remember { mutableStateOf(false) }
    var showUnblockDialog by remember { mutableStateOf(false) }
    var longPressedDate by remember { mutableStateOf<LocalDate?>(null) }
    var showManageUnavailableSheet by remember { mutableStateOf(false) }
    var showAddRangeDialog by remember { mutableStateOf(false) }
    var isExportingCalendar by remember { mutableStateOf(false) }

    // Sheets + dialogs for row actions + sort
    var showSortSheet by remember { mutableStateOf(false) }
    var rowActionsEvent by remember { mutableStateOf<Event?>(null) }
    var statusChangeEvent by remember { mutableStateOf<Event?>(null) }
    var deleteConfirmEvent by remember { mutableStateOf<Event?>(null) }

    LifecycleResumeEffect(viewModel) {
        viewModel.refresh()
        onPauseOrDispose { }
    }

    LaunchedEffect(uiState.error) {
        uiState.error?.let {
            val result = snackbarHostState.showSnackbar(
                message = it,
                actionLabel = retryLabel,
                duration = SnackbarDuration.Short
            )
            if (result == SnackbarResult.ActionPerformed) {
                viewModel.refresh()
            }
            viewModel.clearError()
        }
    }

    Scaffold(
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            SolennixTopAppBar(
                title = { Text(stringResource(R.string.events_list_title)) },
                onSearchClick = onSearchClick,
                navigationIcon = {
                    if (showBackButton) {
                        IconButton(onClick = onNavigateBack) {
                            Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = stringResource(R.string.events_list_back))
                        }
                    }
                },
                actions = {
                    IconButton(onClick = { showSortSheet = true }) {
                        Icon(Icons.AutoMirrored.Filled.Sort, contentDescription = stringResource(R.string.events_list_sort_menu))
                    }
                    IconButton(onClick = {
                        val csv = viewModel.generateCsvContent()
                        exportEventsCsv(
                            context = context,
                            csvContent = csv,
                            subject = exportCsvSubject,
                            chooserTitle = exportCsvChooser,
                            errorMessage = { message ->
                                context.getString(R.string.events_list_export_csv_error, message)
                            }
                        )
                    }) {
                        Icon(Icons.Default.FileDownload, contentDescription = stringResource(R.string.events_list_export_csv))
                    }
                    // Calendar-specific actions
                    if (viewMode == EventViewMode.CALENDAR) {
                        IconButton(
                            onClick = {
                                // Export calendar functionality
                                isExportingCalendar = true
                                // TODO: Implement calendar export
                                isExportingCalendar = false
                            },
                            enabled = !isExportingCalendar
                        ) {
                            if (isExportingCalendar) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(Spacing.xl),
                                    strokeWidth = Spacing.xs
                                )
                            } else {
                                Icon(
                                    Icons.Default.IosShare,
                                    contentDescription = "Exportar calendario"
                                )
                            }
                        }
                        IconButton(onClick = {
                            showManageUnavailableSheet = true
                        }) {
                            Icon(
                                Icons.Default.Lock,
                                contentDescription = "Gestionar fechas bloqueadas"
                            )
                        }
                    }
                }
            )
        }
    ) { padding ->
        PullToRefreshBox(
            isRefreshing = uiState.isRefreshing,
            onRefresh = { viewModel.refresh() },
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // View mode toggle
                ViewModeToggle(
                    selectedMode = viewMode,
                    onModeSelected = { mode ->
                        hapticFeedback(com.creapolis.solennix.core.designsystem.util.HapticFeedbackType.SELECTION_CHANGED)
                        viewMode = mode
                    }
                )

                EventListFiltersSection(
                    searchQuery = uiState.searchQuery,
                    onSearchQueryChange = viewModel::onSearchQueryChange,
                    startDate = uiState.startDate,
                    endDate = uiState.endDate,
                    onDateRangeChange = viewModel::onDateRangeChange,
                    selectedStatus = uiState.selectedStatus,
                    statusFilters = uiState.statusFilters,
                    onStatusFilterChange = viewModel::onStatusFilterChange,
                    onClearFilters = viewModel::clearFilters,
                )

                // Content based on view mode
                when (viewMode) {
                    EventViewMode.LIST -> EventListContent(
                        uiState = uiState,
                        onEventClick = onEventClick,
                        onEventEdit = onEventEdit,
                        onLongClick = { event -> rowActionsEvent = event },
                        onDeleteClick = { event ->
                            hapticFeedback(com.creapolis.solennix.core.designsystem.util.HapticFeedbackType.WARNING)
                            deleteConfirmEvent = event
                        }
                    )
                    EventViewMode.CALENDAR -> CalendarViewContent(
                        uiState = uiState,
                        currentMonth = currentMonth,
                        selectedDate = selectedDate,
                        onMonthChange = { month -> currentMonth = month },
                        onDateSelected = { date -> selectedDate = date },
                        onGoToToday = {
                            currentMonth = YearMonth.now()
                            selectedDate = LocalDate.now()
                        },
                        onDateLongPress = { date ->
                            longPressedDate = date
                            if (isDateBlocked(date, uiState.unavailableDates)) {
                                showUnblockDialog = true
                            } else {
                                showBlockDialog = true
                            }
                        },
                        onEventClick = onEventClick,
                        onCreateEventClick = onCreateEventClick
                    )
                }
            }
        }
    }

    // Sort bottom sheet
    if (showSortSheet) {
        SortBottomSheet(
            activeField = uiState.sortField,
            ascending = uiState.sortAscending,
            onPick = { field ->
                hapticFeedback(com.creapolis.solennix.core.designsystem.util.HapticFeedbackType.SELECTION_CHANGED)
                viewModel.applySort(field)
                showSortSheet = false
            },
            onDismiss = { showSortSheet = false }
        )
    }

    // Row actions bottom sheet
    rowActionsEvent?.let { event ->
        RowActionsBottomSheet(
            event = event,
            clientName = uiState.clientMap[event.clientId]?.name,
            onEdit = {
                rowActionsEvent = null
                onEventEdit(event.id)
            },
            onChangeStatus = {
                statusChangeEvent = event
                rowActionsEvent = null
            },
            onDelete = {
                hapticFeedback(com.creapolis.solennix.core.designsystem.util.HapticFeedbackType.WARNING)
                deleteConfirmEvent = event
                rowActionsEvent = null
            },
            onDismiss = { rowActionsEvent = null }
        )
    }

    // Status picker bottom sheet
    statusChangeEvent?.let { event ->
        StatusChangeBottomSheet(
            event = event,
            onPick = { newStatus ->
                viewModel.updateEventStatus(event, newStatus)
                statusChangeEvent = null
            },
            onDismiss = { statusChangeEvent = null }
        )
    }

    // Delete confirmation
    deleteConfirmEvent?.let { event ->
        AlertDialog(
            onDismissRequest = { deleteConfirmEvent = null },
            title = { Text(stringResource(R.string.events_list_delete_title)) },
            text = {
                Text(stringResource(R.string.events_list_delete_description, event.serviceType))
            },
            confirmButton = {
                TextButton(onClick = {
                    hapticFeedback(com.creapolis.solennix.core.designsystem.util.HapticFeedbackType.SUCCESS)
                    val removed = viewModel.softDeleteEvent(event)
                    deleteConfirmEvent = null
                    if (removed != null) {
                        val (deletedEvent, index) = removed
                        viewModel.showUndoSnackbar(
                            snackbarHostState = snackbarHostState,
                            onUndo = { viewModel.restoreEvent(deletedEvent, index) },
                            onExpire = { viewModel.confirmDeleteEvent(deletedEvent) { viewModel.restoreEvent(deletedEvent, index) } }
                        )
                    }
                }) {
                    Text(stringResource(R.string.events_list_delete), color = SolennixTheme.colors.error)
                }
            },
            dismissButton = {
                TextButton(onClick = { deleteConfirmEvent = null }) {
                    Text(stringResource(R.string.events_list_cancel))
                }
            }
        )
    }

    // Block date dialog
    if (showBlockDialog && longPressedDate != null) {
        BlockDateDialog(
            date = longPressedDate!!,
            onConfirm = { reason ->
                // TODO: Implement toggleDateBlock in viewModel
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
        val unavailableDate = getUnavailableDateFor(longPressedDate!!, uiState.unavailableDates)
        UnblockDateDialog(
            date = longPressedDate!!,
            reason = unavailableDate?.reason,
            onConfirm = {
                // TODO: Implement toggleDateBlock in viewModel
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
            onDelete = { id ->
                // TODO: Implement deleteUnavailableDate in viewModel
            },
            onAddRange = { showAddRangeDialog = true }
        )
    }

    // Add date range dialog
    if (showAddRangeDialog) {
        AddDateRangeDialog(
            onConfirm = { startDate, endDate, reason ->
                // TODO: Implement blockDateRange in viewModel
                showAddRangeDialog = false
            },
            onDismiss = { showAddRangeDialog = false }
        )
    }
}

/**
 * Material 3 SingleChoiceSegmentedButtonRow for view mode toggle.
 * Follows Material 3 guidelines for mutually exclusive selection.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ViewModeToggle(
    selectedMode: EventViewMode,
    onModeSelected: (EventViewMode) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = Spacing.md, vertical = Spacing.sm)
    ) {
        SingleChoiceSegmentedButtonRow {
            SegmentedButton(
                selected = selectedMode == EventViewMode.LIST,
                onClick = { onModeSelected(EventViewMode.LIST) },
                shape = MaterialTheme.shapes.large
            ) {
                Text("Lista")
            }
            SegmentedButton(
                selected = selectedMode == EventViewMode.CALENDAR,
                onClick = { onModeSelected(EventViewMode.CALENDAR) },
                shape = MaterialTheme.shapes.large
            ) {
                Text("Calendario")
            }
        }
    }
}

/**
 * Event list content - displays events in list/grid layout.
 */
@OptIn(ExperimentalFoundationApi::class)
@Composable
private fun EventListContent(
    uiState: com.creapolis.solennix.feature.events.viewmodel.EventListUiState,
    onEventClick: (String) -> Unit,
    onEventEdit: (String) -> Unit,
    onLongClick: (Event) -> Unit,
    onDeleteClick: (Event) -> Unit
) {
    val sortedEvents = uiState.sortedEvents
    val isLoading = uiState.isLoading
    val isEmpty = sortedEvents.isEmpty() && !isLoading

    AnimatedContent(
        targetState = when {
            isLoading && sortedEvents.isEmpty() -> "loading"
            isEmpty -> "empty"
            else -> "content"
        },
        transitionSpec = { fadeIn() togetherWith fadeOut() },
        label = "eventListState"
    ) { screenState ->
        when (screenState) {
            "loading" -> EventListSkeleton()
            "empty" -> EmptyState(
                icon = Icons.Default.EventBusy,
                title = if (uiState.searchQuery.isNotEmpty()) stringResource(R.string.events_list_empty_results) else stringResource(R.string.events_list_empty_events),
                message = if (uiState.searchQuery.isNotEmpty())
                    stringResource(R.string.events_list_empty_results_message)
                else
                    stringResource(R.string.events_list_empty_events_message)
            )
            else -> AdaptiveCardGrid(
                contentPadding = PaddingValues(vertical = Spacing.sm),
                gridContent = {
                    gridItemsIndexed(
                        items = sortedEvents,
                        key = { _, e -> e.id }
                    ) { index, event ->
                        AnimatedEventListItem(
                            index = index,
                            event = event,
                            clientName = uiState.clientMap[event.clientId]?.name,
                            isUpdatingStatus = uiState.updatingStatusEventId == event.id,
                            onClick = { onEventClick(event.id) },
                            onLongClick = { onLongClick(event) }
                        )
                    }
                },
                listContent = {
                    itemsIndexed(
                        items = sortedEvents,
                        key = { _, e -> e.id }
                    ) { index, event ->
                        SwipeRevealActions(
                            onEdit = { onEventEdit(event.id) },
                            onDelete = { onDeleteClick(event) }
                        ) {
                            Surface(color = SolennixTheme.colors.background) {
                                AnimatedEventListItem(
                                    index = index,
                                    event = event,
                                    clientName = uiState.clientMap[event.clientId]?.name,
                                    isUpdatingStatus = uiState.updatingStatusEventId == event.id,
                                    onClick = { onEventClick(event.id) },
                                    onLongClick = { onLongClick(event) }
                                )
                            }
                        }
                    }
                }
            )
        }
    }
}

/**
 * Calendar view content - displays calendar grid and selected day's events.
 */
@Composable
private fun CalendarViewContent(
    uiState: com.creapolis.solennix.feature.events.viewmodel.EventListUiState,
    currentMonth: YearMonth,
    selectedDate: LocalDate,
    onMonthChange: (YearMonth) -> Unit,
    onDateSelected: (LocalDate) -> Unit,
    onGoToToday: () -> Unit,
    onDateLongPress: (LocalDate) -> Unit,
    onEventClick: (String) -> Unit,
    onCreateEventClick: (LocalDate) -> Unit
) {
    val dateFormatter = DateTimeFormatter.ofPattern("EEEE d MMMM", Locale.getDefault())
    val eventsForSelectedDate = uiState.sortedEvents.filter {
        parseFlexibleDate(it.eventDate) == selectedDate
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = Spacing.xl, vertical = Spacing.sm),
        verticalArrangement = Arrangement.spacedBy(Spacing.sm)
    ) {
        item {
            Surface(
                color = SolennixTheme.colors.card,
                shape = MaterialTheme.shapes.large
            ) {
                Column(modifier = Modifier.padding(bottom = Spacing.sm)) {
                    CalendarHeader(
                        currentMonth = currentMonth,
                        onPreviousMonth = { onMonthChange(currentMonth.minusMonths(1)) },
                        onNextMonth = { onMonthChange(currentMonth.plusMonths(1)) },
                        onGoToToday = onGoToToday
                    )
                    CalendarGrid(
                        currentMonth = currentMonth,
                        selectedDate = selectedDate,
                        onDateSelected = onDateSelected,
                        onDateLongPress = onDateLongPress,
                        events = uiState.sortedEvents,
                        unavailableDates = uiState.unavailableDates
                    )
                }
            }
        }

        item {
            Text(
                text = selectedDate.format(dateFormatter).replaceFirstChar { it.uppercase() },
                modifier = Modifier.padding(horizontal = Spacing.xs),
                style = MaterialTheme.typography.titleMedium,
                color = SolennixTheme.colors.primaryText
            )
        }

        if (eventsForSelectedDate.isEmpty()) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = Spacing.xxxl),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            Icons.Default.CalendarMonth,
                            contentDescription = null,
                            modifier = Modifier.size(Spacing.xxxl),
                            tint = SolennixTheme.colors.secondaryText
                        )
                        Spacer(modifier = Modifier.height(Spacing.xl))
                        Text(
                            text = "No hay eventos programados",
                            color = SolennixTheme.colors.secondaryText
                        )
                    }
                }
            }
        } else {
            items(eventsForSelectedDate) { event ->
                CalendarEventItem(
                    event = event,
                    clientName = uiState.clientMap[event.clientId]?.name,
                    onClick = { onEventClick(event.id) }
                )
            }
        }
    }
}

/**
 * Check if a date is blocked based on unavailable dates.
 */
private fun isDateBlocked(date: LocalDate, unavailableDates: List<UnavailableDate>): Boolean {
    val dateStr = date.toString()
    return unavailableDates.any { ud ->
        dateStr >= ud.startDate && dateStr <= ud.endDate
    }
}

/**
 * Get unavailable date for a specific date.
 */
private fun getUnavailableDateFor(date: LocalDate, unavailableDates: List<UnavailableDate>): UnavailableDate? {
    val dateStr = date.toString()
    return unavailableDates.firstOrNull { ud ->
        dateStr >= ud.startDate && dateStr <= ud.endDate
    }
}
