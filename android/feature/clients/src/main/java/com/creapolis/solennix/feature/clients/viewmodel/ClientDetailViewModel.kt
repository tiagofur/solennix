package com.creapolis.solennix.feature.clients.viewmodel

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.data.repository.ClientRepository
import com.creapolis.solennix.core.data.repository.EventRepository
import com.creapolis.solennix.core.model.Client
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.feature.clients.R
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ClientDetailUiState(
    val client: Client? = null,
    val isLoading: Boolean = false,
    val errorMessage: String? = null,
    val clientEvents: List<Event> = emptyList(),
    val isEventsLoading: Boolean = false,
    val totalEvents: Int = 0,
    val totalSpent: Double = 0.0,
    val averagePerEvent: Double = 0.0
)

@HiltViewModel
class ClientDetailViewModel @Inject constructor(
    private val clientRepository: ClientRepository,
    private val eventRepository: EventRepository,
    @ApplicationContext private val context: Context,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val clientId: String = checkNotNull(savedStateHandle["clientId"])

    private val _uiState = MutableStateFlow(ClientDetailUiState(isLoading = true))
    val uiState: StateFlow<ClientDetailUiState> = _uiState.asStateFlow()

    var deleteSuccess by mutableStateOf(false)
        private set

    init {
        loadClient()
        loadClientEvents()
    }

    private fun loadClient() {
        viewModelScope.launch {
            try {
                val client = clientRepository.getClient(clientId)
                _uiState.update { it.copy(client = client, isLoading = false) }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        errorMessage = context.getString(R.string.clients_load_error),
                        isLoading = false
                    )
                }
            }
        }
    }

    private fun loadClientEvents() {
        viewModelScope.launch {
            _uiState.update { it.copy(isEventsLoading = true) }
            try {
                eventRepository.getEvents()
                    .map { events -> events.filter { it.clientId == clientId } }
                    .collect { clientEvents ->
                        val sortedEvents = clientEvents.sortedByDescending { it.eventDate }
                        val totalSpent = clientEvents.sumOf { it.totalAmount }
                        val totalEvents = clientEvents.size
                        val average = if (totalEvents > 0) totalSpent / totalEvents else 0.0

                        _uiState.update {
                            it.copy(
                                clientEvents = sortedEvents,
                                isEventsLoading = false,
                                totalEvents = totalEvents,
                                totalSpent = totalSpent,
                                averagePerEvent = average
                            )
                        }
                    }
            } catch (e: Exception) {
                _uiState.update { it.copy(isEventsLoading = false) }
            }
        }
    }

    fun deleteClient() {
        viewModelScope.launch {
            try {
                clientRepository.deleteClient(clientId)
                deleteSuccess = true
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        errorMessage = context.getString(
                            R.string.clients_delete_error,
                            e.message ?: ""
                        )
                    )
                }
            }
        }
    }
}
