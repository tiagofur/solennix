package com.creapolis.solennix.feature.settings.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.data.LocalCacheManager
import com.creapolis.solennix.core.data.repository.SettingsRepository
import com.creapolis.solennix.core.data.widget.WidgetSyncTrigger
import com.creapolis.solennix.core.model.ThemeConfig
import com.creapolis.solennix.core.model.User
import com.creapolis.solennix.core.network.AuthManager
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.Endpoints
import com.creapolis.solennix.feature.settings.billing.BillingManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val authManager: AuthManager,
    private val billingManager: BillingManager,
    private val settingsRepository: SettingsRepository,
    private val localCacheManager: LocalCacheManager,
    private val apiService: ApiService,
    private val widgetSyncTrigger: WidgetSyncTrigger,
    @dagger.hilt.android.qualifiers.ApplicationContext private val context: android.content.Context
) : ViewModel() {

    val currentUser: StateFlow<User?> = authManager.currentUser

    val themeConfig: StateFlow<ThemeConfig> = settingsRepository.themeConfig
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = ThemeConfig.SYSTEM_DEFAULT
        )

    // Account deletion state
    private val _isDeletingOwnAccount = MutableStateFlow(false)
    val isDeletingOwnAccount: StateFlow<Boolean> = _isDeletingOwnAccount.asStateFlow()

    private val _deleteOwnAccountError = MutableStateFlow<String?>(null)
    val deleteOwnAccountError: StateFlow<String?> = _deleteOwnAccountError.asStateFlow()

    private val _deleteOwnAccountSuccess = MutableStateFlow(false)
    val deleteOwnAccountSuccess: StateFlow<Boolean> = _deleteOwnAccountSuccess.asStateFlow()

    val confirmDeletionConsent = MutableStateFlow(false)

    fun updateTheme(config: ThemeConfig) {
        viewModelScope.launch {
            settingsRepository.setThemeConfig(config)
        }
    }

    fun deleteOwnAccount(onSuccess: () -> Unit = {}) {
        if (!confirmDeletionConsent.value) {
            _deleteOwnAccountError.value = context.getString(
                com.creapolis.solennix.feature.settings.R.string.settings_account_deletion_consent_required
            )
            return
        }
        viewModelScope.launch {
            _isDeletingOwnAccount.value = true
            _deleteOwnAccountError.value = null
            try {
                apiService.delete(Endpoints.DELETE_ACCOUNT)
                _deleteOwnAccountSuccess.value = true
                _isDeletingOwnAccount.value = false
                onSuccess()
                delay(3_000)
                logout()
            } catch (e: Exception) {
                _deleteOwnAccountError.value = e.message ?: "Error al eliminar la cuenta"
                _isDeletingOwnAccount.value = false
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            billingManager.logout()
            authManager.logout()
            localCacheManager.clearAll()
            // Room has been wiped — force widgets to re-render into their signed-out /
            // empty state instead of showing the just-deleted rows until the next system
            // APPWIDGET_UPDATE. Unconditional: auth is already cleared at this point.
            widgetSyncTrigger.clearKpiSnapshot()
            widgetSyncTrigger.refreshAllUnconditional()
        }
    }
}
