package com.creapolis.solennix.feature.clients.viewmodel

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.data.repository.ClientRepository
import com.creapolis.solennix.core.model.Client
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import java.util.UUID
import javax.inject.Inject

@HiltViewModel
class ClientFormViewModel @Inject constructor(
    private val clientRepository: ClientRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val clientId: String? = savedStateHandle["clientId"]

    var name by mutableStateOf("")
    var email by mutableStateOf("")
    var phone by mutableStateOf("")
    var address by mutableStateOf("")
    var city by mutableStateOf("")
    var notes by mutableStateOf("")

    var isLoading by mutableStateOf(false)
    var isSaving by mutableStateOf(false)
    var saveSuccess by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)

    // Field-level validation tracking
    var hasAttemptedSubmit by mutableStateOf(false)

    val nameError: String?
        get() = if (hasAttemptedSubmit && name.isBlank()) "El nombre es requerido" else null

    val phoneError: String?
        get() = when {
            hasAttemptedSubmit && phone.isBlank() -> "El teléfono es requerido"
            hasAttemptedSubmit && phone.isNotBlank() && !isValidPhone(phone) -> "Formato de teléfono inválido (mínimo 10 dígitos)"
            else -> null
        }

    val emailError: String?
        get() = when {
            email.isNotBlank() && !isValidEmail(email) -> "Formato de correo inválido"
            else -> null
        }

    val isFormValid: Boolean
        get() = name.isNotBlank() && phone.isNotBlank() && isValidPhone(phone) &&
                (email.isBlank() || isValidEmail(email))

    private fun isValidEmail(email: String): Boolean {
        return android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()
    }

    private fun isValidPhone(phone: String): Boolean {
        // Accept phone numbers with 10+ digits (allowing spaces, dashes, parentheses)
        val digitsOnly = phone.filter { it.isDigit() }
        return digitsOnly.length >= 10
    }

    init {
        if (clientId != null) {
            loadClient(clientId)
        }
    }

    private fun loadClient(id: String) {
        viewModelScope.launch {
            isLoading = true
            try {
                val client = clientRepository.getClient(id)
                if (client != null) {
                    name = client.name
                    email = client.email ?: ""
                    phone = client.phone
                    address = client.address ?: ""
                    city = client.city ?: ""
                    notes = client.notes ?: ""
                }
            } catch (e: Exception) {
                errorMessage = "Error al cargar cliente: ${e.message}"
            } finally {
                isLoading = false
            }
        }
    }

    fun saveClient() {
        hasAttemptedSubmit = true
        if (!isFormValid) return

        viewModelScope.launch {
            isSaving = true
            errorMessage = null
            try {
                val client = Client(
                    id = clientId ?: UUID.randomUUID().toString(),
                    userId = "", // Managed by backend or user session
                    name = name,
                    email = email.takeIf { it.isNotBlank() },
                    phone = phone,
                    address = address.takeIf { it.isNotBlank() },
                    city = city.takeIf { it.isNotBlank() },
                    notes = notes.takeIf { it.isNotBlank() },
                    photoUrl = null,
                    totalEvents = 0,
                    totalSpent = 0.0,
                    createdAt = "", // Handled by backend
                    updatedAt = ""  // Handled by backend
                )

                if (clientId != null) {
                    clientRepository.updateClient(client)
                } else {
                    clientRepository.createClient(client)
                }
                saveSuccess = true
            } catch (e: Exception) {
                errorMessage = "Error al guardar cliente: ${e.message}"
            } finally {
                isSaving = false
            }
        }
    }
}
