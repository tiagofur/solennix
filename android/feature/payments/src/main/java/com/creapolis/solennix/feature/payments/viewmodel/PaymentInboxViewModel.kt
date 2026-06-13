package com.creapolis.solennix.feature.payments.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.model.PaymentSubmission
import com.creapolis.solennix.core.model.ReviewSubmissionRequest
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.get
import com.creapolis.solennix.core.network.patch
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.util.Locale
import javax.inject.Inject

data class PaymentInboxUiState(
    val submissions: List<PaymentSubmission> = emptyList(),
    val filteredSubmissions: List<PaymentSubmission> = emptyList(),
    val searchQuery: String = "",
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val isPlanLocked: Boolean = false,
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

    fun onSearchQueryChange(query: String) {
        _uiState.update { it.copy(searchQuery = query, filteredSubmissions = filterSubmissions(it.submissions, query)) }
    }

    private fun filterSubmissions(submissions: List<PaymentSubmission>, query: String): List<PaymentSubmission> {
        if (query.isBlank()) return submissions
        val lowered = query.lowercase(Locale.ROOT)
        return submissions.filter { sub ->
            (sub.clientName?.lowercase(Locale.ROOT)?.contains(lowered) == true) ||
            (sub.eventLabel?.lowercase(Locale.ROOT)?.contains(lowered) == true) ||
            (sub.transferRef?.lowercase(Locale.ROOT)?.contains(lowered) == true)
        }
    }

    fun loadSubmissions(isRefresh: Boolean = false) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = !isRefresh, isRefreshing = isRefresh, isPlanLocked = false, error = null) }
            try {
                val result = apiService.get<Map<String, List<PaymentSubmission>>>(
                    "payment-submissions"
                )
                _uiState.update {
                    val subs = result["data"] ?: emptyList()
                    it.copy(
                        submissions = subs,
                        filteredSubmissions = filterSubmissions(subs, it.searchQuery),
                        isLoading = false,
                        isRefreshing = false,
                        isPlanLocked = false
                    )
                }
            } catch (e: Exception) {
                val rawError = e.message ?: ""
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        isRefreshing = false,
                        isPlanLocked = isProOnlyError(rawError),
                        error = if (isProOnlyError(rawError)) null else localizeError(rawError)
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
                apiService.patch<Map<String, PaymentSubmission>>(
                    "payment-submissions/$id",
                    ReviewSubmissionRequest(status = status, rejectionReason = rejectionReason)
                )
                _uiState.update { it.copy(actionLoading = null) }
                loadSubmissions()
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        actionLoading = null,
                        actionError = localizeActionError(e.message ?: "")
                    )
                }
            }
        }
    }

    fun clearActionError() {
        _uiState.update { it.copy(actionError = null) }
    }

    private fun isProOnlyError(message: String): Boolean {
        val lowered = message.lowercase(Locale.ROOT)
        return lowered.contains("pro-exclusive") || lowered.contains("paid plan") || lowered.contains("upgrade")
    }

    private fun localizeError(message: String): String {
        if (message.isNotBlank()) return message
        return if (isSpanish()) "Error al cargar comprobantes" else "Failed to load payment receipts"
    }

    private fun localizeActionError(message: String): String {
        if (message.isNotBlank()) return message
        return if (isSpanish()) "Error al procesar la accion" else "Failed to process action"
    }

    private fun isSpanish(): Boolean = Locale.getDefault().language.startsWith("es")
}
