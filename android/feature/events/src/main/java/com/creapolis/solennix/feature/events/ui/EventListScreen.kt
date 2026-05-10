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
                    deleteConfirmEvent = null
                    if (removed != null) {
                        val (deletedEvent, index) = removed
                        // Show undo snackbar
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
}

