package com.creapolis.solennix.feature.staff.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.data.repository.EventRepository
import com.creapolis.solennix.core.data.repository.StaffRepository
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.EventStaff
import com.creapolis.solennix.core.model.Staff
import com.creapolis.solennix.core.model.StaffAttendanceSummary
import dagger.hilt.android.lifecycle.HiltViewModel
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
 * - cualquier otro rol (u organizador) → app del organizador.
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
    private val eventRepository: EventRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(SecretaryPortalUiState(isLoading = true))
    val uiState: StateFlow<SecretaryPortalUiState> = _uiState.asStateFlow()

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
                    errorMessage = "No pudimos cargar el portal."
                )
            }
        }
    }

    fun selectEvent(eventId: String?) {
        if (eventId == null) {
            _uiState.value = _uiState.value.copy(
                selectedEventId = null,
                eventStaff = emptyList(),
                attendanceSummary = null
            )
            return
        }
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                selectedEventId = eventId,
                isLoadingDetail = true,
                errorMessage = null
            )
            try {
                val staff = staffRepository.syncEventStaff(eventId)
                val summary = staffRepository.getEventStaffSummary(eventId)
                _uiState.value = _uiState.value.copy(
                    eventStaff = staff,
                    attendanceSummary = summary,
                    isLoadingDetail = false,
                    errorMessage = null
                )
            } catch (_: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoadingDetail = false,
                    errorMessage = "No pudimos cargar la dotación del evento."
                )
            }
        }
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(errorMessage = null)
    }
}
