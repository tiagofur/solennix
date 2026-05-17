package com.creapolis.solennix.feature.staff.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.data.repository.StaffRepository
import com.creapolis.solennix.core.model.AssignmentPortalResponse
import com.creapolis.solennix.core.model.TeamMemberAssignment
import com.creapolis.solennix.core.model.TeamMemberChangeEvent
import com.creapolis.solennix.core.model.UnavailableDate
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class TeamMemberPortalUiState(
    val assignments: List<TeamMemberAssignment> = emptyList(),
    val timeline: List<TeamMemberChangeEvent> = emptyList(),
    val unavailableDates: List<UnavailableDate> = emptyList(),
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val isSavingAvailability: Boolean = false,
    val respondingAssignmentIds: Set<String> = emptySet(),
    val markingTimelineReadIds: Set<String> = emptySet(),
    val errorMessage: String? = null
)

@HiltViewModel
class TeamMemberPortalViewModel @Inject constructor(
    private val staffRepository: StaffRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(TeamMemberPortalUiState(isLoading = true))
    val uiState: StateFlow<TeamMemberPortalUiState> = _uiState.asStateFlow()

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isRefreshing = true, errorMessage = null)
            try {
                val assignments = staffRepository.getMyAssignments()
                val timeline = staffRepository.getMyTimeline(unreadOnly = false, limit = 8)
                val (start, end) = availabilityBounds()
                val unavailableDates = staffRepository.getMyUnavailableDates(start, end)
                _uiState.value = _uiState.value.copy(
                    assignments = assignments,
                    timeline = timeline,
                    unavailableDates = unavailableDates,
                    isLoading = false,
                    isRefreshing = false,
                    errorMessage = null
                )
            } catch (_: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    isRefreshing = false,
                    errorMessage = "No pudimos cargar tus asignaciones."
                )
            }
        }
    }

    fun respond(assignment: TeamMemberAssignment, response: AssignmentPortalResponse) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                respondingAssignmentIds = _uiState.value.respondingAssignmentIds + assignment.eventStaffId,
                errorMessage = null
            )
            try {
                val outcome = staffRepository.respondAssignment(assignment.eventStaffId, response)
                val updatedAssignments = _uiState.value.assignments.mapNotNull { item ->
                    when {
                        item.eventStaffId != assignment.eventStaffId -> item
                        outcome.finalStatus.lowercase() == "confirmed" -> item.copy(status = "confirmed")
                        outcome.finalStatus.lowercase() == "declined" -> item.copy(status = "declined")
                        outcome.finalStatus.lowercase() == "cancelled" -> item.copy(status = "cancelled")
                        else -> null
                    }
                }
                val timeline = staffRepository.getMyTimeline(unreadOnly = false, limit = 8)
                _uiState.value = _uiState.value.copy(assignments = updatedAssignments, timeline = timeline)
            } catch (_: Exception) {
                _uiState.value = _uiState.value.copy(
                    errorMessage = "No pudimos actualizar tu respuesta."
                )
            } finally {
                _uiState.value = _uiState.value.copy(
                    respondingAssignmentIds = _uiState.value.respondingAssignmentIds - assignment.eventStaffId
                )
            }
        }
    }

    fun markTimelineRead(id: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(
                markingTimelineReadIds = _uiState.value.markingTimelineReadIds + id,
                errorMessage = null
            )
            try {
                staffRepository.markMyTimelineRead(listOf(id))
                _uiState.value = _uiState.value.copy(
                    timeline = _uiState.value.timeline.map {
                        if (it.id == id) it.copy(readAt = java.time.Instant.now().toString()) else it
                    }
                )
            } catch (_: Exception) {
                _uiState.value = _uiState.value.copy(
                    errorMessage = "No pudimos actualizar el estado de lectura."
                )
            } finally {
                _uiState.value = _uiState.value.copy(
                    markingTimelineReadIds = _uiState.value.markingTimelineReadIds - id
                )
            }
        }
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(errorMessage = null)
    }

    fun createUnavailableDate(
        startDate: String,
        endDate: String,
        startTime: String?,
        endTime: String?,
        reason: String?
    ) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSavingAvailability = true, errorMessage = null)
            try {
                staffRepository.createMyUnavailableDate(startDate, endDate, startTime, endTime, reason)
                val (start, end) = availabilityBounds()
                val unavailableDates = staffRepository.getMyUnavailableDates(start, end)
                _uiState.value = _uiState.value.copy(unavailableDates = unavailableDates)
            } catch (_: Exception) {
                _uiState.value = _uiState.value.copy(errorMessage = "No pudimos bloquear fechas.")
            } finally {
                _uiState.value = _uiState.value.copy(isSavingAvailability = false)
            }
        }
    }

    fun updateUnavailableDate(
        id: String,
        startDate: String,
        endDate: String,
        startTime: String?,
        endTime: String?,
        reason: String?
    ) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSavingAvailability = true, errorMessage = null)
            try {
                staffRepository.updateMyUnavailableDate(id, startDate, endDate, startTime, endTime, reason)
                val (start, end) = availabilityBounds()
                val unavailableDates = staffRepository.getMyUnavailableDates(start, end)
                _uiState.value = _uiState.value.copy(unavailableDates = unavailableDates)
            } catch (_: Exception) {
                _uiState.value = _uiState.value.copy(errorMessage = "No pudimos actualizar el bloqueo.")
            } finally {
                _uiState.value = _uiState.value.copy(isSavingAvailability = false)
            }
        }
    }

    fun deleteUnavailableDate(id: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isSavingAvailability = true, errorMessage = null)
            try {
                staffRepository.deleteMyUnavailableDate(id)
                _uiState.value = _uiState.value.copy(
                    unavailableDates = _uiState.value.unavailableDates.filterNot { it.id == id }
                )
            } catch (_: Exception) {
                _uiState.value = _uiState.value.copy(errorMessage = "No pudimos eliminar el bloqueo.")
            } finally {
                _uiState.value = _uiState.value.copy(isSavingAvailability = false)
            }
        }
    }

    private fun availabilityBounds(now: java.time.LocalDate = java.time.LocalDate.now()): Pair<String, String> {
        val year = now.year
        return "${year - 1}-01-01" to "${year + 1}-12-31"
    }
}