package com.creapolis.solennix.feature.events.viewmodel

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.data.repository.EventRepository
import com.creapolis.solennix.core.data.repository.PaymentRepository
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.Payment
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class EventDetailUiState(
    val event: Event? = null,
    val payments: List<Payment> = emptyList(),
    val totalPaid: Double = 0.0,
    val isLoading: Boolean = false,
    val errorMessage: String? = null
)

@HiltViewModel
class EventDetailViewModel @Inject constructor(
    private val eventRepository: EventRepository,
    private val paymentRepository: PaymentRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val eventId: String = checkNotNull(savedStateHandle["eventId"])

    private val _isLoading = MutableStateFlow(true)
    private val _errorMessage = MutableStateFlow<String?>(null)
    private val _event = MutableStateFlow<Event?>(null)

    val uiState: StateFlow<EventDetailUiState> = combine(
        _event,
        paymentRepository.getPaymentsByEventId(eventId),
        _isLoading,
        _errorMessage
    ) { event, payments, isLoading, errorMessage ->
        EventDetailUiState(
            event = event,
            payments = payments,
            totalPaid = payments.sumOf { it.amount },
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
                } catch (e: Exception) {
                    // Network sync errors are non-fatal, continue with cached data
                }

                // Load event data
                _event.value = eventRepository.getEvent(eventId)
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
