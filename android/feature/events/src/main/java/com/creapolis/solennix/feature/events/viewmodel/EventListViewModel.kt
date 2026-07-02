package com.creapolis.solennix.feature.events.viewmodel

import android.content.Context
import android.util.Log
import androidx.annotation.StringRes
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.SnackbarResult
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.model.ApiError
import com.creapolis.solennix.core.data.repository.ClientRepository
import com.creapolis.solennix.core.data.repository.EventRepository
import com.creapolis.solennix.core.model.Client
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.EventStatus
import com.creapolis.solennix.core.model.UnavailableDate
import com.creapolis.solennix.core.model.extensions.asMXN
import com.creapolis.solennix.core.model.extensions.parseFlexibleDate
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.Endpoints
import com.creapolis.solennix.core.network.toApiError
import com.creapolis.solennix.core.network.get
import com.creapolis.solennix.core.network.post
import com.creapolis.solennix.feature.events.R
import com.creapolis.solennix.core.designsystem.R as DesignSystemR
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject
import java.time.LocalDate

private const val TAG = "EventListVM"

/**
 * Ordering axis for the events list — mirrors iOS's `EventSortField` so the
 * three platforms expose the same 4 sort options (Fecha / Servicio /
 * Cliente / Total).
 */
enum class EventSortField { EVENT_DATE, SERVICE_TYPE, CLIENT_NAME, TOTAL_AMOUNT }

data class EventListUiState(
    val events: List<Event> = emptyList(),
    /** Filtered + sorted list ready for the LazyColumn. */
    val sortedEvents: List<Event> = emptyList(),
    val clientMap: Map<String, Client> = emptyMap(),
    val searchQuery: String = "",
    val selectedStatus: EventStatus? = null,
    val startDate: LocalDate? = null,
    val endDate: LocalDate? = null,
    val sortField: EventSortField = EventSortField.EVENT_DATE,
    /**
     * DESC default for date + amount (newest / largest first — how
     * organizers scan their book). ASC default for strings (A→Z).
     */
    val sortAscending: Boolean = false,
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val error: String? = null,
    val statusFilters: List<EventStatusFilter> = emptyList(),
    /** Event whose status mutation is in flight — shows a spinner on that row. */
    val updatingStatusEventId: String? = null,
    /** Unavailable dates for calendar view (blocked dates). */
    val unavailableDates: List<com.creapolis.solennix.core.model.UnavailableDate> = emptyList()
)

data class EventStatusFilter(
    val status: EventStatus?,
    val label: String,
    val count: Int = 0
)

@OptIn(FlowPreview::class, ExperimentalCoroutinesApi::class)
@HiltViewModel
class EventListViewModel @Inject constructor(
    @ApplicationContext private val appContext: Context,
    private val eventRepository: EventRepository,
    private val clientRepository: ClientRepository,
    private val apiService: ApiService
) : ViewModel() {

    private fun tr(@StringRes id: Int, vararg args: Any): String = appContext.getString(id, *args)

    private val _searchQuery = MutableStateFlow("")
    private val _selectedStatus = MutableStateFlow<EventStatus?>(null)
    private val _startDate = MutableStateFlow<LocalDate?>(null)
    private val _endDate = MutableStateFlow<LocalDate?>(null)
    private val _sortField = MutableStateFlow(EventSortField.EVENT_DATE)
    private val _sortAscending = MutableStateFlow(false)
    private val _isRefreshing = MutableStateFlow(false)
    private val _error = MutableStateFlow<String?>(null)
    private val _updatingStatusEventId = MutableStateFlow<String?>(null)
    /** Local events list for soft-delete modifications. */
    private val _localEvents = MutableStateFlow<List<Event>>(emptyList())
    /** Cached unavailable date ranges for the current month context. */
    private val _unavailableDates = MutableStateFlow<List<UnavailableDate>>(emptyList())
    private var refreshJob: Job? = null

    private data class FilterState(
        val query: String,
        val status: EventStatus?,
        val startDate: LocalDate?,
        val endDate: LocalDate?,
        val refreshing: Boolean,
        val error: String?
    )

    private val filterState: Flow<FilterState> = combine(
        _searchQuery, _selectedStatus, _startDate, _endDate,
        combine(_isRefreshing, _error) { r, e -> Pair(r, e) }
    ) { query, status, startDate, endDate, (refreshing, error) ->
        FilterState(
            query = query,
            status = status,
            startDate = startDate,
            endDate = endDate,
            refreshing = refreshing,
            error = error
        )
    }

    private data class SortStatusAndUnavailable(
        val sortField: EventSortField,
        val sortAscending: Boolean,
        val updatingStatusEventId: String?,
        val unavailableDates: List<UnavailableDate>
    )

    /// Bundle sort axis state, updatingStatusEventId, and unavailableDates into a
    /// single upstream so the main `combine` stays under the 5-arg ceiling.
    private val sortStatusAndUnavailableFlow = combine(
        _sortField, _sortAscending, _updatingStatusEventId, _unavailableDates
    ) { field, ascending, updatingId, unavailable ->
        SortStatusAndUnavailable(field, ascending, updatingId, unavailable)
    }

    val uiState: StateFlow<EventListUiState> = combine(
        _localEvents,
        eventRepository.getEvents(),
        clientRepository.getClients(),
        filterState,
        sortStatusAndUnavailableFlow
    ) { localEvents, repoEvents, clients, filters, sortInfo ->
        // Merge local modifications with repo events - local overrides take precedence
        // but new repo updates are still visible (except for soft-deleted IDs)
        val softDeletedIds = localEvents.map { it.id }.toSet()
        val mergedRepo = repoEvents.filter { it.id !in softDeletedIds }
        val events = localEvents + mergedRepo
        val clientMap = clients.associateBy { it.id }
        val statusFilters = buildStatusFilters(events)
        val sorted = applyFiltersAndSort(
            events = events,
            clientMap = clientMap,
            query = filters.query,
            status = filters.status,
            startDate = filters.startDate,
            endDate = filters.endDate,
            sortField = sortInfo.sortField,
            sortAscending = sortInfo.sortAscending
        )

        EventListUiState(
            events = events,
            sortedEvents = sorted,
            clientMap = clientMap,
            searchQuery = filters.query,
            selectedStatus = filters.status,
            startDate = filters.startDate,
            endDate = filters.endDate,
            sortField = sortInfo.sortField,
            sortAscending = sortInfo.sortAscending,
            isLoading = false,
            isRefreshing = filters.refreshing,
            error = filters.error,
            statusFilters = statusFilters,
            updatingStatusEventId = sortInfo.updatingStatusEventId,
            unavailableDates = sortInfo.unavailableDates
        )
    }.distinctUntilChanged().stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = EventListUiState(isLoading = true)
    )

    /// Filter + sort the full events list in memory. Matches iOS's
    /// `filteredEvents` + `comparator` pair. Local-sort is fine at the
    /// scale of a single organizer's book (20-200 events); beyond that we'd
    /// push sort into the Room DAO or hit `/api/events/search`.
    private fun applyFiltersAndSort(
        events: List<Event>,
        clientMap: Map<String, Client>,
        query: String,
        status: EventStatus?,
        startDate: LocalDate?,
        endDate: LocalDate?,
        sortField: EventSortField,
        sortAscending: Boolean
    ): List<Event> {
        val filtered = events.filter { event ->
            val matchesStatus = status == null || event.status == status
            val matchesStart = startDate == null ||
                (parseFlexibleDate(event.eventDate)?.let { it >= startDate } ?: true)
            val matchesEnd = endDate == null ||
                (parseFlexibleDate(event.eventDate)?.let { it <= endDate } ?: true)
            val q = query.trim()
            val matchesQuery = q.isEmpty() ||
                event.serviceType.contains(q, ignoreCase = true) ||
                (event.location?.contains(q, ignoreCase = true) == true) ||
                (event.city?.contains(q, ignoreCase = true) == true) ||
                (clientMap[event.clientId]?.name?.contains(q, ignoreCase = true) == true)
            matchesStatus && matchesStart && matchesEnd && matchesQuery
        }

        val comparator: Comparator<Event> = when (sortField) {
            EventSortField.EVENT_DATE -> compareBy { it.eventDate }
            EventSortField.SERVICE_TYPE -> compareBy(String.CASE_INSENSITIVE_ORDER) { it.serviceType }
            EventSortField.CLIENT_NAME -> compareBy(String.CASE_INSENSITIVE_ORDER) {
                clientMap[it.clientId]?.name ?: ""
            }
            EventSortField.TOTAL_AMOUNT -> compareBy { it.totalAmount }
        }
        return if (sortAscending) filtered.sortedWith(comparator)
        else filtered.sortedWith(comparator.reversed())
    }

    private fun buildStatusFilters(events: List<Event>): List<EventStatusFilter> {
        val counts = events.groupingBy { it.status }.eachCount()
        return listOf(
            EventStatusFilter(null, tr(R.string.events_list_status_all), events.size),
            EventStatusFilter(EventStatus.QUOTED, tr(R.string.events_list_status_quoted), counts[EventStatus.QUOTED] ?: 0),
            EventStatusFilter(EventStatus.CONFIRMED, tr(R.string.events_list_status_confirmed), counts[EventStatus.CONFIRMED] ?: 0),
            EventStatusFilter(EventStatus.COMPLETED, tr(R.string.events_list_status_completed), counts[EventStatus.COMPLETED] ?: 0),
            EventStatusFilter(EventStatus.CANCELLED, tr(R.string.events_list_status_cancelled), counts[EventStatus.CANCELLED] ?: 0)
        )
    }

    init {
        refresh()
    }

    fun onSearchQueryChange(query: String) {
        _searchQuery.value = query
    }

    fun onStatusFilterChange(status: EventStatus?) {
        _selectedStatus.value = status
    }

    fun onDateRangeChange(start: LocalDate?, end: LocalDate?) {
        _startDate.value = start
        _endDate.value = end
    }

    fun clearFilters() {
        _searchQuery.value = ""
        _selectedStatus.value = null
        _startDate.value = null
        _endDate.value = null
    }

    /**
     * Apply a sort axis. Re-selecting the active field flips the direction
     * (matches Web's sortable column behavior); a fresh field resets to
     * that field's natural default (DESC for date/amount, ASC for strings).
     */
    fun applySort(field: EventSortField) {
        if (_sortField.value == field) {
            _sortAscending.value = !_sortAscending.value
        } else {
            _sortField.value = field
            _sortAscending.value = (field == EventSortField.SERVICE_TYPE ||
                field == EventSortField.CLIENT_NAME)
        }
    }

    /**
     * Change an event's status via `PUT /events/{id}`. Matches iOS's
     * `updateEventStatus` and Web's inline dropdown. `updatingStatusEventId`
     * drives a spinner on the affected row while the call is in flight.
     */
    fun updateEventStatus(event: Event, newStatus: EventStatus) {
        if (event.status == newStatus) return
        viewModelScope.launch {
            _updatingStatusEventId.value = event.id
            try {
                eventRepository.updateEvent(event.copy(status = newStatus))
            } catch (e: Exception) {
                Log.w(TAG, "updateEventStatus failed for ${event.id}", e)
                val message = e.message ?: ""
                // Check if this is a balance pending error from backend
                // Format: "Cannot complete: $XXX.XX remaining"
                val balanceMatch = Regex("Cannot complete: \\$([\\d,]+\\.?\\d*) remaining").find(message)
                if (balanceMatch != null) {
                    val amount = balanceMatch.groupValues[1]
                    _error.value = tr(DesignSystemR.string.events_error_balance_pending, amount)
                } else {
                    _error.value = message.ifEmpty { tr(R.string.events_list_error_change_status) }
                }
            } finally {
                _updatingStatusEventId.value = null
            }
        }
    }

    /**
     * Soft-delete an event — removes from the local UI list immediately.
     * Returns the removed event and its index so the UI can show an undo snackbar.
     * The caller should call `confirmDelete` after the undo window expires.
     */
    fun softDeleteEvent(event: Event): Pair<Event, Int>? {
        val events = _localEvents.value.ifEmpty { uiState.value.events }
        val index = events.indexOfFirst { it.id == event.id }
        if (index < 0) return null
        // Remove from local list
        val updated = events.toMutableList().apply { removeAt(index) }
        _localEvents.value = updated
        return Pair(event, index)
    }

    /**
     * Restore a previously soft-deleted event at the same index.
     */
    fun restoreEvent(event: Event, atIndex: Int) {
        val events = _localEvents.value.ifEmpty { uiState.value.events }
        val safeIndex = minOf(atIndex, events.size)
        val updated = events.toMutableList().apply { add(safeIndex, event) }
        _localEvents.value = updated
    }

    /**
     * Hard delete an event via the repository. Call this after the undo
     * window expires OR if the caller knows there's no undo needed.
     */
    fun confirmDeleteEvent(event: Event, onRestore: () -> Unit) {
        viewModelScope.launch {
            try {
                eventRepository.deleteEvent(event.id)
                // Clear local copy after successful hard delete
                _localEvents.value = _localEvents.value.filter { it.id != event.id }
            } catch (e: Exception) {
                Log.w(TAG, "deleteEvent failed for ${event.id}", e)
                // Restore the event in local list since hard delete failed
                onRestore()
                _error.value = e.message ?: tr(R.string.events_list_error_delete)
            }
        }
    }

    /**
     * Show an undo snackbar with 30-second expiry.
     * Timer starts concurrently when snackbar is shown, not after it returns.
     */
    fun showUndoSnackbar(
        snackbarHostState: SnackbarHostState,
        onUndo: () -> Unit,
        onExpire: () -> Unit
    ) {
        viewModelScope.launch {
            // Start 30s timer concurrently with snackbar display
            val expiryJob = launch {
                delay(30_000)
                onExpire()
            }

            val result = snackbarHostState.showSnackbar(
                message = tr(R.string.events_list_delete_undone),
                actionLabel = tr(R.string.events_list_delete_undo),
                duration = SnackbarDuration.Short
            )

            // If user tapped undo, cancel the expiry timer
            if (result == SnackbarResult.ActionPerformed) {
                expiryJob.cancel()
                onUndo()
            }
        }
    }

    fun generateCsvContent(): String {
        val state = uiState.value
        val sb = StringBuilder()
        // "Pagado" column removed: payment totals were never populated (the
        // column was always empty) and EventListViewModel does not have a
        // PaymentRepository to compute them. Export only what we can honestly
        // fill; adding Pagado back requires pulling payment aggregates.
        sb.appendLine(
            listOf(
                tr(R.string.events_list_csv_header_name),
                tr(R.string.events_list_csv_header_date),
                tr(R.string.events_list_csv_header_client),
                tr(R.string.events_list_csv_header_status),
                tr(R.string.events_list_csv_header_total),
                tr(R.string.events_list_csv_header_location)
            ).joinToString(",")
        )
        val statusLabels = mapOf(
            EventStatus.QUOTED to tr(R.string.events_list_status_quoted),
            EventStatus.CONFIRMED to tr(R.string.events_list_status_confirmed),
            EventStatus.COMPLETED to tr(R.string.events_list_status_completed),
            EventStatus.CANCELLED to tr(R.string.events_list_status_cancelled)
        )
        // Apply the same filters the user sees in the list before exporting.
        // Previously CSV always wrote the full events cache, silently ignoring
        // active status/date/search filters and producing surprising exports.
        val filtered = state.events.filter { event ->
            val matchesStatus = state.selectedStatus == null || event.status == state.selectedStatus
            val matchesStart = state.startDate == null || event.eventDate >= state.startDate.toString()
            val matchesEnd = state.endDate == null || event.eventDate <= state.endDate.toString()
            val q = state.searchQuery.trim()
            val matchesQuery = q.isEmpty()
                || event.serviceType.contains(q, ignoreCase = true)
                || (event.location?.contains(q, ignoreCase = true) == true)
                || (event.city?.contains(q, ignoreCase = true) == true)
                || (state.clientMap[event.clientId]?.name?.contains(q, ignoreCase = true) == true)
            matchesStatus && matchesStart && matchesEnd && matchesQuery
        }
        filtered.forEach { event ->
            val name = event.serviceType.escapeCsv()
            val date = event.eventDate.escapeCsv()
            val clientName = (state.clientMap[event.clientId]?.name ?: "").escapeCsv()
            val status = (statusLabels[event.status] ?: event.status.name).escapeCsv()
            val total = event.totalAmount.asMXN().escapeCsv()
            val location = (event.location ?: "").escapeCsv()
            sb.appendLine("$name,$date,$clientName,$status,$total,$location")
        }
        return sb.toString()
    }

    fun refresh() {
        refreshJob?.cancel()

        refreshJob = viewModelScope.launch {
            _isRefreshing.value = true
            _error.value = null
            try {
                eventRepository.syncEvents()
                clientRepository.syncClients()
                loadUnavailableDatesForCurrentMonth()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _error.value = e.toEventsSyncMessage()
            } finally {
                _isRefreshing.value = false
                refreshJob = null
            }
        }
    }

    fun clearError() {
        _error.value = null
    }

    /**
     * Check if a date is blocked by an unavailable date entry.
     */
    fun isDateBlocked(date: LocalDate): Boolean {
        val dateStr = date.toString()
        return _unavailableDates.value.any { ud ->
            dateStr >= ud.startDate && dateStr <= ud.endDate
        }
    }

    /**
     * Get the unavailable date entry for a specific date, if any.
     */
    fun getUnavailableDateFor(date: LocalDate): UnavailableDate? {
        val dateStr = date.toString()
        return _unavailableDates.value.firstOrNull { ud ->
            dateStr >= ud.startDate && dateStr <= ud.endDate
        }
    }

    /**
     * Toggle a date block - removes existing block or creates a new single-day block.
     * Matches CalendarViewModel's toggleDateBlock behavior.
     */
    fun toggleDateBlock(date: LocalDate, reason: String? = null) {
        viewModelScope.launch {
            try {
                val dateStr = date.toString()
                val existing = _unavailableDates.value.find { ud ->
                    dateStr >= ud.startDate && dateStr <= ud.endDate
                }
                if (existing != null) {
                    apiService.delete(Endpoints.unavailableDate(existing.id))
                } else {
                    val payload = buildMap<String, String> {
                        put("start_date", dateStr)
                        put("end_date", dateStr)
                        if (!reason.isNullOrBlank()) {
                            put("reason", reason)
                        }
                    }
                    apiService.post<UnavailableDate>(Endpoints.UNAVAILABLE_DATES, payload)
                }
                // Reload unavailable dates after toggle
                loadUnavailableDatesForCurrentMonth()
            } catch (e: Exception) {
                Log.w(TAG, "toggleDateBlock failed for $date", e)
                val dateStr = date.toString()
                val wasExisting = _unavailableDates.value.any { ud ->
                    dateStr >= ud.startDate && dateStr <= ud.endDate
                }
                _error.value = if (wasExisting) {
                    appContext.getString(R.string.events_list_error_unblock_date)
                } else {
                    appContext.getString(R.string.events_list_error_block_date)
                }
            }
        }
    }

    /**
     * Delete an unavailable date entry by ID.
     */
    fun deleteUnavailableDate(id: String) {
        viewModelScope.launch {
            try {
                apiService.delete(Endpoints.unavailableDate(id))
                loadUnavailableDatesForCurrentMonth()
            } catch (e: Exception) {
                Log.w(TAG, "deleteUnavailableDate $id failed", e)
                _error.value = appContext.getString(R.string.events_list_error_unblock_date)
            }
        }
    }

    /**
     * Block a range of dates with an optional reason.
     */
    fun blockDateRange(startDate: LocalDate, endDate: LocalDate, reason: String?) {
        viewModelScope.launch {
            try {
                val payload = buildMap<String, String> {
                    put("start_date", startDate.toString())
                    put("end_date", endDate.toString())
                    if (!reason.isNullOrBlank()) {
                        put("reason", reason)
                    }
                }
                apiService.post<UnavailableDate>(Endpoints.UNAVAILABLE_DATES, payload)
                loadUnavailableDatesForCurrentMonth()
            } catch (e: Exception) {
                Log.w(TAG, "blockDateRange $startDate..$endDate failed", e)
                _error.value = appContext.getString(R.string.events_list_error_block_date)
            }
        }
    }

    /**
     * Load unavailable dates for the current month context.
     * Uses a reasonable range around today to cover typical viewing patterns.
     */
    private fun loadUnavailableDatesForCurrentMonth() {
        viewModelScope.launch {
            try {
                val now = LocalDate.now()
                val start = now.minusMonths(1).toString()
                val end = now.plusMonths(3).toString()
                val dates: List<UnavailableDate> = apiService.get(
                    Endpoints.UNAVAILABLE_DATES,
                    mapOf("start" to start, "end" to end)
                )
                _unavailableDates.value = dates
            } catch (e: Exception) {
                Log.w(TAG, "unavailable-dates load failed", e)
                _error.value = appContext.getString(R.string.events_list_error_sync)
            }
        }
    }

    private fun Throwable.toEventsSyncMessage(): String {
        val mapped = if (this is ApiError) this else toApiError()
        return when (mapped) {
            is ApiError.NetworkError -> tr(R.string.events_list_error_network)
            is ApiError.ServerError -> tr(R.string.events_list_error_server)
            ApiError.Unauthorized -> tr(R.string.events_list_error_session_expired)
            else -> message ?: tr(R.string.events_list_error_sync)
        }
    }
}

private fun String.escapeCsv(): String {
    return if (contains(",") || contains("\"") || contains("\n")) {
        "\"${replace("\"", "\"\"")}\""
    } else {
        this
    }
}
