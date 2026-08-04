package com.creapolis.solennix.feature.requests.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.model.GeneratePublicRequestLinkRequest
import com.creapolis.solennix.core.model.PublicRequestLink
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.Endpoints
import com.creapolis.solennix.core.network.get
import com.creapolis.solennix.core.network.post
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed interface RequestLinksUiState {
    data object Loading : RequestLinksUiState
    data class Success(
        val links: List<PublicRequestLink>,
        val isGenerating: Boolean = false,
        val deletingId: String? = null
    ) : RequestLinksUiState

    data class Error(val message: String) : RequestLinksUiState
}

@HiltViewModel
class RequestLinksViewModel @Inject constructor(
    private val apiService: ApiService
) : ViewModel() {

    private val _uiState = MutableStateFlow<RequestLinksUiState>(RequestLinksUiState.Loading)
    val uiState: StateFlow<RequestLinksUiState> = _uiState.asStateFlow()

    private val _snackbarMessage = MutableStateFlow<String?>(null)
    val snackbarMessage: StateFlow<String?> = _snackbarMessage.asStateFlow()

    init {
        loadLinks()
    }

    fun loadLinks() {
        viewModelScope.launch {
            _uiState.value = RequestLinksUiState.Loading
            try {
                val links: List<PublicRequestLink> = apiService.get(Endpoints.PUBLIC_REQUEST_LINKS)
                _uiState.value = RequestLinksUiState.Success(
                    links = links.sortedByDescending { it.createdAt }
                )
            } catch (e: Exception) {
                _uiState.value = RequestLinksUiState.Error(
                    message = e.message ?: "Error al cargar los enlaces"
                )
            }
        }
    }

    fun generateLink(
        label: String?,
        ttlDays: Int?,
        maxUses: Int?,
        submitMode: String = "auto_event"
    ) {
        viewModelScope.launch {
            val current = _uiState.value
            if (current is RequestLinksUiState.Success) {
                _uiState.value = current.copy(isGenerating = true)
            }
            try {
                val request = GeneratePublicRequestLinkRequest(
                    label = label?.takeIf { it.isNotBlank() },
                    ttlDays = ttlDays,
                    maxUses = maxUses,
                    submitMode = submitMode
                )
                val newLink: PublicRequestLink =
                    apiService.post(Endpoints.PUBLIC_REQUEST_LINKS, request)
                val updated = (_uiState.value as? RequestLinksUiState.Success)
                    ?.let { it.copy(links = listOf(newLink) + it.links, isGenerating = false) }
                    ?: RequestLinksUiState.Success(links = listOf(newLink))
                _uiState.value = updated
                _snackbarMessage.value = "Enlace generado"
            } catch (e: Exception) {
                if (_uiState.value is RequestLinksUiState.Success) {
                    _uiState.update { state ->
                        (state as? RequestLinksUiState.Success)?.copy(isGenerating = false)
                            ?: state
                    }
                }
                _snackbarMessage.value = e.message ?: "Error al generar enlace"
            }
        }
    }

    fun deleteLink(id: String) {
        viewModelScope.launch {
            val current = _uiState.value as? RequestLinksUiState.Success ?: return@launch
            _uiState.value = current.copy(deletingId = id)
            try {
                apiService.delete(Endpoints.publicRequestLink(id))
                _uiState.value = current.copy(
                    links = current.links.filter { it.id != id },
                    deletingId = null
                )
                _snackbarMessage.value = "Enlace eliminado"
            } catch (e: Exception) {
                _uiState.value = current.copy(deletingId = null)
                _snackbarMessage.value = e.message ?: "Error al eliminar enlace"
            }
        }
    }

    fun clearSnackbar() {
        _snackbarMessage.value = null
    }
}
