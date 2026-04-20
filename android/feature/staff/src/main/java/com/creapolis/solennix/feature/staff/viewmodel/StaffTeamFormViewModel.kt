package com.creapolis.solennix.feature.staff.viewmodel

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.data.repository.StaffRepository
import com.creapolis.solennix.core.data.repository.StaffTeamRepository
import com.creapolis.solennix.core.model.Staff
import com.creapolis.solennix.core.model.StaffTeam
import com.creapolis.solennix.core.model.StaffTeamMember
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.UUID
import javax.inject.Inject

/**
 * Miembro seleccionado en el form. Guardamos el snapshot para que la UI
 * pueda pintar nombre/rol sin volver a consultar staff.
 */
data class SelectedTeamMember(
    val staffId: String,
    val staffName: String,
    val staffRoleLabel: String?,
    val isLead: Boolean
)

@HiltViewModel
class StaffTeamFormViewModel @Inject constructor(
    private val teamRepository: StaffTeamRepository,
    private val staffRepository: StaffRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val teamId: String? = savedStateHandle.get<String>("teamId")?.takeIf { it.isNotBlank() }
    val isEditMode: Boolean = teamId != null

    var name by mutableStateOf("")
    var roleLabel by mutableStateOf("")
    var notes by mutableStateOf("")

    val members = mutableStateListOf<SelectedTeamMember>()

    var isLoading by mutableStateOf(false)
    var isSaving by mutableStateOf(false)
    var saveSuccess by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)
    var hasAttemptedSubmit by mutableStateOf(false)

    private val _availableStaff = MutableStateFlow<List<Staff>>(emptyList())
    val availableStaff: StateFlow<List<Staff>> = _availableStaff.asStateFlow()

    val nameError: String?
        get() = if (hasAttemptedSubmit && name.isBlank()) "El nombre es obligatorio" else null

    val isFormValid: Boolean
        get() = name.isNotBlank()

    init {
        loadStaffCatalog()
        if (teamId != null) {
            loadTeam(teamId)
        }
    }

    private fun loadStaffCatalog() {
        viewModelScope.launch {
            staffRepository.getStaff().collect { list ->
                _availableStaff.value = list
            }
        }
        viewModelScope.launch {
            try {
                staffRepository.syncStaff()
            } catch (_: Exception) {
                // Non-fatal: UI cae al cache
            }
        }
    }

    private fun loadTeam(id: String) {
        viewModelScope.launch {
            isLoading = true
            try {
                val team = teamRepository.getTeam(id)
                name = team.name
                roleLabel = team.roleLabel ?: ""
                notes = team.notes ?: ""
                members.clear()
                team.members?.sortedBy { it.position }?.forEach { m ->
                    members.add(
                        SelectedTeamMember(
                            staffId = m.staffId,
                            staffName = m.staffName ?: "Colaborador",
                            staffRoleLabel = m.staffRoleLabel,
                            isLead = m.isLead
                        )
                    )
                }
            } catch (e: Exception) {
                errorMessage = "No pudimos cargar el equipo: ${e.message}"
            } finally {
                isLoading = false
            }
        }
    }

    fun addMember(staff: Staff) {
        if (members.any { it.staffId == staff.id }) return
        members.add(
            SelectedTeamMember(
                staffId = staff.id,
                staffName = staff.name,
                staffRoleLabel = staff.roleLabel,
                isLead = false
            )
        )
    }

    fun removeMember(staffId: String) {
        members.removeAll { it.staffId == staffId }
    }

    fun toggleLead(staffId: String) {
        val index = members.indexOfFirst { it.staffId == staffId }
        if (index < 0) return
        members[index] = members[index].copy(isLead = !members[index].isLead)
    }

    fun saveTeam() {
        hasAttemptedSubmit = true
        if (!isFormValid) return
        viewModelScope.launch {
            isSaving = true
            errorMessage = null
            try {
                val payloadMembers = members.mapIndexed { idx, sel ->
                    StaffTeamMember(
                        teamId = teamId ?: "",
                        staffId = sel.staffId,
                        isLead = sel.isLead,
                        position = idx,
                        createdAt = "",
                        staffName = sel.staffName,
                        staffRoleLabel = sel.staffRoleLabel
                    )
                }
                val team = StaffTeam(
                    id = teamId ?: UUID.randomUUID().toString(),
                    userId = "",
                    name = name.trim(),
                    roleLabel = roleLabel.trim().takeIf { it.isNotBlank() },
                    notes = notes.trim().takeIf { it.isNotBlank() },
                    createdAt = "",
                    updatedAt = "",
                    members = payloadMembers
                )
                if (teamId != null) {
                    teamRepository.updateTeam(team)
                } else {
                    teamRepository.createTeam(team)
                }
                saveSuccess = true
            } catch (e: Exception) {
                errorMessage = "No pudimos guardar el equipo: ${e.message}"
            } finally {
                isSaving = false
            }
        }
    }
}
