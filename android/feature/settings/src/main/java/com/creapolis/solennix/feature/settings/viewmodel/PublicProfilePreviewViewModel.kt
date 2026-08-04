package com.creapolis.solennix.feature.settings.viewmodel

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.data.repository.PublicProfileRepository
import com.creapolis.solennix.core.model.ApiError
import com.creapolis.solennix.core.model.PublicOrganizerProfile
import com.creapolis.solennix.core.network.toApiError
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class PublicProfilePreviewUiState(
    val profile: PublicOrganizerProfile? = null,
    val isLoading: Boolean = false,
    val notFound: Boolean = false,
    val errorMessage: String? = null
)

@HiltViewModel
class PublicProfilePreviewViewModel @Inject constructor(
    private val publicProfileRepository: PublicProfileRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val slug: String =
        (savedStateHandle.get<String>("slug") ?: "").trim()

    private val _uiState = MutableStateFlow(PublicProfilePreviewUiState(isLoading = true))
    val uiState: StateFlow<PublicProfilePreviewUiState> = _uiState.asStateFlow()

    init {
        load()
    }

    fun load() {
        if (slug.isEmpty()) {
            _uiState.update {
                it.copy(isLoading = false, notFound = true, profile = null, errorMessage = null)
            }
            return
        }
        viewModelScope.launch {
            _uiState.update {
                it.copy(isLoading = true, notFound = false, errorMessage = null)
            }
            try {
                val profile = publicProfileRepository.getPublicOrganizer(slug)
                _uiState.update {
                    it.copy(profile = profile, isLoading = false, notFound = false, errorMessage = null)
                }
            } catch (e: Exception) {
                val api = e.toApiError()
                when (api) {
                    is ApiError.NotFound -> {
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                notFound = true,
                                profile = null,
                                errorMessage = null
                            )
                        }
                    }
                    else -> {
                        _uiState.update {
                            it.copy(
                                isLoading = false,
                                notFound = false,
                                errorMessage = e.message ?: api.message
                            )
                        }
                    }
                }
            }
        }
    }
}
