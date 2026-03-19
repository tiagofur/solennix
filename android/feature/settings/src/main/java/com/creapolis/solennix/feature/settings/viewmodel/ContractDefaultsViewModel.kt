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
class ContractDefaultsViewModel @Inject constructor(
    private val authManager: AuthManager,
    private val apiService: ApiService
) : ViewModel() {

    var depositPercent by mutableStateOf(50f)
    var cancellationDays by mutableStateOf(7f)
    var refundPercent by mutableStateOf(50f)
    var contractTemplate by mutableStateOf("")

    var isLoading by mutableStateOf(true)
    var isSaving by mutableStateOf(false)
    var saveSuccess by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)

    init {
        loadContractDefaults()
    }

    fun loadContractDefaults() {
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
                errorMessage = "Error al cargar los datos: ${e.message}"
            } finally {
                isLoading = false
            }
        }
    }

    private fun populateFromUser(user: User) {
        depositPercent = user.defaultDepositPercent?.toFloat() ?: 50f
        cancellationDays = user.defaultCancellationDays?.toFloat() ?: 7f
        refundPercent = user.defaultRefundPercent?.toFloat() ?: 50f
        contractTemplate = user.contractTemplate ?: ""
    }

    fun saveContractDefaults() {
        viewModelScope.launch {
            isSaving = true
            errorMessage = null
            try {
                val payload = mapOf(
                    "default_deposit_percent" to depositPercent.toDouble(),
                    "default_cancellation_days" to cancellationDays.toDouble(),
                    "default_refund_percent" to refundPercent.toDouble(),
                    "contract_template" to contractTemplate.trim()
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
}
