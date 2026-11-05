package com.creapolis.solennix.feature.staff.viewmodel

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.data.repository.StaffRepository
import com.creapolis.solennix.core.model.Plan
import com.creapolis.solennix.core.model.Staff
import com.creapolis.solennix.core.network.AuthManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

private fun isPendingInviteStatus(status: String?): Boolean {
    return when (status?.trim()?.lowercase()) {
        "pending", "active", "invited", "sent" -> true
        else -> false
    }
}

data class StaffDetailUiState(
    val staff: Staff? = null,
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val isInviting: Boolean = false,
    val isRevoking: Boolean = false,
    val inviteUrl: String? = null,
    val inviteFeedback: String? = null,
    val inviteFeedbackIsError: Boolean = false,
    /** Rol de acceso de la invitación: `team_member` o `assistant` (#1347). */
    val inviteTargetRole: String = StaffDetailViewModel.INVITE_ROLE_TEAM_MEMBER,
    /** La opción Secretario exige plan Business (#1347 S1). */
    val canInviteAsAssistant: Boolean = false,
) {
    val hasPendingInvite: Boolean
        get() = !inviteUrl.isNullOrBlank() || isPendingInviteStatus(staff?.inviteStatus)
}

@HiltViewModel
class StaffDetailViewModel @Inject constructor(
    private val staffRepository: StaffRepository,
    private val authManager: AuthManager,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    companion object {
        const val INVITE_ROLE_TEAM_MEMBER = "team_member"
        const val INVITE_ROLE_ASSISTANT = "assistant"
    }

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
                _uiState.update {
                    it.copy(
                        staff = staff,
                        isLoading = false,
                        canInviteAsAssistant = isBusinessPlan()
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        errorMessage = e.message,
                        isLoading = false,
                        canInviteAsAssistant = isBusinessPlan()
                    )
                }
            }
        }
    }

    private fun isBusinessPlan(): Boolean =
        authManager.currentUser.value?.plan == Plan.BUSINESS

    /**
     * Elige el rol de acceso de la invitación (#1347 S1/S3).
     * `assistant` (Secretario) solo se acepta con plan Business; cualquier otro
     * valor o un plan inferior conserva `team_member`.
     */
    fun setInviteTargetRole(role: String) {
        val normalized = role.trim().lowercase()
        val next = when (normalized) {
            INVITE_ROLE_ASSISTANT -> if (isBusinessPlan()) INVITE_ROLE_ASSISTANT else return
            INVITE_ROLE_TEAM_MEMBER -> INVITE_ROLE_TEAM_MEMBER
            else -> return
        }
        _uiState.update { it.copy(inviteTargetRole = next) }
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
                val invite = staffRepository.inviteStaffUser(staffId, _uiState.value.inviteTargetRole)
                _uiState.update {
                    it.copy(
                        isInviting = false,
                        inviteUrl = invite.acceptUrl,
                        staff = it.staff?.copy(inviteStatus = invite.status),
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

    fun refreshInviteStatus() {
        viewModelScope.launch {
            try {
                val staff = staffRepository.getStaffMember(staffId)
                _uiState.update {
                    // Drop a stale in-memory link when the server no longer reports a pending invite.
                    val inviteUrl = if (isPendingInviteStatus(staff?.inviteStatus)) it.inviteUrl else null
                    it.copy(staff = staff, inviteUrl = inviteUrl)
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(errorMessage = e.message) }
            }
        }
    }

    fun onShareFallbackCopied() {
        _uiState.update {
            it.copy(
                inviteFeedback = "Link copiado al portapapeles.",
                inviteFeedbackIsError = false
            )
        }
    }

    fun revokeInviteAccess() {
        val current = _uiState.value.staff ?: return
        if (!isPendingInviteStatus(current.inviteStatus) && _uiState.value.inviteUrl.isNullOrBlank()) {
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
