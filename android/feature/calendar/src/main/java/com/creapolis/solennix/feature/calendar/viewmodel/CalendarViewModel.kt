package com.creapolis.solennix.feature.calendar.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.data.repository.EventRepository
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.EventStatus
import com.creapolis.solennix.core.model.UnavailableDate
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.Endpoints
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.YearMonth
import javax.inject.Inject

enum class CalendarViewMode {
    CALENDAR, LIST
}

data class StatusFilter(
    val status: EventStatus?,  // null means "All"
    val label: String,
    val count: Int = 0
)

data class CalendarUiState(
    val selectedDate: LocalDate = LocalDate.now(),
    val currentMonth: YearMonth = YearMonth.now(),
    val events: List<Event> = emptyList(),
    val eventsForSelectedDate: List<Event> = emptyList(),
    val filteredEvents: List<Event> = emptyList(),
    val unavailableDates: List<UnavailableDate> = emptyList(),
    val viewMode: CalendarViewMode = CalendarViewMode.CALENDAR,
    val selectedStatus: EventStatus? = null,
    val searchQuery: String = "",
    val statusFilters: List<StatusFilter> = emptyList(),
    val isLoading: Boolean = false
)

@HiltViewModel
class CalendarViewModel @Inject constructor(
    private val eventRepository: EventRepository,
    private val apiService: ApiService
) : ViewModel() {

    private val _selectedDate = MutableStateFlow(LocalDate.now())
    private val _currentMonth = MutableStateFlow(YearMonth.now())
    private val _viewMode = MutableStateFlow(CalendarViewMode.CALENDAR)
    private val _selectedStatus = MutableStateFlow<EventStatus?>(null)
    private val _searchQuery = MutableStateFlow("")
    private val _unavailableDates = MutableStateFlow<List<UnavailableDate>>(emptyList())

    val uiState: StateFlow<CalendarUiState> = combine(
        eventRepository.getEvents(),
        _selectedDate,
        _currentMonth,
        _viewMode,
        combine(_selectedStatus, _searchQuery, _unavailableDates) { s, q, u -> Triple(s, q, u) }
    ) { values ->
        val events = values[0] as List<Event>
        val selected = values[1] as LocalDate
        val month = values[2] as YearMonth
        val viewMode = values[3] as CalendarViewMode
        @Suppress("UNCHECKED_CAST")
        val extras = values[4] as Triple<EventStatus?, String, List<UnavailableDate>>
        val selectedStatus = extras.first
        val searchQuery = extras.second
        val unavailableDates = extras.third

        // Build status filters with counts
        val statusFilters = buildStatusFilters(events)

        // Filter events by status
        val statusFilteredEvents = if (selectedStatus != null) {
            events.filter { it.status == selectedStatus }
        } else {
            events
        }

        // Filter by search query in list mode
        val filteredEvents = if (searchQuery.isBlank()) {
            statusFilteredEvents
        } else {
            statusFilteredEvents.filter { event ->
                event.serviceType.contains(searchQuery, ignoreCase = true) ||
                event.location?.contains(searchQuery, ignoreCase = true) == true ||
                event.city?.contains(searchQuery, ignoreCase = true) == true
            }
        }

        // Events for selected date (also apply status filter)
        val eventsForSelectedDate = statusFilteredEvents.filter {
            try {
                val date = java.time.ZonedDateTime.parse(it.eventDate).toLocalDate()
                date == selected
            } catch (e: Exception) { false }
        }

        CalendarUiState(
            selectedDate = selected,
            currentMonth = month,
            events = events,
            eventsForSelectedDate = eventsForSelectedDate,
            filteredEvents = filteredEvents.sortedByDescending { it.eventDate },
            unavailableDates = unavailableDates,
            viewMode = viewMode,
            selectedStatus = selectedStatus,
            searchQuery = searchQuery,
            statusFilters = statusFilters,
            isLoading = false
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = CalendarUiState(isLoading = true)
    )

    private fun buildStatusFilters(events: List<Event>): List<StatusFilter> {
        val counts = events.groupingBy { it.status }.eachCount()
        return listOf(
            StatusFilter(null, "Todos", events.size),
            StatusFilter(EventStatus.QUOTED, "Cotizado", counts[EventStatus.QUOTED] ?: 0),
            StatusFilter(EventStatus.CONFIRMED, "Confirmado", counts[EventStatus.CONFIRMED] ?: 0),
            StatusFilter(EventStatus.COMPLETED, "Completado", counts[EventStatus.COMPLETED] ?: 0),
            StatusFilter(EventStatus.CANCELLED, "Cancelado", counts[EventStatus.CANCELLED] ?: 0)
        )
    }

    init {
        refresh()
        loadUnavailableDates(_currentMonth.value)
    }

    fun onDateSelected(date: LocalDate) {
        _selectedDate.value = date
    }

    fun onMonthChange(month: YearMonth) {
        _currentMonth.value = month
        loadUnavailableDates(month)
    }

    fun onViewModeChange(mode: CalendarViewMode) {
        _viewMode.value = mode
    }

    fun onStatusFilterChange(status: EventStatus?) {
        _selectedStatus.value = status
    }

    fun onSearchQueryChange(query: String) {
        _searchQuery.value = query
    }

    fun refresh() {
        viewModelScope.launch {
            try {
                eventRepository.syncEvents()
            } catch (e: Exception) {
                // Handle error
            }
        }
    }

    private fun loadUnavailableDates(yearMonth: YearMonth) {
        viewModelScope.launch {
            try {
                val start = yearMonth.atDay(1).toString()
                val end = yearMonth.atEndOfMonth().toString()
                val dates: List<UnavailableDate> = apiService.get(
                    Endpoints.UNAVAILABLE_DATES,
                    mapOf("start" to start, "end" to end)
                )
                _unavailableDates.value = dates
            } catch (e: Exception) {
                // Keep existing dates on error
            }
        }
    }

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
                loadUnavailableDates(_currentMonth.value)
            } catch (e: Exception) {
                // Handle error
            }
        }
    }

    fun isDateBlocked(date: LocalDate): Boolean {
        val dateStr = date.toString()
        return _unavailableDates.value.any { ud ->
            dateStr >= ud.startDate && dateStr <= ud.endDate
        }
    }

    fun getUnavailableDateFor(date: LocalDate): UnavailableDate? {
        val dateStr = date.toString()
        return _unavailableDates.value.find { ud ->
            dateStr >= ud.startDate && dateStr <= ud.endDate
        }
    }
}
