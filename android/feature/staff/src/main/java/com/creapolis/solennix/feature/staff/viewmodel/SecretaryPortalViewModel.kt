package com.creapolis.solennix.feature.staff.viewmodel

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.data.repository.EventRepository
import com.creapolis.solennix.core.data.repository.StaffRepository
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.EventStaff
import com.creapolis.solennix.core.model.Staff
import com.creapolis.solennix.core.model.StaffAttendanceSummary
import com.creapolis.solennix.feature.staff.R
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.time.LocalDate
import javax.inject.Inject

/**
 * Destino del portal según el rol del usuario autenticado (#1347 S4).
 *
 * - `assistant` → portal Secretario (solo lectura).
 * - `team_member` → portal Miembro existente.
 * - rol organizador conocido → app del organizador.
 * - rol nulo/vacío → fail-closed al portal menos privilegiado (#1365):
 *   nunca la app del organizador (caché corrupta, rol faltante, etc.).
 */
enum class PortalDestination {
    SECRETARY,
    TEAM_MEMBER,
    ORGANIZER
}

fun portalDestinationForRole(role: String?): PortalDestination =
    when (role?.trim()?.lowercase()) {
        "assistant" -> PortalDestination.SECRETARY
        "team_member" -> PortalDestination.TEAM_MEMBER
        null, "" -> PortalDestination.TEAM_MEMBER
        else -> PortalDestination.ORGANIZER
    }

data class SecretaryPortalUiState(
    val upcomingEvents: List<Event> = emptyList(),
    val selectedEventId: String? = null,
    val eventStaff: List<EventStaff> = emptyList(),
    val attendanceSummary: StaffAttendanceSummary? = null,
    val staffDirectory: List<Staff> = emptyList(),
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val isLoadingDetail: Boolean = false,
    val errorMessage: String? = null
)

/**
 * Portal del Secretario (#1347 S2): estrictamente solo lectura.
 *
 * - Agenda: próximos eventos (`GET /api/events` por rango).
 * - Dotación por evento: staff (`GET /api/events/{id}/staff`) + resumen
 *   RSVP (`GET /api/events/{id}/staff/summary`).
 * - Directorio del personal en lectura (`GET /api/staff`).
 *
 * No expone finanzas, clientes ni mutaciones.
 */
@HiltViewModel
class SecretaryPortalViewModel @Inject constructor(
    private val staffRepository: StaffRepository,
    private val eventRepository: EventRepository,
    @ApplicationContext private val context: Context
) : ViewModel() {

    private val _uiState = MutableStateFlow(SecretaryPortalUiState(isLoading = true))
    val uiState: StateFlow<SecretaryPortalUiState> = _uiState.asStateFlow()

    /** Load-detail job for the selected event; cancelled on rapid re-selection (#1366). */
    private var selectEventJob: Job? = null

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isRefreshing = true, errorMessage = null)
            try {
                val today = LocalDate.now()
                val upcoming = eventRepository
                    .getEventsByDateRangeFromApi(
                        today.toString(),
                        today.plusDays(60).toString()
                    )
                    .sortedBy { it.eventDate }
                staffRepository.syncStaff()
                val directory = staffRepository.getStaff().first()
                _uiState.value = _uiState.value.copy(
                    upcomingEvents = upcoming,
                    staffDirectory = directory.sortedBy { it.name.lowercase() },
                    isLoading = false,
                    isRefreshing = false,
                    errorMessage = null
                )
            } catch (_: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    isRefreshing = false,
                    errorMessage = context.getString(R.string.staff_portal_load_failed)
                )
            }
        }
    }

    fun selectEvent(eventId: String?) {
        // Cancel any in-flight detail load first: rapid A→B taps must never
        // let a stale A response overwrite B's selection (#1366).
        selectEventJob?.cancel()
        selectEventJob = null
        if (eventId == null) {
            _uiState.value = _uiState.value.copy(
                selectedEventId = null,
                eventStaff = emptyList(),
                attendanceSummary = null
            )
            return
        }
        selectEventJob = viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                selectedEventId = eventId,
                isLoadingDetail = true,
                errorMessage = null
            )
            try {
                val staff = staffRepository.syncEventStaff(eventId)
                val summary = staffRepository.getEventStaffSummary(eventId)
                if (_uiState.value.selectedEventId != eventId) return@launch
                _uiState.value = _uiState.value.copy(
                    eventStaff = staff,
                    attendanceSummary = summary,
                    isLoadingDetail = false,
                    errorMessage = null
                )
            } catch (ce: kotlinx.coroutines.CancellationException) {
                throw ce
            } catch (_: Exception) {
                if (_uiState.value.selectedEventId != eventId) return@launch
                _uiState.value = _uiState.value.copy(
                    isLoadingDetail = false,
                    errorMessage = context.getString(R.string.staff_portal_staff_load_failed)
                )
            }
        }
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(errorMessage = null)
    }
}
