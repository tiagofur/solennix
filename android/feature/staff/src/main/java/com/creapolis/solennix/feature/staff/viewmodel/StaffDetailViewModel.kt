package com.creapolis.solennix.feature.staff.viewmodel

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.data.repository.StaffRepository
import com.creapolis.solennix.core.model.Staff
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class StaffDetailUiState(
    val staff: Staff? = null,
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val isInviting: Boolean = false,
    val isRevoking: Boolean = false,
    val inviteUrl: String? = null,
    val inviteFeedback: String? = null,
    val inviteFeedbackIsError: Boolean = false,
)

@HiltViewModel
class StaffDetailViewModel @Inject constructor(
    private val staffRepository: StaffRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val staffId: String = checkNotNull(savedStateHandle["staffId"])

    private val _uiState = MutableStateFlow(StaffDetailUiState(isLoading = true))
    val uiState: StateFlow<StaffDetailUiState> = _uiState.asStateFlow()

    var deleteSuccess by mutableStateOf(false)
        private set

    init {
        loadStaff()
    }

    private fun loadStaff() {
        viewModelScope.launch {
            try {
                val staff = staffRepository.getStaffMember(staffId)
                _uiState.update { it.copy(staff = staff, isLoading = false) }
            } catch (e: Exception) {
                _uiState.update { it.copy(errorMessage = e.message, isLoading = false) }
            }
        }
    }

    fun deleteStaff() {
        viewModelScope.launch {
            try {
                staffRepository.deleteStaff(staffId)
                deleteSuccess = true
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(errorMessage = "Error al eliminar colaborador: ${e.message}")
                }
            }
        }
    }

    fun inviteAccess() {
        val current = _uiState.value.staff ?: return
        if (current.email.isNullOrBlank()) {
            _uiState.update {
                it.copy(
                    inviteFeedback = "Este colaborador necesita email para activar acceso.",
                    inviteFeedbackIsError = true
                )
            }
            return
        }
        if (!current.invitedUserId.isNullOrBlank()) {
            _uiState.update {
                it.copy(
                    inviteFeedback = "Este colaborador ya tiene acceso activado.",
                    inviteFeedbackIsError = false
                )
            }
            return
        }

        viewModelScope.launch {
            _uiState.update {
                it.copy(isInviting = true, inviteFeedback = null, inviteFeedbackIsError = false)
            }
            try {
                val invite = staffRepository.inviteStaffUser(staffId)
                _uiState.update {
                    it.copy(
                        isInviting = false,
                        inviteUrl = invite.acceptUrl,
                        inviteFeedback = "Invitación creada correctamente.",
                        inviteFeedbackIsError = false
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isInviting = false,
                        inviteFeedback = "No se pudo crear la invitación: ${e.message ?: "error"}",
                        inviteFeedbackIsError = true
                    )
                }
            }
        }
    }

    fun revokeInviteAccess() {
        val current = _uiState.value.staff ?: return
        if (current.inviteStatus != "pending" && _uiState.value.inviteUrl.isNullOrBlank()) {
            return
        }

        viewModelScope.launch {
            _uiState.update {
                it.copy(isRevoking = true, inviteFeedback = null, inviteFeedbackIsError = false)
            }
            try {
                staffRepository.revokeStaffInvite(staffId)
                _uiState.update {
                    it.copy(
                        isRevoking = false,
                        staff = it.staff?.copy(inviteStatus = null),
                        inviteUrl = null,
                        inviteFeedback = "Invitación revocada correctamente.",
                        inviteFeedbackIsError = false
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isRevoking = false,
                        inviteFeedback = "No se pudo revocar la invitación: ${e.message ?: "error"}",
                        inviteFeedbackIsError = true
                    )
                }
            }
        }
    }
}
