package com.creapolis.solennix.feature.calendar.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.data.repository.EventRepository
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.UnavailableDate
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.get
import com.creapolis.solennix.core.network.post
import com.creapolis.solennix.core.network.put
import com.creapolis.solennix.core.network.Endpoints
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import com.creapolis.solennix.core.model.extensions.parseFlexibleDate
import java.time.LocalDate
import java.time.YearMonth
import javax.inject.Inject

data class CalendarUiState(
    val selectedDate: LocalDate = LocalDate.now(),
    val currentMonth: YearMonth = YearMonth.now(),
    val events: List<Event> = emptyList(),
    val eventsForSelectedDate: List<Event> = emptyList(),
    val unavailableDates: List<UnavailableDate> = emptyList(),
    val isLoading: Boolean = false
)

@HiltViewModel
class CalendarViewModel @Inject constructor(
    private val eventRepository: EventRepository,
    private val apiService: ApiService
) : ViewModel() {

    private val _selectedDate = MutableStateFlow(LocalDate.now())
    private val _currentMonth = MutableStateFlow(YearMonth.now())
    private val _unavailableDates = MutableStateFlow<List<UnavailableDate>>(emptyList())

    // Surface block/unblock failures to the UI. Previously toggleDateBlock,
    // blockDateRange, and deleteUnavailableDate caught exceptions into empty
    // catch blocks, so a failed API call produced no user feedback — the
    // calendar would just fail to update silently.
    private val _errorMessage = MutableStateFlow<String?>(null)
    val errorMessage: StateFlow<String?> = _errorMessage.asStateFlow()

    fun clearError() {
        _errorMessage.value = null
    }

    val uiState: StateFlow<CalendarUiState> = combine(
        eventRepository.getEvents(),
        _selectedDate,
        _currentMonth,
        _unavailableDates
    ) { events, selected, month, unavailableDates ->
        val eventsForSelectedDate = events.filter {
            parseFlexibleDate(it.eventDate) == selected
        }
        CalendarUiState(
            selectedDate = selected,
            currentMonth = month,
            events = events,
            eventsForSelectedDate = eventsForSelectedDate,
            unavailableDates = unavailableDates,
            isLoading = false
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = CalendarUiState(isLoading = true)
    )

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

    fun goToToday() {
        val today = LocalDate.now()
        _selectedDate.value = today
        _currentMonth.value = YearMonth.from(today)
        loadUnavailableDates(YearMonth.from(today))
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

    fun loadAllUnavailableDates() {
        viewModelScope.launch {
            try {
                // Load a wide range to show all blocked dates in management sheet
                val now = LocalDate.now()
                val start = now.minusMonths(6).toString()
                val end = now.plusMonths(12).toString()
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
                _errorMessage.value = e.message ?: "No se pudo actualizar la disponibilidad de la fecha."
            }
        }
    }

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
                loadUnavailableDates(_currentMonth.value)
                loadAllUnavailableDates()
            } catch (e: Exception) {
                _errorMessage.value = e.message ?: "No se pudo bloquear el rango de fechas."
            }
        }
    }

    fun deleteUnavailableDate(id: String) {
        viewModelScope.launch {
            try {
                apiService.delete(Endpoints.unavailableDate(id))
                loadUnavailableDates(_currentMonth.value)
                loadAllUnavailableDates()
            } catch (e: Exception) {
                _errorMessage.value = e.message ?: "No se pudo eliminar la fecha bloqueada."
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
