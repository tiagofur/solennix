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
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
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

    val margin: Double
        get() {
            val price = product?.basePrice ?: 0.0
            return if (price > 0) ((price - unitCost) / price) * 100 else 0.0
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

    var deleteSuccess by mutableStateOf(false)
        private set

    init {
        loadProduct()
        loadDemandData()
    }

    private fun loadProduct() {
        viewModelScope.launch {
            try {
                val product = productRepository.getProduct(productId)
                val ingredients = try {
                    productRepository.getProductIngredients(productId)
                } catch (_: Exception) {
                    emptyList()
                }
                _uiState.value = ProductDetailUiState(
                    product = product,
                    ingredients = ingredients,
                    isLoading = false
                )
            } catch (e: Exception) {
                _uiState.value = ProductDetailUiState(errorMessage = e.message, isLoading = false)
            }
        }
    }

    private fun loadDemandData() {
        viewModelScope.launch {
            try {
                val today = LocalDate.now().toString()

                val events = eventRepository.getEventsFromApi()
                val upcomingEvents = events.filter { it.eventDate >= today && it.status == com.creapolis.solennix.core.model.EventStatus.CONFIRMED }

                val demandPoints = mutableListOf<DemandDataPoint>()

                for (event in upcomingEvents) {
                    try {
                        val eventProducts = eventRepository.getEventProductsFromApi(event.id)
                        val matchingProduct = eventProducts.find { it.productId == productId }

                        if (matchingProduct != null) {
                            val client = clientRepository.getClient(event.clientId)
                            val clientName = client?.name ?: ProductStrings.fallbackClient

                            demandPoints.add(
                                DemandDataPoint(
                                    eventId = event.id,
                                    eventDate = event.eventDate,
                                    clientName = clientName,
                                    quantity = matchingProduct.quantity.toInt(),
                                    numPeople = event.numPeople,
                                    unitPrice = matchingProduct.unitPrice
                                )
                            )
                        }
                    } catch (_: Exception) {
                        continue
                    }
                }

                _demandData.value = demandPoints.sortedBy { it.eventDate }
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
}
