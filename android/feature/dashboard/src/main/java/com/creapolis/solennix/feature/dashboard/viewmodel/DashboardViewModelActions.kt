package com.creapolis.solennix.feature.dashboard.viewmodel

import android.util.Log
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.feature.dashboard.R
import com.creapolis.solennix.core.designsystem.R as DesignSystemR
import com.creapolis.solennix.core.model.EventStatus
import com.creapolis.solennix.core.model.Payment
import kotlinx.coroutines.launch

private const val TAG = "DashboardViewModelActions"

fun DashboardViewModel.openPaymentModal(pendingEvent: PendingEvent) {
    _paymentModalEvent.value = pendingEvent
}

fun DashboardViewModel.dismissPaymentModal() {
    _paymentModalEvent.value = null
}

fun DashboardViewModel.consumeTransientMessage() {
    _transientMessage.value = null
}

fun DashboardViewModel.updateEventStatus(eventId: String, newStatus: EventStatus) {
    viewModelScope.launch {
        _updatingEventId.value = eventId
        try {
            val event = eventRepository.getEvent(eventId) ?: return@launch
            eventRepository.updateEvent(event.copy(status = newStatus))
            // Room was mutated — refresh home-screen widgets (parity iOS `.solennixEventUpdated`).
            widgetSyncTrigger.refreshAll()
            _transientMessage.value = when (newStatus) {
                EventStatus.COMPLETED -> tr(R.string.dashboard_message_event_completed)
                EventStatus.CANCELLED -> tr(R.string.dashboard_message_event_cancelled)
                else -> null
            }
        } catch (e: Exception) {
            Log.e(TAG, "updateEventStatus failed for event=$eventId", e)
            if (e is com.creapolis.solennix.core.network.SolennixException.CompletionBlocked) {
                val amount = String.format("%.2f", e.remaining)
                _transientMessage.value = tr(DesignSystemR.string.events_error_balance_pending, amount)
            } else {
                _transientMessage.value = tr(R.string.dashboard_error_status_change_failed)
            }
        } finally {
            _updatingEventId.value = null
        }
    }
}

fun DashboardViewModel.registerPayment(
    pendingEvent: PendingEvent,
    amount: Double,
    method: String,
    notes: String?,
    date: String,
    autoComplete: Boolean
) {
    if (amount < MIN_PENDING_AMOUNT || method.isBlank()) {
        _transientMessage.value = tr(R.string.dashboard_error_payment_requirements)
        return
    }
    // Auto-complete only when the entered amount actually settles the
    // pending balance. Without this guard a partial payment in a
    // "Pagar y completar" flow would mark the event as completed while
    // still leaving an outstanding balance.
    val shouldAutoComplete =
        autoComplete && amount >= (pendingEvent.pendingAmount - MIN_PENDING_AMOUNT)
    viewModelScope.launch {
        _updatingEventId.value = pendingEvent.event.id
        try {
            val newPayment = Payment(
                id = "",
                eventId = pendingEvent.event.id,
                userId = pendingEvent.event.userId,
                amount = amount,
                paymentDate = date,
                paymentMethod = method,
                notes = notes,
                createdAt = ""
            )
            paymentRepository.createPayment(newPayment)

            if (shouldAutoComplete) {
                try {
                    val refreshed = eventRepository.getEvent(pendingEvent.event.id) ?: pendingEvent.event
                    eventRepository.updateEvent(refreshed.copy(status = EventStatus.COMPLETED))
                    _transientMessage.value = tr(R.string.dashboard_message_payment_registered_and_completed)
                } catch (statusErr: Exception) {
                    Log.w(TAG, "Auto-complete after payment failed for event=${pendingEvent.event.id}", statusErr)
                    _transientMessage.value = tr(R.string.dashboard_message_payment_complete_manual)
                }
            } else {
                _transientMessage.value = tr(R.string.dashboard_message_payment_registered)
            }
            _paymentModalEvent.value = null
            // Room was mutated (payment insert + optional event status change) — refresh
            // home-screen widgets so KPIs/upcoming reflect the new state without waiting
            // for SyncWorker or the next foreground. Mirrors iOS `.solennixPaymentRegistered`.
            widgetSyncTrigger.refreshAll()
        } catch (e: Exception) {
            Log.e(TAG, "registerPayment failed for event=${pendingEvent.event.id}", e)
            _transientMessage.value = tr(R.string.dashboard_error_payment_failed)
        } finally {
            _updatingEventId.value = null
        }
    }
}
