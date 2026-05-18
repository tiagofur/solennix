package com.creapolis.solennix.feature.settings.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.model.EventReview
import com.creapolis.solennix.core.model.ReviewVisibility
import com.creapolis.solennix.core.model.UpdateReviewResponseRequest
import com.creapolis.solennix.core.model.UpdateReviewVisibilityRequest
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.Endpoints
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

data class ReviewsUiState(
    val reviews: List<EventReview> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null,
    val savingResponseId: String? = null,
    val updatingVisibilityId: String? = null,
)

@HiltViewModel
class ReviewsViewModel @Inject constructor(
    private val apiService: ApiService
) : ViewModel() {

    private val _uiState = MutableStateFlow(ReviewsUiState())
    val uiState: StateFlow<ReviewsUiState> = _uiState.asStateFlow()

    init {
        loadReviews()
    }

    fun loadReviews() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                val response = apiService.get<Map<String, List<EventReview>>>(Endpoints.REVIEWS)
                _uiState.update {
                    it.copy(
                        reviews = response["data"] ?: emptyList(),
                        isLoading = false,
                        error = null
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isLoading = false,
                        error = e.message ?: fallbackError()
                    )
                }
            }
        }
    }

    fun saveResponse(reviewId: String, text: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(savingResponseId = reviewId, error = null) }
            try {
                val payload = UpdateReviewResponseRequest(response = text.trim().ifBlank { null })
                val response = apiService.patch<Map<String, EventReview>>(
                    Endpoints.reviewResponse(reviewId),
                    payload
                )
                val updated = response["data"]
                _uiState.update { current ->
                    current.copy(
                        reviews = current.reviews.map { item ->
                            if (item.id == reviewId && updated != null) updated else item
                        },
                        savingResponseId = null
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        savingResponseId = null,
                        error = e.message ?: fallbackError()
                    )
                }
            }
        }
    }

    fun updateVisibility(reviewId: String, visibility: ReviewVisibility) {
        viewModelScope.launch {
            _uiState.update { it.copy(updatingVisibilityId = reviewId, error = null) }
            try {
                val payload = UpdateReviewVisibilityRequest(visibility = visibility)
                val response = apiService.patch<Map<String, EventReview>>(
                    Endpoints.reviewVisibility(reviewId),
                    payload
                )
                val updated = response["data"]
                _uiState.update { current ->
                    current.copy(
                        reviews = current.reviews.map { item ->
                            if (item.id == reviewId && updated != null) updated else item
                        },
                        updatingVisibilityId = null
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        updatingVisibilityId = null,
                        error = e.message ?: fallbackError()
                    )
                }
            }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    private fun fallbackError(): String {
        return if (Locale.getDefault().language.startsWith("es")) {
            "Error al cargar reseñas"
        } else {
            "Failed to load reviews"
        }
    }
}
