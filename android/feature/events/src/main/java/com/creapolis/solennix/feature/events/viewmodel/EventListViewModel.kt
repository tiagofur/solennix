package com.creapolis.solennix.feature.events.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.data.repository.ClientRepository
import com.creapolis.solennix.core.data.repository.EventRepository
import com.creapolis.solennix.core.model.Client
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.EventStatus
import com.creapolis.solennix.core.model.extensions.asMXN
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.FlowPreview
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject
import androidx.paging.PagingData
import androidx.paging.cachedIn
import java.time.LocalDate

data class EventListUiState(
    val events: List<Event> = emptyList(),
    val clientMap: Map<String, Client> = emptyMap(),
    val searchQuery: String = "",
    val selectedStatus: EventStatus? = null,
    val startDate: LocalDate? = null,
    val endDate: LocalDate? = null,
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val error: String? = null,
    val statusFilters: List<EventStatusFilter> = emptyList()
)

data class EventStatusFilter(
    val status: EventStatus?,
    val label: String,
    val count: Int = 0
)

@OptIn(FlowPreview::class, ExperimentalCoroutinesApi::class)
@HiltViewModel
class EventListViewModel @Inject constructor(
    private val eventRepository: EventRepository,
    private val clientRepository: ClientRepository
) : ViewModel() {

    private val _searchQuery = MutableStateFlow("")
    private val _selectedStatus = MutableStateFlow<EventStatus?>(null)
    private val _startDate = MutableStateFlow<LocalDate?>(null)
    private val _endDate = MutableStateFlow<LocalDate?>(null)
    private val _isRefreshing = MutableStateFlow(false)
    private val _error = MutableStateFlow<String?>(null)

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

    val pagedEvents: Flow<PagingData<Event>> = filterState
        .debounce(300)
        .flatMapLatest { filters ->
            eventRepository.getEventsPaging(
                query = filters.query,
                status = filters.status?.name,
                startDate = filters.startDate?.toString(),
                endDate = filters.endDate?.toString()
            )
        }.cachedIn(viewModelScope)

    val uiState: StateFlow<EventListUiState> = combine(
        eventRepository.getEvents(),
        clientRepository.getClients(),
        filterState
    ) { events, clients, filters ->
        val clientMap = clients.associateBy { it.id }
        val statusFilters = buildStatusFilters(events)

        EventListUiState(
            events = events,
            clientMap = clientMap,
            searchQuery = filters.query,
            selectedStatus = filters.status,
            startDate = filters.startDate,
            endDate = filters.endDate,
            isLoading = false,
            isRefreshing = filters.refreshing,
            error = filters.error,
            statusFilters = statusFilters
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = EventListUiState(isLoading = true)
    )

    private fun buildStatusFilters(events: List<Event>): List<EventStatusFilter> {
        val counts = events.groupingBy { it.status }.eachCount()
        return listOf(
            EventStatusFilter(null, "Todos", events.size),
            EventStatusFilter(EventStatus.QUOTED, "Cotizado", counts[EventStatus.QUOTED] ?: 0),
            EventStatusFilter(EventStatus.CONFIRMED, "Confirmado", counts[EventStatus.CONFIRMED] ?: 0),
            EventStatusFilter(EventStatus.COMPLETED, "Completado", counts[EventStatus.COMPLETED] ?: 0),
            EventStatusFilter(EventStatus.CANCELLED, "Cancelado", counts[EventStatus.CANCELLED] ?: 0)
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

    fun generateCsvContent(): String {
        val state = uiState.value
        val sb = StringBuilder()
        sb.appendLine("Nombre,Fecha,Cliente,Estado,Total,Pagado,Lugar")
        val statusLabels = mapOf(
            EventStatus.QUOTED to "Cotizado",
            EventStatus.CONFIRMED to "Confirmado",
            EventStatus.COMPLETED to "Completado",
            EventStatus.CANCELLED to "Cancelado"
        )
        state.events.forEach { event ->
            val name = event.serviceType.escapeCsv()
            val date = event.eventDate.escapeCsv()
            val clientName = (state.clientMap[event.clientId]?.name ?: "").escapeCsv()
            val status = (statusLabels[event.status] ?: event.status.name).escapeCsv()
            val total = event.totalAmount.asMXN().escapeCsv()
            val paid = ""
            val location = (event.location ?: "").escapeCsv()
            sb.appendLine("$name,$date,$clientName,$status,$total,$paid,$location")
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
                _error.value = e.message ?: "Ocurrió un error al sincronizar"
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
