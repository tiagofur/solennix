package com.creapolis.solennix.feature.products.viewmodel

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import com.creapolis.solennix.core.data.repository.ClientRepository
import com.creapolis.solennix.core.data.repository.EventRepository
import com.creapolis.solennix.core.data.repository.ProductRepository
import com.creapolis.solennix.core.model.Product
import com.creapolis.solennix.core.model.ProductIngredient
import com.creapolis.solennix.core.model.InventoryType
import com.creapolis.solennix.feature.products.ProductStrings
import com.creapolis.solennix.feature.products.ui.DemandDataPoint
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit
import java.time.LocalDate
import javax.inject.Inject

data class ProductDetailUiState(
    val product: Product? = null,
    val ingredients: List<ProductIngredient> = emptyList(),
    val isLoading: Boolean = false,
    val errorMessage: String? = null
) {
    val ingredientItems: List<ProductIngredient>
        get() = ingredients.filter { it.type == InventoryType.INGREDIENT }

    val supplyItems: List<ProductIngredient>
        get() = ingredients.filter { it.type == InventoryType.SUPPLY }

    val equipmentItems: List<ProductIngredient>
        get() = ingredients.filter { it.type == InventoryType.EQUIPMENT }

    val unitCost: Double
        get() = ingredientItems.sumOf { it.quantityRequired * (it.unitCost ?: 0.0) }

    val perEventCost: Double
        get() = supplyItems.sumOf { it.quantityRequired * (it.unitCost ?: 0.0) }

    /**
     * Estimated margin as a percentage, or null when there is no recipe/supply data
     * at all (showing 100% with no cost data is misleading — null renders as "—").
     * Cost basis = ingredient cost (unitCost) + per-event supply cost (perEventCost),
     * mirroring iOS EventFinancials where both ingredient and supply rows contribute.
     */
    val margin: Double?
        get() {
            val price = product?.basePrice ?: 0.0
            if (price <= 0) return null
            // Only compute a margin if there is at least one recipe or supply item
            if (ingredientItems.isEmpty() && supplyItems.isEmpty()) return null
            val totalCost = unitCost + perEventCost
            return ((price - totalCost) / price) * 100
        }
}

@HiltViewModel
class ProductDetailViewModel @Inject constructor(
    private val productRepository: ProductRepository,
    private val eventRepository: EventRepository,
    private val clientRepository: ClientRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val productId: String = checkNotNull(savedStateHandle["productId"])

    private val _uiState = MutableStateFlow(ProductDetailUiState(isLoading = true))
    val uiState: StateFlow<ProductDetailUiState> = _uiState.asStateFlow()

    private val _demandData = MutableStateFlow<List<DemandDataPoint>>(emptyList())
    val demandData: StateFlow<List<DemandDataPoint>> = _demandData.asStateFlow()

    /** Today's date anchored at load time — avoids repeated LocalDate.now() in composition. */
    val todayDate: LocalDate = LocalDate.now()

    var deleteSuccess by mutableStateOf(false)
        private set

    /** Reset after the delete-success side effect has been consumed by the UI. */
    fun consumeDeleteSuccess() {
        deleteSuccess = false
    }

    init {
        loadProduct()
        loadDemandData()
    }

    private var loadProductJob: kotlinx.coroutines.Job? = null
    private var loadDemandJob: kotlinx.coroutines.Job? = null

    fun refresh() {
        loadProduct()
        loadDemandData()
    }

    private fun loadProduct() {
        loadProductJob?.cancel()
        loadProductJob = viewModelScope.launch {
            try {
                val product = productRepository.getProduct(productId)
                val ingredients = try {
                    productRepository.getProductIngredients(productId)
                } catch (e: CancellationException) {
                    throw e
                } catch (_: Exception) {
                    emptyList()
                }
                _uiState.update {
                    it.copy(
                        product = product,
                        ingredients = ingredients,
                        isLoading = false
                    )
                }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        errorMessage = e.message,
                        isLoading = false
                    )
                }
            }
        }
    }

    /** Sealed result type so each child async returns success/failure without shared mutation. */
    private sealed interface DemandResult {
        data class Success(val point: DemandDataPoint?) : DemandResult // null = product not in this event (still a success)
        object Failure : DemandResult
    }

    private fun loadDemandData() {
        loadDemandJob?.cancel()
        loadDemandJob = viewModelScope.launch {
            try {
                val today = todayDate.toString()

                val events = eventRepository.getEventsFromApi()
                val upcomingEvents = events.filter {
                    it.eventDate >= today && it.status == com.creapolis.solennix.core.model.EventStatus.CONFIRMED
                }

                // Cap concurrent event-product fetches to avoid hammering the server.
                val semaphore = Semaphore(permits = 6)

                val results: List<DemandResult> = coroutineScope {
                    upcomingEvents.map { event ->
                        async {
                            semaphore.withPermit {
                                try {
                                    val eventProducts = eventRepository.getEventProductsFromApi(event.id)
                                    val matchingProduct = eventProducts.find { it.productId == productId }

                                    if (matchingProduct != null) {
                                        // Client fetch is independent — run in parallel
                                        val clientDeferred = async {
                                            try {
                                                clientRepository.getClient(event.clientId)
                                            } catch (e: CancellationException) {
                                                throw e
                                            } catch (_: Exception) {
                                                null
                                            }
                                        }
                                        val client = clientDeferred.await()
                                        val clientName = client?.name ?: ProductStrings.fallbackClient

                                        DemandResult.Success(
                                            DemandDataPoint(
                                                eventId = event.id,
                                                eventDate = event.eventDate,
                                                clientName = clientName,
                                                // Preserve fractional quantities — do NOT truncate to Int
                                                quantity = matchingProduct.quantity,
                                                numPeople = event.numPeople,
                                                unitPrice = matchingProduct.unitPrice
                                            )
                                        )
                                    } else {
                                        // Product not in this event — counts as success (zero-demand)
                                        DemandResult.Success(null)
                                    }
                                } catch (e: CancellationException) {
                                    throw e
                                } catch (_: Exception) {
                                    DemandResult.Failure
                                }
                            }
                        }
                    }.awaitAll()
                }

                // Tally after awaitAll — single-threaded, no shared mutation inside children
                val successCount = results.count { it is DemandResult.Success }
                val failCount = results.count { it is DemandResult.Failure }
                val demandPoints = results.filterIsInstance<DemandResult.Success>()
                    .mapNotNull { it.point }

                // Only surface an error if every single event fetch failed (genuine
                // network outage). Partial failures are silently skipped — mirrors iOS
                // DemandFetchResult pattern.
                if (failCount > 0 && successCount == 0 && upcomingEvents.isNotEmpty()) {
                    _uiState.value = _uiState.value.copy(
                        errorMessage = ProductStrings.loadDataError(null)
                    )
                }

                _demandData.value = demandPoints.sortedBy { it.eventDate }
            } catch (e: CancellationException) {
                throw e
            } catch (_: Exception) {
                _demandData.value = emptyList()
            }
        }
    }

    fun deleteProduct() {
        viewModelScope.launch {
            try {
                productRepository.deleteProduct(productId)
                deleteSuccess = true
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(errorMessage = ProductStrings.deleteError(e.message))
            }
        }
    }

    /** Clears [ProductDetailUiState.errorMessage] after it has been shown in the UI. */
    fun onErrorShown() {
        _uiState.value = _uiState.value.copy(errorMessage = null)
    }
}
