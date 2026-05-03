package com.creapolis.solennix.feature.events.ui

import android.content.Context
import android.content.Intent
import android.widget.Toast
import androidx.annotation.StringRes
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
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
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.semantics.semantics
import androidx.core.content.FileProvider
import androidx.lifecycle.compose.LifecycleResumeEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.paging.LoadState
import androidx.paging.compose.collectAsLazyPagingItems
import androidx.paging.compose.itemKey
import com.creapolis.solennix.core.designsystem.component.EmptyState
import com.creapolis.solennix.core.designsystem.component.SkeletonLoading
import com.creapolis.solennix.core.designsystem.component.SolennixTopAppBar
import com.creapolis.solennix.core.designsystem.component.StatusBadge
import com.creapolis.solennix.core.designsystem.component.adaptive.AdaptiveCardGrid
import com.creapolis.solennix.core.designsystem.util.LocalNavAnimatedVisibilityScope
import com.creapolis.solennix.core.designsystem.util.LocalSharedTransitionScope
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.Client
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.EventStatus
import com.creapolis.solennix.core.model.extensions.asMXN
import com.creapolis.solennix.feature.events.viewmodel.EventListViewModel
import com.creapolis.solennix.feature.events.viewmodel.EventSortField
import com.creapolis.solennix.feature.events.viewmodel.EventStatusFilter
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import kotlinx.coroutines.delay
import java.io.File
import com.creapolis.solennix.core.model.extensions.parseFlexibleDate
import com.creapolis.solennix.feature.events.R
import java.time.format.DateTimeFormatter
import java.util.*

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
        val uri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            file
        )
        val intent = Intent(Intent.ACTION_SEND).apply {
            type = "text/csv"
            putExtra(Intent.EXTRA_STREAM, uri)
            putExtra(Intent.EXTRA_SUBJECT, subject)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        context.startActivity(Intent.createChooser(intent, chooserTitle))
    } catch (e: Exception) {
        Toast.makeText(context, errorMessage(e.message.orEmpty()), Toast.LENGTH_SHORT).show()
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EventListScreen(
    viewModel: EventListViewModel,
    onEventClick: (String) -> Unit,
    onEventEdit: (String) -> Unit = onEventClick,
    onNavigateBack: () -> Unit,
    onSearchClick: (() -> Unit)? = null,
    showBackButton: Boolean = true
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val snackbarHostState = remember { SnackbarHostState() }
    val retryLabel = stringResource(R.string.events_list_retry)
    val exportCsvSubject = stringResource(R.string.events_list_export_csv_subject)
    val exportCsvChooser = stringResource(R.string.events_list_export_csv_chooser)
    // Sheets + dialogs for row actions + sort. We keep them in one place
    // at the screen level so the event card itself stays purely visual.
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
                // Search and Filter Header
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    OutlinedTextField(
                        value = uiState.searchQuery,
                        onValueChange = { viewModel.onSearchQueryChange(it) },
                        modifier = Modifier.weight(1f),
                        placeholder = { Text(stringResource(R.string.events_list_search_placeholder)) },
                        leadingIcon = { Icon(Icons.Default.Search, contentDescription = null) },
                        trailingIcon = {
                            if (uiState.searchQuery.isNotEmpty()) {
                                IconButton(onClick = { viewModel.onSearchQueryChange("") }) {
                                    Icon(Icons.Default.Clear, contentDescription = stringResource(R.string.events_list_clear_search))
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
                    
                    Spacer(modifier = Modifier.width(8.dp))
                    
                    var showDateRangePicker by remember { mutableStateOf(false) }
                    
                    IconButton(
                        onClick = { showDateRangePicker = true },
                        colors = IconButtonDefaults.iconButtonColors(
                            containerColor = if (uiState.startDate != null) 
                                SolennixTheme.colors.primaryLight 
                            else Color.Transparent
                        )
                    ) {
                        Icon(
                            Icons.Default.DateRange, 
                            contentDescription = stringResource(R.string.events_list_date_range),
                            tint = if (uiState.startDate != null) 
                                SolennixTheme.colors.primary 
                            else SolennixTheme.colors.secondaryText
                        )
                    }

                    if (showDateRangePicker) {
                        val dateRangePickerState = rememberDateRangePickerState()
                        DatePickerDialog(
                            onDismissRequest = { showDateRangePicker = false },
                            confirmButton = {
                                TextButton(onClick = {
                                    val start = dateRangePickerState.selectedStartDateMillis?.let {
                                        java.time.Instant.ofEpochMilli(it).atZone(java.time.ZoneId.systemDefault()).toLocalDate()
                                    }
                                    val end = dateRangePickerState.selectedEndDateMillis?.let {
                                        java.time.Instant.ofEpochMilli(it).atZone(java.time.ZoneId.systemDefault()).toLocalDate()
                                    }
                                    viewModel.onDateRangeChange(start, end)
                                    showDateRangePicker = false
                                }) { Text(stringResource(R.string.events_list_apply)) }
                            },
                            dismissButton = {
                                TextButton(onClick = { showDateRangePicker = false }) { Text(stringResource(R.string.events_list_cancel)) }
                            }
                        ) {
                            DateRangePicker(
                                state = dateRangePickerState,
                                modifier = Modifier.height(400.dp),
                                title = { Text(stringResource(R.string.events_list_select_range)) },
                                headline = { Text(stringResource(R.string.events_list_date_filter_headline)) },
                                showModeToggle = false,
                                colors = DatePickerDefaults.colors(
                                    selectedDayContainerColor = SolennixTheme.colors.primary,
                                    todayContentColor = SolennixTheme.colors.primary,
                                    todayDateBorderColor = SolennixTheme.colors.primary
                                )
                            )
                        }
                    }
                }

                // Active Filters Chips
                if (uiState.startDate != null || uiState.selectedStatus != null) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState())
                            .padding(horizontal = 16.dp, vertical = 4.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        if (uiState.startDate != null) {
                            val formatter = DateTimeFormatter.ofPattern("dd/MM", Locale.getDefault())
                            val label = "${uiState.startDate!!.format(formatter)} - ${uiState.endDate?.format(formatter) ?: "…"}"
                            FilterChip(
                                selected = true,
                                onClick = { viewModel.onDateRangeChange(null, null) },
                                label = { Text(label) },
                                trailingIcon = { Icon(Icons.Default.Close, contentDescription = null, modifier = Modifier.size(16.dp)) }
                            )
                        }
                        
                        TextButton(onClick = { viewModel.clearFilters() }) {
                            Text(stringResource(R.string.events_list_clear_all), style = MaterialTheme.typography.labelSmall)
                        }
                    }
                }

                // Status Filter Chips
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState())
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    uiState.statusFilters.forEach { filter ->
                        val isSelected = filter.status == uiState.selectedStatus
                        FilterChip(
                            selected = isSelected,
                            onClick = { viewModel.onStatusFilterChange(filter.status) },
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
                                                color = if (isSelected) MaterialTheme.colorScheme.onPrimary else SolennixTheme.colors.primaryText
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

                // Event list — uses the filter-sorted StateFlow from the VM
                // (replaces the Paging3 flow so sort can be applied across
                // the full dataset without a DAO schema change).
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
                            contentPadding = PaddingValues(vertical = 8.dp),
                            gridContent = {
                                items(
                                    items = sortedEvents,
                                    key = { it.id }
                                ) { event ->
                                    AnimatedEventListItem(
                                        index = sortedEvents.indexOf(event),
                                        event = event,
                                        clientName = uiState.clientMap[event.clientId]?.name,
                                        isUpdatingStatus = uiState.updatingStatusEventId == event.id,
                                        onClick = { onEventClick(event.id) },
                                        onLongClick = { rowActionsEvent = event }
                                    )
                                }
                            },
                            listContent = {
                                items(
                                    items = sortedEvents,
                                    key = { it.id }
                                ) { event ->
                                    AnimatedEventListItem(
                                        index = sortedEvents.indexOf(event),
                                        event = event,
                                        clientName = uiState.clientMap[event.clientId]?.name,
                                        isUpdatingStatus = uiState.updatingStatusEventId == event.id,
                                        onClick = { onEventClick(event.id) },
                                        onLongClick = { rowActionsEvent = event }
                                    )
                                }
                            }
                        )
                    }
                }
            }
        }
    }

    // Sort bottom sheet — M3 idiom for "pick one of these options".
    if (showSortSheet) {
        SortBottomSheet(
            activeField = uiState.sortField,
            ascending = uiState.sortAscending,
            onPick = { field ->
                viewModel.applySort(field)
                showSortSheet = false
            },
            onDismiss = { showSortSheet = false }
        )
    }

    // Row actions bottom sheet — triggered by long-press on an event card.
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
                deleteConfirmEvent = event
                rowActionsEvent = null
            },
            onDismiss = { rowActionsEvent = null }
        )
    }

    // Status picker bottom sheet — secondary sheet after the user picks
    // "Cambiar estado" from the row actions sheet.
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

    // Delete confirmation — still shows dialog first, then triggers soft delete.
    // The screen shows the snackbar; user can undo for 30s.
    deleteConfirmEvent?.let { event ->
        AlertDialog(
            onDismissRequest = { deleteConfirmEvent = null },
            title = { Text(stringResource(R.string.events_list_delete_title)) },
            text = {
                Text(stringResource(R.string.events_list_delete_description, event.serviceType))
            },
            confirmButton = {
                TextButton(onClick = {
                    val removed = viewModel.softDeleteEvent(event)
<<<<<<< HEAD
                    deleteConfirmEvent = null
                    if (removed != null) {
                        val (deletedEvent, index) = removed
=======
                    if (removed != null) {
                        val (deletedEvent, index) = removed
                        deleteConfirmEvent = null
>>>>>>> b156e3ff (feat(android): add soft-delete + undo snackbar to events list)
                        // Show undo snackbar
                        viewModel.showUndoSnackbar(
                            snackbarHostState = snackbarHostState,
                            onUndo = { viewModel.restoreEvent(deletedEvent, index) },
<<<<<<< HEAD
                            onExpire = { viewModel.confirmDeleteEvent(deletedEvent) { viewModel.restoreEvent(deletedEvent, index) } }
=======
                            onExpire = { viewModel.confirmDeleteEvent(deletedEvent) }
>>>>>>> b156e3ff (feat(android): add soft-delete + undo snackbar to events list)
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
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun SortBottomSheet(
    activeField: EventSortField,
    ascending: Boolean,
    onPick: (EventSortField) -> Unit,
    onDismiss: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val options = listOf(
        EventSortField.EVENT_DATE to R.string.events_list_sort_date,
        EventSortField.SERVICE_TYPE to R.string.events_list_sort_service,
        EventSortField.CLIENT_NAME to R.string.events_list_sort_client,
        EventSortField.TOTAL_AMOUNT to R.string.events_list_sort_total
    )
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
            Text(
                stringResource(R.string.events_list_sort_by),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = SolennixTheme.colors.primaryText
            )
            Spacer(modifier = Modifier.height(12.dp))
            options.forEach { (field, labelRes) ->
                val isActive = field == activeField
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onPick(field) }
                        .padding(vertical = 14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        stringResource(labelRes),
                        modifier = Modifier.weight(1f),
                        style = MaterialTheme.typography.bodyLarge,
                        color = if (isActive) SolennixTheme.colors.primary
                        else SolennixTheme.colors.primaryText,
                        fontWeight = if (isActive) FontWeight.SemiBold else FontWeight.Normal
                    )
                    if (isActive) {
                        Icon(
                            if (ascending) Icons.Default.ArrowUpward else Icons.Default.ArrowDownward,
                            contentDescription = stringResource(if (ascending) R.string.events_list_sort_ascending else R.string.events_list_sort_descending),
                            tint = SolennixTheme.colors.primary
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun RowActionsBottomSheet(
    event: Event,
    clientName: String?,
    onEdit: () -> Unit,
    onChangeStatus: () -> Unit,
    onDelete: () -> Unit,
    onDismiss: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = SolennixTheme.colors.card
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 32.dp)
        ) {
            // Header with the event's identifying info — so the user has
            // context for which row they're acting on.
            Column(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
                Text(
                    clientName ?: stringResource(R.string.events_list_client_fallback),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = SolennixTheme.colors.primaryText,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    event.serviceType,
                    style = MaterialTheme.typography.bodySmall,
                    color = SolennixTheme.colors.secondaryText,
                    maxLines = 1
                )
            }
            HorizontalDivider(color = SolennixTheme.colors.divider)

            RowActionItem(icon = Icons.Default.Edit, label = stringResource(R.string.events_list_action_edit), onClick = onEdit)
            RowActionItem(
                icon = Icons.Default.SwapVert,
                label = stringResource(R.string.events_list_action_change_status),
                onClick = onChangeStatus
            )
            RowActionItem(
                icon = Icons.Default.Delete,
                label = stringResource(R.string.events_list_action_delete),
                destructive = true,
                onClick = onDelete
            )
        }
    }
}

@Composable
private fun RowActionItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    destructive: Boolean = false,
    onClick: () -> Unit
) {
    val tint = if (destructive) SolennixTheme.colors.error else SolennixTheme.colors.primaryText
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, contentDescription = null, tint = tint)
        Spacer(modifier = Modifier.width(16.dp))
        Text(label, style = MaterialTheme.typography.bodyLarge, color = tint)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun StatusChangeBottomSheet(
    event: Event,
    onPick: (EventStatus) -> Unit,
    onDismiss: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val options = listOf(
        EventStatus.QUOTED to R.string.events_list_status_quoted,
        EventStatus.CONFIRMED to R.string.events_list_status_confirmed,
        EventStatus.COMPLETED to R.string.events_list_status_completed,
        EventStatus.CANCELLED to R.string.events_list_status_cancelled
    )
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
            Text(
                stringResource(R.string.events_list_status_change_title),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = SolennixTheme.colors.primaryText
            )
            Spacer(modifier = Modifier.height(12.dp))
            options.forEach { (status, labelRes) ->
                val isActive = status == event.status
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { onPick(status) }
                        .padding(vertical = 14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        stringResource(labelRes),
                        modifier = Modifier.weight(1f),
                        style = MaterialTheme.typography.bodyLarge,
                        color = if (isActive) SolennixTheme.colors.primary
                        else SolennixTheme.colors.primaryText,
                        fontWeight = if (isActive) FontWeight.SemiBold else FontWeight.Normal
                    )
                    if (isActive) {
                        Icon(
                            Icons.Default.Check,
                            contentDescription = null,
                            tint = SolennixTheme.colors.primary
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun EventListSkeleton() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(top = 8.dp)
    ) {
        repeat(5) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                shape = MaterialTheme.shapes.medium
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        SkeletonLoading(
                            modifier = Modifier
                                .height(20.dp)
                                .fillMaxWidth(0.45f)
                        )
                        SkeletonLoading(
                            modifier = Modifier
                                .height(24.dp)
                                .width(92.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))
                    SkeletonLoading(
                        modifier = Modifier
                            .height(16.dp)
                            .fillMaxWidth(0.7f)
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    SkeletonLoading(
                        modifier = Modifier
                            .height(16.dp)
                            .fillMaxWidth(0.55f)
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    HorizontalDivider(color = SolennixTheme.colors.divider)
                    Spacer(modifier = Modifier.height(12.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        SkeletonLoading(
                            modifier = Modifier
                                .height(16.dp)
                                .width(110.dp)
                        )
                        SkeletonLoading(
                            modifier = Modifier
                                .height(20.dp)
                                .width(90.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun AnimatedEventListItem(
    index: Int,
    event: Event,
    clientName: String?,
    isUpdatingStatus: Boolean,
    onClick: () -> Unit,
    onLongClick: () -> Unit
) {
    var visible by remember(event.id) { mutableStateOf(false) }

    val context = LocalContext.current
    val durationScale = remember {
        android.provider.Settings.Global.getFloat(
            context.contentResolver,
            android.provider.Settings.Global.ANIMATOR_DURATION_SCALE,
            1f
        )
    }

    LaunchedEffect(event.id) {
        if (durationScale > 0f) {
            delay((index.coerceAtMost(5) * 45L * durationScale).toLong())
        }
        visible = true
    }

    AnimatedVisibility(
        visible = visible,
        enter = fadeIn() + slideInVertically(initialOffsetY = { it / 6 }),
        label = "eventListItemVisibility"
    ) {
        EventListItem(
            event = event,
            clientName = clientName,
            isUpdatingStatus = isUpdatingStatus,
            onClick = onClick,
            onLongClick = onLongClick
        )
    }
}

/**
 * Row layout matched with iOS/Web — info density parity across platforms:
 *   Row 1: Client name (bold) + Status badge / spinner
 *   Row 2: Service type (caption)
 *   Row 3: 📅 Date  ·  🕐 Time range (start-end or "Todo el día")
 *   Row 4 (conditional): 📍 Location
 *   Divider
 *   Row 5: 👥 N personas   (spacer)   $Total (bold primary, zero decimals)
 *
 * `onLongClick` opens the row actions ModalBottomSheet (Edit / Change
 * status / Delete) — Android's native idiom vs. iOS's contextMenu and
 * Web's 3-dot hover button.
 */
@OptIn(ExperimentalSharedTransitionApi::class, ExperimentalFoundationApi::class)
@Composable
private fun EventListItem(
    event: Event,
    clientName: String?,
    isUpdatingStatus: Boolean,
    onClick: () -> Unit,
    onLongClick: () -> Unit
) {
    val context = LocalContext.current
    val allDayLabel = stringResource(R.string.events_list_all_day)
    val clientFallback = stringResource(R.string.events_list_client_fallback)
    val eventDate = remember(event.eventDate) {
        val dateFormatter = DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.getDefault())
        parseFlexibleDate(event.eventDate)?.format(dateFormatter) ?: event.eventDate
    }
    val timeLabel = remember(event.startTime, event.endTime, allDayLabel) {
        val start = event.startTime
        when {
            start.isNullOrEmpty() -> allDayLabel
            !event.endTime.isNullOrEmpty() -> "${start.take(5)} - ${event.endTime!!.take(5)}"
            else -> start.take(5)
        }
    }
    val locationLabel = remember(event.location, event.city) {
        listOfNotNull(event.location?.takeIf { it.isNotEmpty() }, event.city?.takeIf { it.isNotEmpty() }).joinToString(", ")
    }
    val accessibilitySummary = remember(event, clientName, eventDate, locationLabel, timeLabel) {
        eventCardTalkBackLabel(
            context = context,
            event = event,
            clientName = clientName,
            formattedDate = eventDate,
            timeLabel = timeLabel,
            locationLabel = locationLabel
        )
    }
    val haptic = LocalHapticFeedback.current

    val sharedTransitionScope = LocalSharedTransitionScope.current
    val animatedVisibilityScope = LocalNavAnimatedVisibilityScope.current
    val baseModifier = Modifier
        .fillMaxWidth()
        .padding(horizontal = 16.dp, vertical = 4.dp)
        .semantics(mergeDescendants = true) { contentDescription = accessibilitySummary }
    val cardModifier = if (sharedTransitionScope != null && animatedVisibilityScope != null) {
        with(sharedTransitionScope) {
            Modifier.sharedBounds(
                rememberSharedContentState(key = "event_card_${event.id}"),
                animatedVisibilityScope = animatedVisibilityScope
            ).then(baseModifier)
        }
    } else baseModifier

    Card(
        modifier = cardModifier.combinedClickable(
            onClick = onClick,
            onLongClick = {
                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                onLongClick()
            }
        ),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.medium
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            // Row 1: client (bold primary) + status badge or spinner
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = clientName ?: clientFallback,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = SolennixTheme.colors.primaryText,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f).padding(end = 8.dp)
                )
                if (isUpdatingStatus) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(16.dp),
                        strokeWidth = 2.dp,
                        color = SolennixTheme.colors.primary
                    )
                } else {
                    StatusBadge(status = event.status.name.lowercase())
                }
            }

            // Row 2: service type
            Text(
                text = event.serviceType,
                style = MaterialTheme.typography.bodySmall,
                color = SolennixTheme.colors.secondaryText,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Row 3: date + time
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.CalendarToday,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
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
                        modifier = Modifier.size(14.dp),
                        tint = SolennixTheme.colors.secondaryText
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = timeLabel,
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.secondaryText
                    )
                }
            }

            // Row 4 (optional): location
            event.location?.takeIf { it.isNotEmpty() }?.let { location ->
                Spacer(modifier = Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.LocationOn,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
                        tint = SolennixTheme.colors.secondaryText
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = locationLabel,
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.secondaryText,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))
            HorizontalDivider(color = SolennixTheme.colors.divider)
            Spacer(modifier = Modifier.height(8.dp))

            // Row 5: people count + total amount (zero decimals, MXN)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.People,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
                        tint = SolennixTheme.colors.secondaryText
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = stringResource(R.string.events_list_people_count, event.numPeople),
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.secondaryText
                    )
                }
                Text(
                    text = event.totalAmount.asMXN(),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = SolennixTheme.colors.primary
                )
            }
        }
    }
}

private fun localizedEventStatus(context: Context, status: EventStatus): String = when (status) {
    EventStatus.QUOTED -> context.getString(R.string.events_list_status_quoted)
    EventStatus.CONFIRMED -> context.getString(R.string.events_list_status_confirmed)
    EventStatus.COMPLETED -> context.getString(R.string.events_list_status_completed)
    EventStatus.CANCELLED -> context.getString(R.string.events_list_status_cancelled)
}

internal fun eventCardTalkBackLabel(
    context: Context,
    event: Event,
    clientName: String?,
    formattedDate: String,
    timeLabel: String,
    locationLabel: String
): String {
    val resolvedClient = clientName?.takeIf { it.isNotBlank() }
        ?: context.getString(R.string.events_list_client_fallback)
    val localizedStatus = localizedEventStatus(context, event.status)
    val total = event.totalAmount.asMXN()

    return if (locationLabel.isNotBlank()) {
        context.getString(
            R.string.events_list_a11y_summary,
            event.serviceType,
            localizedStatus,
            formattedDate,
            timeLabel,
            resolvedClient,
            locationLabel,
            event.numPeople,
            total
        )
    } else {
        context.getString(
            R.string.events_list_a11y_summary_no_location,
            event.serviceType,
            localizedStatus,
            formattedDate,
            timeLabel,
            resolvedClient,
            event.numPeople,
            total
        )
    }
}
