package com.creapolis.solennix.feature.settings.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.data.LocalCacheManager
import com.creapolis.solennix.core.data.repository.SettingsRepository
import com.creapolis.solennix.core.model.ThemeConfig
import com.creapolis.solennix.core.model.User
import com.creapolis.solennix.core.network.AuthManager
import com.creapolis.solennix.feature.settings.billing.BillingManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val authManager: AuthManager,
    private val billingManager: BillingManager,
    private val settingsRepository: SettingsRepository,
    private val localCacheManager: LocalCacheManager
) : ViewModel() {

    val currentUser: StateFlow<User?> = authManager.currentUser

    val themeConfig: StateFlow<ThemeConfig> = settingsRepository.themeConfig
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = ThemeConfig.SYSTEM_DEFAULT
        )

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
