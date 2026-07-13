package com.creapolis.solennix.feature.events.viewmodel

import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.model.Payment
import com.creapolis.solennix.feature.events.R
import kotlinx.coroutines.launch

private const val MIN_PAYMENT_AMOUNT: Double = 0.01

fun EventDetailViewModel.addPayment(amount: Double, method: String, notes: String?, date: String? = null) {
    if (amount < MIN_PAYMENT_AMOUNT) {
        _errorMessage.value = tr(R.string.events_detail_error_positive_amount)
        return
    }
    if (method.isBlank()) {
        _errorMessage.value = tr(R.string.events_detail_error_payment_method_required)
        return
    }
    viewModelScope.launch {
        try {
            val currentEvent = _event.value
            val newPayment = Payment(
                id = "",
                eventId = eventId,
                userId = currentEvent?.userId ?: "",
                amount = amount,
                paymentDate = date ?: java.time.LocalDate.now().toString(),
                paymentMethod = method,
                notes = notes,
                createdAt = ""
            )
            paymentRepository.createPayment(newPayment)
            reloadEventSilently()
            addPaymentSuccess = true
            // Room mutated — refresh home-screen widgets (parity iOS `.solennixPaymentRegistered`).
            widgetSyncTrigger.refreshAll()
        } catch (e: Exception) {
            _errorMessage.value = tr(R.string.events_detail_error_add_payment, e.message.orEmpty())
        }
    }
}

fun EventDetailViewModel.deletePayment(paymentId: String) {
    viewModelScope.launch {
        try {
            paymentRepository.deletePayment(paymentId)
            reloadEventSilently()
            deletePaymentSuccess = true
            // Room mutated — refresh home-screen widgets (parity iOS `.solennixPaymentDeleted`).
            widgetSyncTrigger.refreshAll()
        } catch (e: Exception) {
            _errorMessage.value = tr(R.string.events_detail_error_delete_payment, e.message.orEmpty())
        }
    }
}
