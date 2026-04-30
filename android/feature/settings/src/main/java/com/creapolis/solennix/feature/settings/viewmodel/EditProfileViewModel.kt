package com.creapolis.solennix.feature.settings.viewmodel

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.feature.settings.R
import com.creapolis.solennix.core.model.User
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.get
import com.creapolis.solennix.core.network.put
import com.creapolis.solennix.core.network.AuthManager
import com.creapolis.solennix.core.network.Endpoints
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class EditProfileViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val authManager: AuthManager,
    private val apiService: ApiService
) : ViewModel() {

    var name by mutableStateOf("")
    var email by mutableStateOf("")

    var isLoading by mutableStateOf(true)
    var isSaving by mutableStateOf(false)
    var saveSuccess by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)

    var hasAttemptedSubmit by mutableStateOf(false)

    val nameError: String?
        get() = if (hasAttemptedSubmit && name.isBlank()) context.getString(R.string.settings_profile_name_required) else null

    val emailError: String?
        get() = when {
            hasAttemptedSubmit && email.isBlank() -> context.getString(R.string.settings_profile_email_required)
            hasAttemptedSubmit && email.isNotBlank() && !isValidEmail(email) -> context.getString(R.string.settings_profile_email_invalid)
            else -> null
        }

    val isFormValid: Boolean
        get() = name.isNotBlank() && email.isNotBlank() && isValidEmail(email)

    private fun isValidEmail(email: String): Boolean {
        return android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()
    }

    init {
        loadUser()
    }

    private fun loadUser() {
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            try {
                val freshUser: User = apiService.get(Endpoints.ME)
                authManager.storeUser(freshUser)
                populateFromUser(freshUser)
            } catch (e: Exception) {
                // Fallback to cached data if API call fails
                val cachedUser = authManager.currentUser.value
                if (cachedUser != null) {
                    populateFromUser(cachedUser)
                }
                errorMessage = context.getString(R.string.settings_error_load_data, e.message ?: e.javaClass.simpleName)
            } finally {
                isLoading = false
            }
        }
    }

    private fun populateFromUser(user: User) {
        name = user.name
        email = user.email
    }

    fun saveProfile() {
        hasAttemptedSubmit = true
        if (!isFormValid) return

        viewModelScope.launch {
            isSaving = true
            errorMessage = null
            try {
                val payload = mapOf(
                    "name" to name,
                    "email" to email
                )
                val updatedUser: User = apiService.put(Endpoints.UPDATE_PROFILE, payload)
                authManager.storeUser(updatedUser)
                saveSuccess = true
            } catch (e: Exception) {
                errorMessage = context.getString(R.string.settings_error_save, e.message ?: e.javaClass.simpleName)
            } finally {
                isSaving = false
            }
        }
    }
}
