package com.creapolis.solennix.feature.clients.viewmodel

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.data.plan.LimitCheckResult
import com.creapolis.solennix.core.data.plan.PlanLimitsManager
import com.creapolis.solennix.core.data.repository.ClientRepository
import com.creapolis.solennix.core.data.util.ImageCompressor
import com.creapolis.solennix.core.model.Client
import com.creapolis.solennix.core.model.Plan
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.SolennixException
import com.creapolis.solennix.core.network.get
import com.creapolis.solennix.core.network.post
import com.creapolis.solennix.core.network.put
import com.creapolis.solennix.core.network.AuthManager
import com.creapolis.solennix.core.network.Endpoints
import com.creapolis.solennix.feature.clients.R
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.UUID
import javax.inject.Inject

@HiltViewModel
class ClientFormViewModel @Inject constructor(
    private val clientRepository: ClientRepository,
    private val apiService: ApiService,
    private val planLimitsManager: PlanLimitsManager,
    private val authManager: AuthManager,
    @ApplicationContext private val context: Context,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val clientId: String? = savedStateHandle["clientId"]

    // Plan limit check
    var limitCheckResult by mutableStateOf<LimitCheckResult?>(null)
        private set
    val isLimitReached: Boolean
        get() = limitCheckResult is LimitCheckResult.LimitReached

    var name by mutableStateOf("")
    var email by mutableStateOf("")
    var phone by mutableStateOf("")
    var address by mutableStateOf("")
    var city by mutableStateOf("")
    var notes by mutableStateOf("")
    var photoUrl by mutableStateOf("")

    var isLoading by mutableStateOf(false)
    var isSaving by mutableStateOf(false)
    var isUploadingPhoto by mutableStateOf(false)
    var saveSuccess by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)
    var planLimitMessage by mutableStateOf<String?>(null)

    // Field-level validation tracking
    var hasAttemptedSubmit by mutableStateOf(false)

    val nameError: String?
        get() = if (hasAttemptedSubmit && name.isBlank()) context.getString(R.string.clients_name_required) else null

    val phoneError: String?
        get() = when {
            hasAttemptedSubmit && phone.isBlank() -> context.getString(R.string.clients_phone_required)
            hasAttemptedSubmit && phone.isNotBlank() && !isValidPhone(phone) -> context.getString(R.string.clients_phone_invalid)
            else -> null
        }

    val emailError: String?
        get() = when {
            email.isNotBlank() && !isValidEmail(email) -> context.getString(R.string.clients_email_invalid)
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
        } else {
            // Only check plan limits when creating a new client
            viewModelScope.launch {
                val plan = authManager.currentUser.value?.plan ?: Plan.BASIC
                limitCheckResult = planLimitsManager.canCreateClient(plan)
            }
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
                    photoUrl = client.photoUrl ?: ""
                }
            } catch (e: Exception) {
                errorMessage = context.getString(R.string.clients_load_error)
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
                    photoUrl = photoUrl.takeIf { it.isNotBlank() },
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
            } catch (e: SolennixException.PlanLimitExceeded) {
                planLimitMessage = e.message
            } catch (e: Exception) {
                errorMessage = context.getString(R.string.clients_save_error, e.message ?: "")
            } finally {
                isSaving = false
            }
        }
    }

    fun uploadPhoto(context: Context, uri: Uri) {
        viewModelScope.launch {
            isUploadingPhoto = true
            errorMessage = null
            try {
                val contentResolver = context.contentResolver
                val mimeType = contentResolver.getType(uri) ?: "image/jpeg"
                val fileName = getFileName(context, uri) ?: "client_photo.jpg"
                val inputStream = contentResolver.openInputStream(uri)
                val bytes = inputStream?.readBytes()
                inputStream?.close()

                if (bytes != null) {
                    // Compress image in a background thread
                    val compressedBytes = withContext(Dispatchers.Default) {
                        ImageCompressor.compress(bytes)
                    }

                    val response = apiService.upload(
                        Endpoints.UPLOAD_IMAGE,
                        compressedBytes,
                        fileName,
                        mimeType
                    )
                    photoUrl = response.url
                } else {
                    errorMessage = context.getString(R.string.clients_photo_read_error)
                }
            } catch (e: Exception) {
                errorMessage = context.getString(R.string.clients_photo_upload_error, e.message ?: "")
            } finally {
                isUploadingPhoto = false
            }
        }
    }

    private fun getFileName(context: Context, uri: Uri): String? {
        var name: String? = null
        val cursor = context.contentResolver.query(uri, null, null, null, null)
        cursor?.use {
            if (it.moveToFirst()) {
                val index = it.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                if (index >= 0) {
                    name = it.getString(index)
                }
            }
        }
        return name
    }
}
