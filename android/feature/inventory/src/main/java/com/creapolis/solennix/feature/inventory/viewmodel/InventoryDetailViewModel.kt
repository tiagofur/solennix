package com.creapolis.solennix.feature.inventory.viewmodel

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.data.repository.EventRepository
import com.creapolis.solennix.core.data.repository.InventoryRepository
import com.creapolis.solennix.core.data.repository.ProductRepository
import com.creapolis.solennix.core.model.EventStatus
import com.creapolis.solennix.core.model.InventoryItem
import com.creapolis.solennix.core.model.InventoryType
import com.creapolis.solennix.feature.inventory.InventoryStrings
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.sync.withPermit
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import javax.inject.Inject

data class InventoryDemandEntry(
    val eventId: String,
    val eventDate: String,
    val eventName: String,
    val quantity: Double,
    val unit: String
)

data class InventoryDetailUiState(
    val item: InventoryItem? = null,
    val demandEntries: List<InventoryDemandEntry> = emptyList(),
    val isLoading: Boolean = false,
    val errorMessage: String? = null
) {
    val isLowStock: Boolean
        get() = item?.let { it.minimumStock > 0 && it.currentStock < it.minimumStock } ?: false

    val stockValue: Double
        get() = item?.let { (it.unitCost ?: 0.0) * it.currentStock } ?: 0.0

    val totalDemand: Double
        get() = demandEntries.sumOf { it.quantity }

    val demand7Days: Double
        get() {
            val today = LocalDate.now()
            val in7Days = today.plusDays(7)
            return demandEntries.filter { entry ->
                try {
                    val date = LocalDate.parse(entry.eventDate)
                    !date.isBefore(today) && !date.isAfter(in7Days)
                } catch (_: Exception) { false }
            }.sumOf { it.quantity }
        }

    val stockAfter7Days: Double
        get() = (item?.currentStock ?: 0.0) - demand7Days
}

@HiltViewModel
class InventoryDetailViewModel @Inject constructor(
    private val inventoryRepository: InventoryRepository,
    private val eventRepository: EventRepository,
    private val productRepository: ProductRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val itemId: String = checkNotNull(savedStateHandle["itemId"])

    private val _uiState = MutableStateFlow(InventoryDetailUiState(isLoading = true))
    val uiState: StateFlow<InventoryDetailUiState> = _uiState.asStateFlow()

    init {
        loadItem()
    }

    var deleteSuccess by mutableStateOf(false)
        private set

    var adjustmentSuccess by mutableStateOf(false)
        private set

    private fun loadItem() {
        viewModelScope.launch {
            try {
                val item = inventoryRepository.getInventoryItem(itemId)
                _uiState.value = InventoryDetailUiState(item = item, isLoading = false)
                loadDemandForecast()
            } catch (e: Exception) {
                _uiState.value = InventoryDetailUiState(errorMessage = e.message, isLoading = false)
            }
        }
    }

    private fun loadDemandForecast() {
        viewModelScope.launch {
            try {
                val today = LocalDate.now().toString()
                val events = eventRepository.getEventsFromApi()
                val upcomingEvents = events.filter {
                    it.eventDate >= today && it.status == EventStatus.CONFIRMED
                }

                val item = _uiState.value.item ?: return@launch

                // Cache ingredients by productId: the same product frequently appears
                // across multiple upcoming events, so fetching once per product (not
                // once per event*product) cuts duplicate API calls.
                val ingredientsCache = mutableMapOf<String, List<com.creapolis.solennix.core.model.ProductIngredient>>()
                val cacheLock = Mutex()
                // Cap in-flight event-product fetches so we don't spike the server on
                // users with large backlogs. 4 is a compromise between latency and load.
                val semaphore = Semaphore(permits = 4)

                val demandEntries = coroutineScope {
                    upcomingEvents.map { event ->
                        async {
                            semaphore.withPermit {
                                try {
                                    val eventProducts = eventRepository.getEventProductsFromApi(event.id)
                                    var eventDemand = 0.0
                                    for (ep in eventProducts) {
                                        val ingredients = cacheLock.withLock {
                                            ingredientsCache.getOrPut(ep.productId) {
                                                try {
                                                    productRepository.getProductIngredients(ep.productId)
                                                } catch (_: Exception) {
                                                    emptyList()
                                                }
                                            }
                                        }
                                        val matching = ingredients.find { it.inventoryId == itemId }
                                        if (matching != null) {
                                            // Supplies have fixed per-event quantity, not scaled by product qty
                                            eventDemand += if (item.type == InventoryType.SUPPLY) {
                                                matching.quantityRequired
                                            } else {
                                                matching.quantityRequired * ep.quantity
                                            }
                                        }
                                    }
                                    if (eventDemand > 0) {
                                        InventoryDemandEntry(
                                            eventId = event.id,
                                            eventDate = event.eventDate.take(10),
                                            eventName = event.serviceType ?: InventoryStrings.fallbackEvent,
                                            quantity = eventDemand,
                                            unit = item.unit
                                        )
                                    } else null
                                } catch (_: Exception) {
                                    null
                                }
                            }
                        }
                    }.awaitAll().filterNotNull()
                }

                _uiState.value = _uiState.value.copy(
                    demandEntries = demandEntries.sortedBy { it.eventDate }
                )
            } catch (_: Exception) {
                // Demand forecast is supplementary
            }
        }
    }

    fun adjustStock(newStock: Double) {
        viewModelScope.launch {
            try {
                val current = _uiState.value.item ?: return@launch
                val updated = current.copy(currentStock = newStock.coerceAtLeast(0.0))
                inventoryRepository.updateInventoryItem(updated)
                _uiState.value = _uiState.value.copy(item = updated)
                adjustmentSuccess = true
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    errorMessage = InventoryStrings.adjustStockError(e.message)
                )
            }
        }
    }

    fun deleteItem() {
        viewModelScope.launch {
            try {
                inventoryRepository.deleteInventoryItem(itemId)
                deleteSuccess = true
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(errorMessage = InventoryStrings.deleteError(e.message))
            }
        }
    }
}
