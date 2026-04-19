package com.creapolis.solennix.feature.dashboard.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.data.repository.ClientRepository
import com.creapolis.solennix.core.data.repository.EventRepository
import com.creapolis.solennix.core.data.repository.InventoryRepository
import com.creapolis.solennix.core.data.repository.PaymentRepository
import com.creapolis.solennix.core.data.repository.ProductRepository
import com.creapolis.solennix.core.model.Client
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.EventStatus
import com.creapolis.solennix.core.model.extensions.parseFlexibleDate
import com.creapolis.solennix.core.model.InventoryItem
import com.creapolis.solennix.core.model.Payment
import com.creapolis.solennix.core.model.Plan
import com.creapolis.solennix.core.model.Product
import com.creapolis.solennix.core.network.AuthManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

private const val TAG = "DashboardViewModel"

// Cutoff used to decide whether an event still has a pending payment balance.
// Centralized so detection logic and any UI threshold checks stay in sync.
internal const val MIN_PENDING_AMOUNT: Double = 0.01

private data class DataSnapshot(
    val upcoming: List<Event>,
    val lowStock: List<InventoryItem>,
    val allEvents: List<Event>,
    val allClients: List<Client>,
    val allPayments: List<Payment>,
    val allProducts: List<Product>
)

data class StatusCount(
    val status: EventStatus,
    val count: Int,
    val percentage: Float
)

enum class PendingEventReason {
    PAYMENT_DUE,        // confirmed in next 7 days, balance > 0
    OVERDUE_EVENT,      // past event still quoted/confirmed
    QUOTE_URGENT        // quoted in next 14 days
}

data class PendingEvent(
    val event: Event,
    val reason: PendingEventReason,
    val reasonLabel: String,
    val pendingAmount: Double = 0.0
)

data class DashboardUiState(
    val upcomingEvents: List<Event> = emptyList(),
    val lowStockItems: List<InventoryItem> = emptyList(),
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val revenueThisMonth: Double = 0.0,
    val eventsThisMonth: Int = 0,
    val totalClients: Int = 0,
    val cashCollected: Double = 0.0,
    val vatCollected: Double = 0.0,
    val vatOutstanding: Double = 0.0,
    val pendingQuotes: Int = 0,
    val lowStockCount: Int = 0,
    val isBasicPlan: Boolean = true,
    val pendingEvents: List<PendingEvent> = emptyList(),
    val statusDistribution: List<StatusCount> = emptyList(),
    val userName: String = "",
    val clientMap: Map<String, String> = emptyMap(),
    val hasClients: Boolean = false,
    val hasProducts: Boolean = false,
    val hasEvents: Boolean = false,
    val updatingEventId: String? = null,
    val paymentModalEvent: PendingEvent? = null,
    val transientMessage: String? = null
)

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val eventRepository: EventRepository,
    private val inventoryRepository: InventoryRepository,
    private val clientRepository: ClientRepository,
    private val paymentRepository: PaymentRepository,
    private val productRepository: ProductRepository,
    private val authManager: AuthManager
) : ViewModel() {

    private val _isRefreshing = MutableStateFlow(false)
    private val _updatingEventId = MutableStateFlow<String?>(null)
    private val _paymentModalEvent = MutableStateFlow<PendingEvent?>(null)
    private val _transientMessage = MutableStateFlow<String?>(null)

    private val dataFlow = combine(
        eventRepository.getUpcomingEvents(5),
        inventoryRepository.getLowStockItems(),
        eventRepository.getEvents(),
        clientRepository.getClients(),
        paymentRepository.getPayments()
    ) { upcoming, lowStock, allEvents, allClients, allPayments ->
        DataSnapshot(upcoming, lowStock, allEvents, allClients, allPayments, emptyList())
    }

    private val enrichedDataFlow = combine(
        dataFlow,
        productRepository.getProducts()
    ) { data, allProducts ->
        data.copy(allProducts = allProducts)
    }

    val uiState: StateFlow<DashboardUiState> = combine(
        enrichedDataFlow,
        _isRefreshing,
        _updatingEventId,
        _paymentModalEvent,
        _transientMessage
    ) { data, isRefreshing, updatingEventId, paymentModalEvent, transientMessage ->
        // Basic KPI calculation for this month
        val now = java.time.LocalDate.now()
        val eventsThisMonthList = data.allEvents.filter {
            val date = parseFlexibleDate(it.eventDate)
            date != null && date.month == now.month && date.year == now.year
        }

        val paymentsThisMonth = data.allPayments.filter {
            val date = parseFlexibleDate(it.paymentDate)
            date != null && date.month == now.month && date.year == now.year
        }

        val cashCollected = paymentsThisMonth.sumOf { it.amount }

        // Precompute paid-per-event once: O(payments) instead of O(events × payments)
        // when reused across vatOutstanding and pendingEvents detection below.
        val paidByEvent: Map<String, Double> = data.allPayments
            .groupingBy { it.eventId }
            .fold(0.0) { acc, payment -> acc + payment.amount }

        // VAT Collected: tax portion of payments received this month
        val eventMap = data.allEvents.associateBy { it.id }
        val vatCollected = paymentsThisMonth.sumOf { payment ->
            val event = eventMap[payment.eventId]
            if (event != null && event.taxRate > 0) {
                payment.amount * event.taxRate / (1 + event.taxRate)
            } else {
                0.0
            }
        }

        // VAT Outstanding: tax amount from unpaid balances on active events
        val vatOutstanding = data.allEvents
            .filter { it.status != EventStatus.COMPLETED && it.status != EventStatus.CANCELLED }
            .sumOf { event ->
                val totalPaid = paidByEvent[event.id] ?: 0.0
                val unpaidBalance = (event.totalAmount - totalPaid).coerceAtLeast(0.0)
                if (event.taxRate > 0) {
                    unpaidBalance * event.taxRate / (1 + event.taxRate)
                } else {
                    0.0
                }
            }

        val pendingQuotes = data.allEvents.count { it.status == EventStatus.QUOTED }

        // Pending events — three categories aligned with web Dashboard:
        //   PAYMENT_DUE: confirmed in next 7 days with pending balance
        //   OVERDUE_EVENT: past date, still quoted/confirmed
        //   QUOTE_URGENT: quoted in next 14 days
        val sevenDaysFromNow = now.plusDays(7)
        val fourteenDaysFromNow = now.plusDays(14)
        val pendingEvents = mutableListOf<PendingEvent>()

        data.allEvents.forEach { event ->
            try {
                val eventDate = parseFlexibleDate(event.eventDate) ?: return@forEach
                val totalPaid = paidByEvent[event.id] ?: 0.0
                val pendingAmount = (event.totalAmount - totalPaid).coerceAtLeast(0.0)
                val hasPending = pendingAmount > MIN_PENDING_AMOUNT

                if (event.status == EventStatus.CONFIRMED &&
                    !eventDate.isBefore(now) && !eventDate.isAfter(sevenDaysFromNow) &&
                    hasPending
                ) {
                    pendingEvents.add(
                        PendingEvent(event, PendingEventReason.PAYMENT_DUE, "Cobro por cerrar", pendingAmount)
                    )
                } else if (eventDate.isBefore(now) &&
                    (event.status == EventStatus.QUOTED || event.status == EventStatus.CONFIRMED)
                ) {
                    pendingEvents.add(
                        PendingEvent(event, PendingEventReason.OVERDUE_EVENT, "Evento vencido", pendingAmount)
                    )
                } else if (event.status == EventStatus.QUOTED &&
                    !eventDate.isBefore(now) && !eventDate.isAfter(fourteenDaysFromNow)
                ) {
                    pendingEvents.add(
                        PendingEvent(event, PendingEventReason.QUOTE_URGENT, "Cotización urgente", pendingAmount)
                    )
                }
            } catch (_: Exception) { }
        }

        // Event status distribution
        val totalEvents = data.allEvents.size
        val statusDistribution = EventStatus.entries.map { status ->
            val count = data.allEvents.count { it.status == status }
            StatusCount(
                status = status,
                count = count,
                percentage = if (totalEvents > 0) count.toFloat() / totalEvents else 0f
            )
        }.filter { it.count > 0 }

        val currentPlan = authManager.currentUser.value?.plan ?: Plan.BASIC

        val currentUser = authManager.currentUser.value
        val firstName = currentUser?.name?.split(" ")?.firstOrNull() ?: ""
        val clientMap = data.allClients.associate { it.id to it.name }

        DashboardUiState(
            upcomingEvents = data.upcoming,
            lowStockItems = data.lowStock,
            lowStockCount = data.lowStock.size,
            isLoading = false,
            isRefreshing = isRefreshing,
            revenueThisMonth = eventsThisMonthList.sumOf { it.totalAmount },
            eventsThisMonth = eventsThisMonthList.size,
            totalClients = data.allClients.size,
            cashCollected = cashCollected,
            vatCollected = vatCollected,
            vatOutstanding = vatOutstanding,
            pendingQuotes = pendingQuotes,
            isBasicPlan = currentPlan == Plan.BASIC,
            pendingEvents = pendingEvents,
            statusDistribution = statusDistribution,
            userName = firstName,
            clientMap = clientMap,
            hasClients = data.allClients.isNotEmpty(),
            hasProducts = data.allProducts.isNotEmpty(),
            hasEvents = data.allEvents.isNotEmpty(),
            updatingEventId = updatingEventId,
            paymentModalEvent = paymentModalEvent,
            transientMessage = transientMessage
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = DashboardUiState(isLoading = true)
    )

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _isRefreshing.value = true
            try {
                eventRepository.syncEvents()
                inventoryRepository.syncInventory()
                clientRepository.syncClients()
                paymentRepository.syncPayments()
                productRepository.syncProducts()
            } catch (e: Exception) {
                // Network sync errors are non-fatal
            } finally {
                _isRefreshing.value = false
            }
        }
    }

    fun openPaymentModal(pendingEvent: PendingEvent) {
        _paymentModalEvent.value = pendingEvent
    }

    fun dismissPaymentModal() {
        _paymentModalEvent.value = null
    }

    fun consumeTransientMessage() {
        _transientMessage.value = null
    }

    fun updateEventStatus(eventId: String, newStatus: EventStatus) {
        viewModelScope.launch {
            _updatingEventId.value = eventId
            try {
                val event = eventRepository.getEvent(eventId) ?: return@launch
                eventRepository.updateEvent(event.copy(status = newStatus))
                _transientMessage.value = when (newStatus) {
                    EventStatus.COMPLETED -> "Evento marcado como completado"
                    EventStatus.CANCELLED -> "Evento cancelado"
                    else -> null
                }
            } catch (e: Exception) {
                Log.e(TAG, "updateEventStatus failed for event=$eventId", e)
                _transientMessage.value = "No pudimos actualizar el estado del evento. Reintentá en un momento."
            } finally {
                _updatingEventId.value = null
            }
        }
    }

    fun registerPayment(
        pendingEvent: PendingEvent,
        amount: Double,
        method: String,
        notes: String?,
        date: String,
        autoComplete: Boolean
    ) {
        if (amount <= 0 || method.isBlank()) {
            _transientMessage.value = "Monto y método de pago son requeridos"
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
                        _transientMessage.value = "Pago registrado y evento completado"
                    } catch (statusErr: Exception) {
                        Log.w(TAG, "Auto-complete after payment failed for event=${pendingEvent.event.id}", statusErr)
                        _transientMessage.value = "Pago registrado. Marcá el evento como completado manualmente."
                    }
                } else {
                    _transientMessage.value = "Pago registrado correctamente"
                }
                _paymentModalEvent.value = null
            } catch (e: Exception) {
                Log.e(TAG, "registerPayment failed for event=${pendingEvent.event.id}", e)
                _transientMessage.value = "No pudimos registrar el pago. Reintentá en un momento."
            } finally {
                _updatingEventId.value = null
            }
        }
    }
}
