package com.creapolis.solennix.feature.staff.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.data.repository.StaffRepository
import com.creapolis.solennix.core.model.AssignmentPortalResponse
import com.creapolis.solennix.core.model.TeamMemberAssignment
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class TeamMemberPortalUiState(
    val assignments: List<TeamMemberAssignment> = emptyList(),
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val respondingAssignmentIds: Set<String> = emptySet(),
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
                _uiState.value = _uiState.value.copy(
                    assignments = assignments,
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
                _uiState.value = _uiState.value.copy(assignments = updatedAssignments)
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

    fun clearError() {
        _uiState.value = _uiState.value.copy(errorMessage = null)
    }
}