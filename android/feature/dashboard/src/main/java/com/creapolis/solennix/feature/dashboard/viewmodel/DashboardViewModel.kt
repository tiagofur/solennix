package com.creapolis.solennix.feature.dashboard.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.data.repository.ClientRepository
import com.creapolis.solennix.core.data.repository.EventRepository
import com.creapolis.solennix.core.data.repository.InventoryRepository
import com.creapolis.solennix.core.data.repository.PaymentRepository
import com.creapolis.solennix.core.model.Client
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.EventStatus
import com.creapolis.solennix.core.model.extensions.parseFlexibleDate
import com.creapolis.solennix.core.model.InventoryItem
import com.creapolis.solennix.core.model.Payment
import com.creapolis.solennix.core.model.Plan
import com.creapolis.solennix.core.network.AuthManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

private data class DataSnapshot(
    val upcoming: List<Event>,
    val lowStock: List<InventoryItem>,
    val allEvents: List<Event>,
    val allClients: List<Client>,
    val allPayments: List<Payment>
)

data class StatusCount(
    val status: EventStatus,
    val count: Int,
    val percentage: Float
)

data class PendingEvent(
    val event: Event,
    val reason: String
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
    val clientMap: Map<String, String> = emptyMap()
)

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val eventRepository: EventRepository,
    private val inventoryRepository: InventoryRepository,
    private val clientRepository: ClientRepository,
    private val paymentRepository: PaymentRepository,
    private val authManager: AuthManager
) : ViewModel() {

    private val _isRefreshing = MutableStateFlow(false)

    private val dataFlow = combine(
        eventRepository.getUpcomingEvents(5),
        inventoryRepository.getLowStockItems(),
        eventRepository.getEvents(),
        clientRepository.getClients(),
        paymentRepository.getPayments()
    ) { upcoming, lowStock, allEvents, allClients, allPayments ->
        DataSnapshot(upcoming, lowStock, allEvents, allClients, allPayments)
    }

    val uiState: StateFlow<DashboardUiState> = combine(
        dataFlow,
        _isRefreshing
    ) { data, isRefreshing ->
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
                val totalPaid = data.allPayments
                    .filter { it.eventId == event.id }
                    .sumOf { it.amount }
                val unpaidBalance = (event.totalAmount - totalPaid).coerceAtLeast(0.0)
                if (event.taxRate > 0) {
                    unpaidBalance * event.taxRate / (1 + event.taxRate)
                } else {
                    0.0
                }
            }

        val pendingQuotes = data.allEvents.count { it.status == EventStatus.QUOTED }

        // Pending events: upcoming within 7 days not fully paid + past-date events still quoted/confirmed
        val sevenDaysFromNow = now.plusDays(7)
        val pendingEvents = mutableListOf<PendingEvent>()

        data.allEvents.forEach { event ->
            try {
                val eventDate = parseFlexibleDate(event.eventDate) ?: return@forEach
                val totalPaid = data.allPayments
                    .filter { it.eventId == event.id }
                    .sumOf { it.amount }
                val isFullyPaid = totalPaid >= event.totalAmount

                // Upcoming within 7 days but not fully paid
                if (!eventDate.isBefore(now) && !eventDate.isAfter(sevenDaysFromNow) &&
                    !isFullyPaid && event.status != EventStatus.COMPLETED && event.status != EventStatus.CANCELLED
                ) {
                    pendingEvents.add(PendingEvent(event, "Pago pendiente"))
                }
                // Past date but still quoted or confirmed
                else if (eventDate.isBefore(now) &&
                    (event.status == EventStatus.QUOTED || event.status == EventStatus.CONFIRMED)
                ) {
                    pendingEvents.add(PendingEvent(event, "Evento vencido"))
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
            clientMap = clientMap
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
            } catch (e: Exception) {
                // Network sync errors are non-fatal
            } finally {
                _isRefreshing.value = false
            }
        }
    }
}
