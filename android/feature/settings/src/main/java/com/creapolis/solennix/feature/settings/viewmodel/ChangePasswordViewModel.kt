package com.creapolis.solennix.feature.settings.viewmodel

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.feature.settings.R
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.post
import com.creapolis.solennix.core.network.Endpoints
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ChangePasswordViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val apiService: ApiService
) : ViewModel() {

    var currentPassword by mutableStateOf("")
    var newPassword by mutableStateOf("")
    var confirmPassword by mutableStateOf("")

    var isSaving by mutableStateOf(false)
    var saveSuccess by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)

    var hasAttemptedSubmit by mutableStateOf(false)

    val currentPasswordError: String?
        get() = if (hasAttemptedSubmit && currentPassword.isBlank()) context.getString(R.string.settings_password_current_required) else null

    val newPasswordError: String?
        get() = when {
            hasAttemptedSubmit && newPassword.isBlank() -> context.getString(R.string.settings_password_new_required)
            hasAttemptedSubmit && newPassword.length < 8 -> context.getString(R.string.settings_password_min_length)
            else -> null
        }

    val confirmPasswordError: String?
        get() = when {
            hasAttemptedSubmit && confirmPassword.isBlank() -> context.getString(R.string.settings_password_confirm_required)
            hasAttemptedSubmit && confirmPassword != newPassword -> context.getString(R.string.settings_password_mismatch)
            else -> null
        }

    val isFormValid: Boolean
        get() = currentPassword.isNotBlank() &&
                newPassword.length >= 8 &&
                confirmPassword == newPassword

    fun changePassword() {
        hasAttemptedSubmit = true
        if (!isFormValid) return

        viewModelScope.launch {
            isSaving = true
            errorMessage = null
            try {
                val payload = mapOf(
                    "current_password" to currentPassword,
                    "new_password" to newPassword
                )
                apiService.post<Any>(Endpoints.CHANGE_PASSWORD, payload)
                saveSuccess = true
            } catch (e: Exception) {
                errorMessage = context.getString(R.string.settings_password_change_error, e.message ?: e.javaClass.simpleName)
            } finally {
                isSaving = false
            }
        }
    }
}
