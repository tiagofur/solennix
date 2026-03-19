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
import com.creapolis.solennix.core.model.InventoryItem
import com.creapolis.solennix.core.model.Payment
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

data class DashboardUiState(
    val upcomingEvents: List<Event> = emptyList(),
    val lowStockItems: List<InventoryItem> = emptyList(),
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val revenueThisMonth: Double = 0.0,
    val eventsThisMonth: Int = 0,
    val totalClients: Int = 0,
    val cashCollected: Double = 0.0,
    val pendingQuotes: Int = 0
)

@HiltViewModel
class DashboardViewModel @Inject constructor(
    private val eventRepository: EventRepository,
    private val inventoryRepository: InventoryRepository,
    private val clientRepository: ClientRepository,
    private val paymentRepository: PaymentRepository
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
            try {
                val date = java.time.ZonedDateTime.parse(it.eventDate)
                date.month == now.month && date.year == now.year
            } catch (e: Exception) { false }
        }

        val cashCollected = data.allPayments.filter {
            try {
                val date = java.time.ZonedDateTime.parse(it.paymentDate)
                date.month == now.month && date.year == now.year
            } catch (e: Exception) { false }
        }.sumOf { it.amount }

        val pendingQuotes = data.allEvents.count { it.status == EventStatus.QUOTED }

        DashboardUiState(
            upcomingEvents = data.upcoming,
            lowStockItems = data.lowStock,
            isLoading = false,
            isRefreshing = isRefreshing,
            revenueThisMonth = eventsThisMonthList.sumOf { it.totalAmount },
            eventsThisMonth = eventsThisMonthList.size,
            totalClients = data.allClients.size,
            cashCollected = cashCollected,
            pendingQuotes = pendingQuotes
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
