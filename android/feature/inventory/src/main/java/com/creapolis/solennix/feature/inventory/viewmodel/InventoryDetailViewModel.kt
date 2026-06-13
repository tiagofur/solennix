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
import kotlinx.coroutines.CancellationException
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
    /** Precomputed once when entries are set — avoids repeated LocalDate.parse on every access (fix #15). */
    val demand7Days: Double = 0.0,
    val stockAfter7Days: Double = 0.0,
    val isLoading: Boolean = false,
    val errorMessage: String? = null
) {
    val isLowStock: Boolean
        get() = item?.let { it.minimumStock > 0 && it.currentStock < it.minimumStock } ?: false

    val stockValue: Double
        get() = item?.let { (it.unitCost ?: 0.0) * it.currentStock } ?: 0.0

    val totalDemand: Double
        get() = demandEntries.sumOf { it.quantity }
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

    /** Reset after delete-success has been consumed by the UI. */
    fun consumeDeleteSuccess() {
        deleteSuccess = false
    }

    /** Reset after adjustment-success has been consumed by the UI. */
    fun consumeAdjustmentSuccess() {
        adjustmentSuccess = false
    }

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
                // Capture now ONCE — avoids midnight race if the function spans midnight
                val nowDate = LocalDate.now()
                val nowString = nowDate.toString()

                val events = eventRepository.getEventsFromApi()
                val upcomingEvents = events.filter {
                    it.eventDate >= nowString && it.status == EventStatus.CONFIRMED
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
                                        // Optimistic read outside the lock — avoids holding the
                                        // Mutex across the network call (fix #14).
                                        val cached = cacheLock.withLock { ingredientsCache[ep.productId] }
                                        val ingredients = if (cached != null) {
                                            cached
                                        } else {
                                            // Fetch OUTSIDE the lock so concurrent coroutines can
                                            // make progress. Then double-check under lock before insert
                                            // to handle the rare concurrent-fetch race.
                                            val fetched = try {
                                                productRepository.getProductIngredients(ep.productId)
                                            } catch (e: CancellationException) {
                                                throw e
                                            } catch (_: Exception) {
                                                emptyList()
                                            }
                                            cacheLock.withLock {
                                                ingredientsCache.getOrPut(ep.productId) { fetched }
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
                                            eventName = event.serviceType,
                                            quantity = eventDemand,
                                            unit = item.unit
                                        )
                                    } else null
                                } catch (e: CancellationException) {
                                    throw e
                                } catch (_: Exception) {
                                    null
                                }
                            }
                        }
                    }.awaitAll().filterNotNull()
                }

                val sortedEntries = demandEntries.sortedBy { it.eventDate }
                // Reuse the nowDate captured above — avoids a second LocalDate.now() call
                // after network awaits (midnight race fix).
                val in7Days = nowDate.plusDays(7)
                val computed7Days = sortedEntries.filter { entry ->
                    try {
                        val date = LocalDate.parse(entry.eventDate)
                        !date.isBefore(nowDate) && !date.isAfter(in7Days)
                    } catch (_: Exception) { false }
                }.sumOf { it.quantity }
                val computedStockAfter7Days = (_uiState.value.item?.currentStock ?: 0.0) - computed7Days

                _uiState.value = _uiState.value.copy(
                    demandEntries = sortedEntries,
                    demand7Days = computed7Days,
                    stockAfter7Days = computedStockAfter7Days
                )
            } catch (e: CancellationException) {
                throw e
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

    /** Clears [InventoryDetailUiState.errorMessage] after it has been shown in the UI. */
    fun onErrorShown() {
        _uiState.value = _uiState.value.copy(errorMessage = null)
    }
}
