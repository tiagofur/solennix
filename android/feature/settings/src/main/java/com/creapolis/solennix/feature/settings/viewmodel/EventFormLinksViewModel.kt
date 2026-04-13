package com.creapolis.solennix.feature.settings.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.model.EventFormLink
import com.creapolis.solennix.core.model.GenerateEventFormLinkRequest
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

sealed interface EventFormLinksUiState {
    data object Loading : EventFormLinksUiState
    data class Success(
        val links: List<EventFormLink>,
        val isGenerating: Boolean = false,
        val deletingId: String? = null
    ) : EventFormLinksUiState
    data class Error(val message: String) : EventFormLinksUiState
}

@HiltViewModel
class EventFormLinksViewModel @Inject constructor(
    private val apiService: ApiService
) : ViewModel() {

    private val _uiState = MutableStateFlow<EventFormLinksUiState>(EventFormLinksUiState.Loading)
    val uiState: StateFlow<EventFormLinksUiState> = _uiState.asStateFlow()

    private val _snackbarMessage = MutableStateFlow<String?>(null)
    val snackbarMessage: StateFlow<String?> = _snackbarMessage.asStateFlow()

    init {
        loadLinks()
    }

    fun loadLinks() {
        viewModelScope.launch {
            _uiState.value = EventFormLinksUiState.Loading
            try {
                val links: List<EventFormLink> = apiService.get(Endpoints.EVENT_FORM_LINKS)
                _uiState.value = EventFormLinksUiState.Success(links = links)
            } catch (e: Exception) {
                _uiState.value = EventFormLinksUiState.Error(
                    message = e.message ?: "Error al cargar los enlaces"
                )
            }
        }
    }

    fun generateLink(label: String?, ttlDays: Int?) {
        viewModelScope.launch {
            val current = _uiState.value
            if (current is EventFormLinksUiState.Success) {
                _uiState.value = current.copy(isGenerating = true)
            }
            try {
                val request = GenerateEventFormLinkRequest(
                    label = label?.takeIf { it.isNotBlank() },
                    ttlDays = ttlDays
                )
                val newLink: EventFormLink = apiService.post(Endpoints.EVENT_FORM_LINKS, request)
                val updated = (_uiState.value as? EventFormLinksUiState.Success)
                    ?.let { it.copy(links = listOf(newLink) + it.links, isGenerating = false) }
                    ?: EventFormLinksUiState.Success(links = listOf(newLink))
                _uiState.value = updated
                _snackbarMessage.value = "Enlace generado"
            } catch (e: Exception) {
                if (_uiState.value is EventFormLinksUiState.Success) {
                    _uiState.update { state ->
                        (state as? EventFormLinksUiState.Success)?.copy(isGenerating = false) ?: state
                    }
                }
                _snackbarMessage.value = e.message ?: "Error al generar enlace"
            }
        }
    }

    fun deleteLink(id: String) {
        viewModelScope.launch {
            val current = _uiState.value as? EventFormLinksUiState.Success ?: return@launch
            _uiState.value = current.copy(deletingId = id)
            try {
                apiService.delete(Endpoints.eventFormLink(id))
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
