package com.creapolis.solennix.feature.events.viewmodel

import android.content.Context
import android.util.Log
import androidx.annotation.StringRes
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.data.repository.ClientRepository
import com.creapolis.solennix.core.data.repository.EventRepository
import com.creapolis.solennix.core.model.Client
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.EventStatus
import com.creapolis.solennix.core.model.extensions.asMXN
import com.creapolis.solennix.core.model.extensions.parseFlexibleDate
import com.creapolis.solennix.feature.events.R
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.ExperimentalCoroutinesApi
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
    val updatingStatusEventId: String? = null
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
    private val clientRepository: ClientRepository
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

    private data class FilterState(
        val query: String,
        val status: EventStatus?,
        val startDate: LocalDate?,
        val endDate: LocalDate?,
        val refreshing: Boolean,
        val error: String?
    )

    private val filterState: Flow<FilterState> = combine(
        _searchQuery, _selectedStatus, _startDate, _endDate, _isRefreshing, _error
    ) { params ->
        FilterState(
            query = params[0] as String,
            status = params[1] as EventStatus?,
            startDate = params[2] as LocalDate?,
            endDate = params[3] as LocalDate?,
            refreshing = params[4] as Boolean,
            error = params[5] as String?
        )
    }

    /// Bundle sort axis state with the ongoing updatingStatusEventId into a
    /// single upstream so the main `combine` stays under the 5-arg ceiling.
    private val sortAndStatusFlow = combine(
        _sortField, _sortAscending, _updatingStatusEventId
    ) { field, ascending, updatingId ->
        Triple(field, ascending, updatingId)
    }

    val uiState: StateFlow<EventListUiState> = combine(
        eventRepository.getEvents(),
        clientRepository.getClients(),
        filterState,
        sortAndStatusFlow
    ) { events, clients, filters, sortTriple ->
        val (sortField, sortAscending, updatingId) = sortTriple
        val clientMap = clients.associateBy { it.id }
        val statusFilters = buildStatusFilters(events)
        val sorted = applyFiltersAndSort(
            events = events,
            clientMap = clientMap,
            query = filters.query,
            status = filters.status,
            startDate = filters.startDate,
            endDate = filters.endDate,
            sortField = sortField,
            sortAscending = sortAscending
        )

        EventListUiState(
            events = events,
            sortedEvents = sorted,
            clientMap = clientMap,
            searchQuery = filters.query,
            selectedStatus = filters.status,
            startDate = filters.startDate,
            endDate = filters.endDate,
            sortField = sortField,
            sortAscending = sortAscending,
            isLoading = false,
            isRefreshing = filters.refreshing,
            error = filters.error,
            statusFilters = statusFilters,
            updatingStatusEventId = updatingId
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
                _error.value = e.message ?: tr(R.string.events_list_error_change_status)
            } finally {
                _updatingStatusEventId.value = null
            }
        }
    }

    /**
     * Hard delete an event via the repository. The UI triggers this from a
     * confirm dialog. No soft-delete/undo on Android today (iOS has it via
     * ToastManager — candidate for a future slice).
     */
    fun deleteEvent(event: Event) {
        viewModelScope.launch {
            try {
                eventRepository.deleteEvent(event.id)
            } catch (e: Exception) {
                Log.w(TAG, "deleteEvent failed for ${event.id}", e)
                _error.value = e.message ?: tr(R.string.events_list_error_delete)
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
        viewModelScope.launch {
            _isRefreshing.value = true
            _error.value = null
            try {
                eventRepository.syncEvents()
                clientRepository.syncClients()
            } catch (e: Exception) {
                _error.value = e.message ?: tr(R.string.events_list_error_sync)
            } finally {
                _isRefreshing.value = false
            }
        }
    }

    fun clearError() {
        _error.value = null
    }
}

private fun String.escapeCsv(): String {
    return if (contains(",") || contains("\"") || contains("\n")) {
        "\"${replace("\"", "\"\"")}\""
    } else {
        this
    }
}
