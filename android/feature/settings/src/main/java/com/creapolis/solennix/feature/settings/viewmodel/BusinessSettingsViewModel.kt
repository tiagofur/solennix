package com.creapolis.solennix.feature.settings.viewmodel

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.model.User
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.AuthManager
import com.creapolis.solennix.core.network.Endpoints
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class BusinessSettingsViewModel @Inject constructor(
    private val authManager: AuthManager,
    private val apiService: ApiService
) : ViewModel() {

    var businessName by mutableStateOf("")
    var showBusinessNameInPdf by mutableStateOf(false)
    var logoUrl by mutableStateOf<String?>(null)
    var brandColor by mutableStateOf("#007AFF")

    var isLoading by mutableStateOf(true)
    var isSaving by mutableStateOf(false)
    var isUploadingLogo by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)
    var saveSuccess by mutableStateOf(false)

    init {
        loadUser()
    }

    fun loadUser() {
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            try {
                val user = authManager.currentUser.value
                if (user != null) {
                    businessName = user.businessName ?: ""
                    showBusinessNameInPdf = user.showBusinessNameInPdf ?: true
                    logoUrl = user.logoUrl
                    brandColor = user.brandColor ?: "#007AFF"
                }
            } catch (e: Exception) {
                errorMessage = "Error al cargar los datos: ${e.message}"
            } finally {
                isLoading = false
            }
        }
    }

    fun saveBusinessSettings() {
        viewModelScope.launch {
            isSaving = true
            errorMessage = null
            try {
                val payload = mapOf(
                    "business_name" to businessName.trim(),
                    "show_business_name_in_pdf" to showBusinessNameInPdf,
                    "brand_color" to brandColor
                )
                val updatedUser: User = apiService.put(Endpoints.UPDATE_PROFILE, payload)
                authManager.storeUser(updatedUser)
                saveSuccess = true
            } catch (e: Exception) {
                errorMessage = "Error al guardar: ${e.message}"
            } finally {
                isSaving = false
            }
        }
    }

    fun uploadLogo(bytes: ByteArray) {
        viewModelScope.launch {
            isUploadingLogo = true
            errorMessage = null
            try {
                val uploadedUrl: String = apiService.upload(
                    Endpoints.UPLOAD_IMAGE,
                    bytes,
                    "logo.jpg",
                    "image/jpeg"
                )

                // Update profile with new logo URL
                val payload = mapOf("logo_url" to uploadedUrl)
                val updatedUser: User = apiService.put(Endpoints.UPDATE_PROFILE, payload)
                authManager.storeUser(updatedUser)
                logoUrl = uploadedUrl
            } catch (e: Exception) {
                errorMessage = "Error al subir el logo: ${e.message}"
            } finally {
                isUploadingLogo = false
            }
        }
    }
}
