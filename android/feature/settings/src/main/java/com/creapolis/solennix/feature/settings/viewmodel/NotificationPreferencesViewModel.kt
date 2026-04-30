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
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import javax.inject.Inject

@Serializable
private data class NotificationPreferencesPayload(
    @SerialName("email_payment_receipt") val emailPaymentReceipt: Boolean,
    @SerialName("email_event_reminder") val emailEventReminder: Boolean,
    @SerialName("email_subscription_updates") val emailSubscriptionUpdates: Boolean,
    @SerialName("email_weekly_summary") val emailWeeklySummary: Boolean,
    @SerialName("email_marketing") val emailMarketing: Boolean,
    @SerialName("push_enabled") val pushEnabled: Boolean,
    @SerialName("push_event_reminder") val pushEventReminder: Boolean,
    @SerialName("push_payment_received") val pushPaymentReceived: Boolean
)

@HiltViewModel
class NotificationPreferencesViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val authManager: AuthManager,
    private val apiService: ApiService
) : ViewModel() {

    // Email preferences
    var emailPaymentReceipt by mutableStateOf(true)
    var emailEventReminder by mutableStateOf(true)
    var emailSubscriptionUpdates by mutableStateOf(true)
    var emailWeeklySummary by mutableStateOf(false)
    var emailMarketing by mutableStateOf(false)

    // Push preferences
    var pushEnabled by mutableStateOf(true)
    var pushEventReminder by mutableStateOf(true)
    var pushPaymentReceived by mutableStateOf(true)

    var isLoading by mutableStateOf(true)
    var errorMessage by mutableStateOf<String?>(null)

    init {
        loadPreferences()
    }

    private fun loadPreferences() {
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            try {
                val user: User = apiService.get(Endpoints.ME)
                authManager.storeUser(user)
                populateFromUser(user)
            } catch (e: Exception) {
                val cached = authManager.currentUser.value
                if (cached != null) populateFromUser(cached)
                errorMessage = context.getString(R.string.settings_error_load_preferences, e.message ?: e.javaClass.simpleName)
            } finally {
                isLoading = false
            }
        }
    }

    private fun populateFromUser(user: User) {
        emailPaymentReceipt = user.emailPaymentReceipt ?: true
        emailEventReminder = user.emailEventReminder ?: true
        emailSubscriptionUpdates = user.emailSubscriptionUpdates ?: true
        emailWeeklySummary = user.emailWeeklySummary ?: false
        emailMarketing = user.emailMarketing ?: false
        pushEnabled = user.pushEnabled ?: true
        pushEventReminder = user.pushEventReminder ?: true
        pushPaymentReceived = user.pushPaymentReceived ?: true
    }

    fun togglePreference(setter: () -> Unit) {
        setter()
        savePreferences()
    }

    private fun savePreferences() {
        viewModelScope.launch {
            errorMessage = null
            try {
                val payload = NotificationPreferencesPayload(
                    emailPaymentReceipt = emailPaymentReceipt,
                    emailEventReminder = emailEventReminder,
                    emailSubscriptionUpdates = emailSubscriptionUpdates,
                    emailWeeklySummary = emailWeeklySummary,
                    emailMarketing = emailMarketing,
                    pushEnabled = pushEnabled,
                    pushEventReminder = pushEventReminder,
                    pushPaymentReceived = pushPaymentReceived
                )
                val updated: User = apiService.put(Endpoints.UPDATE_PROFILE, payload)
                authManager.storeUser(updated)
            } catch (e: Exception) {
                errorMessage = context.getString(R.string.settings_error_save, e.message ?: e.javaClass.simpleName)
                // Reload to restore server state
                loadPreferences()
            }
        }
    }
}
