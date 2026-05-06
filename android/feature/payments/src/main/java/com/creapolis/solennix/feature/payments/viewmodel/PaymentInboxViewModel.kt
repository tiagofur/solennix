package com.creapolis.solennix.feature.payments.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.model.PaymentSubmission
import com.creapolis.solennix.core.model.ReviewSubmissionRequest
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.get
import com.creapolis.solennix.core.network.put
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class PaymentInboxUiState(
    val submissions: List<PaymentSubmission> = emptyList(),
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val error: String? = null,
    val actionLoading: String? = null, // submission id being acted on
    val actionError: String? = null
)

@HiltViewModel
class PaymentInboxViewModel @Inject constructor(
    private val apiService: ApiService
) : ViewModel() {

    private val _uiState = MutableStateFlow(PaymentInboxUiState())
    val uiState: StateFlow<PaymentInboxUiState> = _uiState.asStateFlow()

    init {
        loadSubmissions()
    }

    fun loadSubmissions(isRefresh: Boolean = false) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = !isRefresh, isRefreshing = isRefresh, error = null) }
            try {
                val result = apiService.get<Map<String, List<PaymentSubmission>>>(
                    "/organizer/payment-submissions"
                )
                _uiState.update {
                    it.copy(
                        submissions = result["data"] ?: emptyList(),
                        isLoading = false,
                        isRefreshing = false
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        isRefreshing = false,
                        error = e.message ?: "Error al cargar comprobantes"
                    )
                }
            }
        }
    }

    fun approveSubmission(submissionId: String) {
        reviewSubmission(submissionId, "approved", null)
    }

    fun rejectSubmission(submissionId: String, reason: String) {
        reviewSubmission(submissionId, "rejected", reason)
    }

    private fun reviewSubmission(id: String, status: String, rejectionReason: String?) {
        viewModelScope.launch {
            _uiState.update { it.copy(actionLoading = id, actionError = null) }
            try {
                apiService.put<Map<String, PaymentSubmission>>(
                    "/organizer/payment-submissions/$id",
                    ReviewSubmissionRequest(status = status, rejectionReason = rejectionReason)
                )
                // Refresh list after action
                loadSubmissions()
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        actionLoading = null,
                        actionError = e.message ?: "Error al procesar la acción"
                    )
                }
            }
        }
    }

    fun clearActionError() {
        _uiState.update { it.copy(actionError = null) }
    }
}
