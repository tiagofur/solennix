package com.creapolis.solennix.feature.calendar.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.data.repository.EventRepository
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.EventStatus
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

private const val TAG = "CalendarViewModel"

/**
 * Typed error surface for the Calendar screen. The ViewModel emits these
 * enum cases; the Composable maps them to `stringResource(R.string.*)` so
 * translations stay in the resource catalog (not hardcoded here).
 */
enum class CalendarError {
    LoadFailed,
    BlockFailed,
    UnblockFailed
}

data class CalendarUiState(
    val selectedDate: LocalDate = LocalDate.now(),
    val currentMonth: YearMonth = YearMonth.now(),
    val events: List<Event> = emptyList(),
    val eventsForSelectedDate: List<Event> = emptyList(),
    val unavailableDates: List<UnavailableDate> = emptyList(),
    val isLoading: Boolean = false,
    // null = no filter active ("Todos" chip). When set, the grid dots and
    // the selected-day list are filtered to events matching this status.
    val statusFilter: EventStatus? = null
)

@HiltViewModel
class CalendarViewModel @Inject constructor(
    private val eventRepository: EventRepository,
    private val apiService: ApiService
) : ViewModel() {

    private val _selectedDate = MutableStateFlow(LocalDate.now())
    private val _currentMonth = MutableStateFlow(YearMonth.now())
    private val _unavailableDates = MutableStateFlow<List<UnavailableDate>>(emptyList())
    private val _statusFilter = MutableStateFlow<EventStatus?>(null)

    // Surface load/block/unblock failures to the UI. Previously every catch
    // was empty — a failed API call produced no user feedback. Now the
    // screen observes this Flow and shows a Snackbar with the corresponding
    // localized message.
    private val _error = MutableStateFlow<CalendarError?>(null)
    val error: StateFlow<CalendarError?> = _error.asStateFlow()

    fun clearError() {
        _error.value = null
    }

    fun setStatusFilter(filter: EventStatus?) {
        _statusFilter.value = filter
    }

    val uiState: StateFlow<CalendarUiState> = combine(
        eventRepository.getEvents(),
        _selectedDate,
        _currentMonth,
        _unavailableDates,
        _statusFilter
    ) { events, selected, month, unavailableDates, statusFilter ->
        val filtered = if (statusFilter != null) {
            events.filter { it.status == statusFilter }
        } else {
            events
        }
        val eventsForSelectedDate = filtered.filter {
            parseFlexibleDate(it.eventDate) == selected
        }
        CalendarUiState(
            selectedDate = selected,
            currentMonth = month,
            events = filtered,
            eventsForSelectedDate = eventsForSelectedDate,
            unavailableDates = unavailableDates,
            isLoading = false,
            statusFilter = statusFilter
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
                Log.w(TAG, "event sync failed", e)
                _error.value = CalendarError.LoadFailed
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
                Log.w(TAG, "unavailable-dates load failed for $yearMonth", e)
                _error.value = CalendarError.LoadFailed
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
                Log.w(TAG, "all-unavailable-dates load failed", e)
                _error.value = CalendarError.LoadFailed
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
                Log.w(TAG, "toggleDateBlock failed for $date", e)
                _error.value = if (existingBlockFor(date) != null) {
                    CalendarError.UnblockFailed
                } else {
                    CalendarError.BlockFailed
                }
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
                Log.w(TAG, "blockDateRange $startDate..$endDate failed", e)
                _error.value = CalendarError.BlockFailed
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
                Log.w(TAG, "deleteUnavailableDate $id failed", e)
                _error.value = CalendarError.UnblockFailed
            }
        }
    }

    fun isDateBlocked(date: LocalDate): Boolean = existingBlockFor(date) != null

    fun getUnavailableDateFor(date: LocalDate): UnavailableDate? = existingBlockFor(date)

    private fun existingBlockFor(date: LocalDate): UnavailableDate? {
        val dateStr = date.toString()
        return _unavailableDates.value.find { ud ->
            dateStr >= ud.startDate && dateStr <= ud.endDate
        }
    }
}
