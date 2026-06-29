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
import kotlinx.coroutines.launch
import java.util.UUID
import javax.inject.Inject

@HiltViewModel
class StaffFormViewModel @Inject constructor(
    private val staffRepository: StaffRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val staffId: String? = savedStateHandle.get<String>("staffId")?.takeIf { it.isNotBlank() }
    val isEditMode: Boolean = staffId != null

    private val originalState = mutableStateOf<Staff?>(null)

    // Form state
    var name by mutableStateOf("")
    var roleLabel by mutableStateOf("")
    var phone by mutableStateOf("")
    var email by mutableStateOf("")
    var notes by mutableStateOf("")
    var notificationEmailOptIn by mutableStateOf(false)

    var isLoading by mutableStateOf(false)
    var isSaving by mutableStateOf(false)
    var saveSuccess by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)

    var hasAttemptedSubmit by mutableStateOf(false)

    val nameError: String?
        get() = if (hasAttemptedSubmit && name.isBlank()) "El nombre es obligatorio" else null

    val emailError: String?
        get() = when {
            email.isNotBlank() && !isValidEmail(email) -> "Formato de email inválido"
            else -> null
        }

    val isFormValid: Boolean
        get() = name.isNotBlank() && (email.isBlank() || isValidEmail(email))

    val isDirty: Boolean
        get() = originalState.value?.let { original ->
            original.name != name ||
            original.roleLabel != roleLabel.trim().takeIf { it.isNotBlank() } ||
            original.phone != phone.trim().takeIf { it.isNotBlank() } ||
            original.email != email.trim().takeIf { it.isNotBlank() } ||
            original.notes != notes.trim().takeIf { it.isNotBlank() } ||
            original.notificationEmailOptIn != notificationEmailOptIn
        } ?: (name.isNotBlank() || roleLabel.isNotBlank() || phone.isNotBlank() || email.isNotBlank() || notes.isNotBlank())

    private fun isValidEmail(email: String): Boolean {
        return android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()
    }

    init {
        if (staffId != null) {
            loadStaff(staffId)
        }
    }

    private fun loadStaff(id: String) {
        viewModelScope.launch {
            isLoading = true
            try {
                val staff = staffRepository.getStaffMember(id)
                if (staff != null) {
                    name = staff.name
                    roleLabel = staff.roleLabel ?: ""
                    phone = staff.phone ?: ""
                    email = staff.email ?: ""
                    notes = staff.notes ?: ""
                    notificationEmailOptIn = staff.notificationEmailOptIn
                    originalState.value = staff.copy()
                }
            } catch (e: Exception) {
                errorMessage = "Error al cargar colaborador: ${e.message}"
            } finally {
                isLoading = false
            }
        }
    }

    fun saveStaff() {
        hasAttemptedSubmit = true
        if (!isFormValid) return

        viewModelScope.launch {
            isSaving = true
            errorMessage = null
            try {
                val staff = Staff(
                    id = staffId ?: UUID.randomUUID().toString(),
                    userId = "", // Backend lo setea desde el token
                    name = name.trim(),
                    roleLabel = roleLabel.trim().takeIf { it.isNotBlank() },
                    phone = phone.trim().takeIf { it.isNotBlank() },
                    email = email.trim().takeIf { it.isNotBlank() },
                    notes = notes.trim().takeIf { it.isNotBlank() },
                    notificationEmailOptIn = notificationEmailOptIn,
                    createdAt = "",
                    updatedAt = ""
                )

                if (staffId != null) {
                    staffRepository.updateStaff(staff)
                } else {
                    staffRepository.createStaff(staff)
                }
                saveSuccess = true
            } catch (e: Exception) {
                errorMessage = "Error al guardar colaborador: ${e.message}"
            } finally {
                isSaving = false
            }
        }
    }
}
