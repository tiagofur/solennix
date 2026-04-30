package com.creapolis.solennix.feature.settings.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.data.locale.AppLocaleManager
import com.creapolis.solennix.core.data.LocalCacheManager
import com.creapolis.solennix.core.data.repository.SettingsRepository
import com.creapolis.solennix.core.model.ThemeConfig
import com.creapolis.solennix.core.model.User
import com.creapolis.solennix.core.network.AuthManager
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.Endpoints
import com.creapolis.solennix.core.network.put
import com.creapolis.solennix.feature.settings.billing.BillingManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import javax.inject.Inject

@Serializable
private data class PreferredLanguagePayload(
    @SerialName("preferred_language") val preferredLanguage: String
)

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val authManager: AuthManager,
    private val billingManager: BillingManager,
    private val settingsRepository: SettingsRepository,
    private val localCacheManager: LocalCacheManager,
    private val apiService: ApiService,
    @dagger.hilt.android.qualifiers.ApplicationContext private val context: android.content.Context
) : ViewModel() {

    val currentUser: StateFlow<User?> = authManager.currentUser

    val themeConfig: StateFlow<ThemeConfig> = settingsRepository.themeConfig
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = ThemeConfig.SYSTEM_DEFAULT
        )

    val appLanguage: StateFlow<String> = settingsRepository.appLanguage
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = ""
        )

    fun updateLanguage(language: String, onSuccess: (() -> Unit)? = null, onError: ((String) -> Unit)? = null) {
        viewModelScope.launch {
            try {
                settingsRepository.setAppLanguage(language)
                val updatedUser: User = apiService.put(
                    Endpoints.UPDATE_PROFILE,
                    PreferredLanguagePayload(preferredLanguage = language)
                )
                authManager.storeUser(updatedUser)
                AppLocaleManager.applyLanguage(context, updatedUser.preferredLanguage)
                onSuccess?.invoke()
            } catch (e: Exception) {
                onError?.invoke(e.message ?: "Error updating language")
                AppLocaleManager.applyLanguage(context, authManager.currentUser.value?.preferredLanguage)
            }
        }
    }

    fun updateTheme(config: ThemeConfig) {
        viewModelScope.launch {
            settingsRepository.setThemeConfig(config)
        }
    }

    fun logout() {
        viewModelScope.launch {
            billingManager.logout()
            authManager.logout()
            localCacheManager.clearAll()
        }
    }
}
