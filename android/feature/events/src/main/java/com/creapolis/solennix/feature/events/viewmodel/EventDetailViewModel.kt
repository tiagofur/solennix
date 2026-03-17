package com.creapolis.solennix.feature.events.viewmodel

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.data.repository.ClientRepository
import com.creapolis.solennix.core.data.repository.EventRepository
import com.creapolis.solennix.core.data.repository.PaymentRepository
import com.creapolis.solennix.core.model.Client
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.EventExtra
import com.creapolis.solennix.core.model.EventProduct
import com.creapolis.solennix.core.model.Payment
import com.creapolis.solennix.core.model.User
import com.creapolis.solennix.core.network.AuthManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

data class EventDetailUiState(
    val event: Event? = null,
    val client: Client? = null,
    val products: List<EventProduct> = emptyList(),
    val extras: List<EventExtra> = emptyList(),
    val payments: List<Payment> = emptyList(),
    val totalPaid: Double = 0.0,
    val currentUser: User? = null,
    val isLoading: Boolean = false,
    val errorMessage: String? = null
)

@HiltViewModel
class EventDetailViewModel @Inject constructor(
    private val eventRepository: EventRepository,
    private val clientRepository: ClientRepository,
    private val paymentRepository: PaymentRepository,
    private val authManager: AuthManager,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val eventId: String = checkNotNull(savedStateHandle["eventId"])

    private val _isLoading = MutableStateFlow(true)
    private val _errorMessage = MutableStateFlow<String?>(null)
    private val _event = MutableStateFlow<Event?>(null)
    private val _client = MutableStateFlow<Client?>(null)

    val uiState: StateFlow<EventDetailUiState> = combine(
        _event,
        _client,
        eventRepository.getEventProducts(eventId),
        eventRepository.getEventExtras(eventId),
        paymentRepository.getPaymentsByEventId(eventId),
        _isLoading,
        _errorMessage
    ) { values ->
        val event = values[0] as Event?
        val client = values[1] as Client?
        @Suppress("UNCHECKED_CAST")
        val products = values[2] as List<EventProduct>
        @Suppress("UNCHECKED_CAST")
        val extras = values[3] as List<EventExtra>
        @Suppress("UNCHECKED_CAST")
        val payments = values[4] as List<Payment>
        val isLoading = values[5] as Boolean
        val errorMessage = values[6] as String?

        EventDetailUiState(
            event = event,
            client = client,
            products = products,
            extras = extras,
            payments = payments,
            totalPaid = payments.sumOf { it.amount },
            currentUser = authManager.currentUser.value,
            isLoading = isLoading,
            errorMessage = errorMessage
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = EventDetailUiState(isLoading = true)
    )

    init {
        loadEvent()
    }

    fun loadEvent() {
        viewModelScope.launch {
            _isLoading.value = true
            _errorMessage.value = null
            try {
                // Sync from API in background
                try {
                    paymentRepository.syncPaymentsByEventId(eventId)
                    eventRepository.syncEventItems(eventId)
                } catch (e: Exception) {
                    // Network sync errors are non-fatal, continue with cached data
                }

                // Load event data
                val event = eventRepository.getEvent(eventId)
                _event.value = event

                // Load client data
                event?.clientId?.let { clientId ->
                    _client.value = clientRepository.getClient(clientId)
                }

                _isLoading.value = false
            } catch (e: Exception) {
                _errorMessage.value = e.message
                _isLoading.value = false
            }
        }
    }

    fun addPayment(amount: Double, method: String, notes: String?) {
        viewModelScope.launch {
            try {
                val newPayment = Payment(
                    id = "", // Backend will generate or override if empty
                    eventId = eventId,
                    userId = uiState.value.event?.userId ?: "",
                    amount = amount,
                    paymentDate = java.time.LocalDate.now().toString(),
                    paymentMethod = method,
                    notes = notes,
                    createdAt = ""
                )
                paymentRepository.createPayment(newPayment)
                // Flow automatically updates via Room → paymentRepository.getPaymentsByEventId
            } catch (e: Exception) {
                _errorMessage.value = "Error adding payment: ${e.message}"
            }
        }
    }
}
