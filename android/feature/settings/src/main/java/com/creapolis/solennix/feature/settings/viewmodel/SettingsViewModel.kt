package com.creapolis.solennix.feature.settings.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.model.User
import com.creapolis.solennix.core.network.AuthManager
import com.creapolis.solennix.feature.settings.billing.BillingManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val authManager: AuthManager,
    private val billingManager: BillingManager
) : ViewModel() {

    val currentUser: StateFlow<User?> = authManager.currentUser

    fun logout() {
        viewModelScope.launch {
            billingManager.logout()
            authManager.logout()
        }
    }
}
