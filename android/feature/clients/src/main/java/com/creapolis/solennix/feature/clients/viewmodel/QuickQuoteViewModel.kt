package com.creapolis.solennix.feature.clients.viewmodel

import android.content.Context
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.data.repository.ClientRepository
import com.creapolis.solennix.core.data.repository.ProductRepository
import com.creapolis.solennix.core.model.Client
import com.creapolis.solennix.core.model.DiscountType
import com.creapolis.solennix.core.model.InventoryType
import com.creapolis.solennix.core.model.Product
import com.creapolis.solennix.core.model.ProductIngredient
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.get
import com.creapolis.solennix.core.network.post
import com.creapolis.solennix.core.network.put
import com.creapolis.solennix.core.network.AuthManager
import com.creapolis.solennix.core.network.Endpoints
import com.creapolis.solennix.feature.clients.R
import com.creapolis.solennix.feature.clients.pdf.QuickQuotePdfGenerator
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.io.File
import java.util.UUID
import javax.inject.Inject

data class QuoteItem(
    val id: String = UUID.randomUUID().toString(),
    val productId: String = "",
    val productName: String = "",
    val quantity: Int = 1,
    val unitPrice: Double = 0.0
) {
    val subtotal: Double get() = quantity * unitPrice
}

data class QuoteExtra(
    val id: String = UUID.randomUUID().toString(),
    val description: String = "",
    val price: Double = 0.0,
    val cost: Double = 0.0,
    val excludeUtility: Boolean = false
)

data class QuickQuoteUiState(
    val products: List<Product> = emptyList(),
    val client: Client? = null,
    val selectedItems: List<QuoteItem> = listOf(QuoteItem()),
    val extras: List<QuoteExtra> = emptyList(),
    val numPeople: String = "",
    val requiresInvoice: Boolean = false,
    val taxRate: String = "16",
    val discount: String = "",
    val discountType: DiscountType = DiscountType.PERCENT,
    val productUnitCosts: Map<String, Double> = emptyMap(),
    val isLoading: Boolean = false,
    val isGeneratingPdf: Boolean = false,
    val errorMessage: String? = null,
    val generatedPdfFile: File? = null,
    val clientName: String = "",
    val clientPhone: String = "",
    val clientEmail: String = "",
    val showClientInfo: Boolean = false
) {
    val subtotalProducts: Double
        get() = selectedItems.sumOf { it.subtotal }

    val normalExtrasTotal: Double
        get() = extras.filter { !it.excludeUtility }.sumOf { it.price }

    val passThroughExtrasTotal: Double
        get() = extras.filter { it.excludeUtility }.sumOf { it.price }

    val extrasTotal: Double
        get() = extras.sumOf { it.price }

    val subtotal: Double
        get() = subtotalProducts + extrasTotal

    val discountableBase: Double
        get() = subtotalProducts + normalExtrasTotal

    val discountAmount: Double
        get() {
            val discountValue = discount.toDoubleOrNull() ?: 0.0
            return when (discountType) {
                DiscountType.PERCENT -> discountableBase * discountValue / 100.0
                DiscountType.FIXED -> discountValue.coerceAtMost(discountableBase)
            }
        }

    val taxAmount: Double
        get() {
            if (!requiresInvoice) return 0.0
            val rate = taxRate.toDoubleOrNull() ?: 0.0
            val discountedBase = discountableBase - discountAmount
            return (discountedBase + passThroughExtrasTotal) * rate / 100.0
        }

    val total: Double
        get() {
            val discountedBase = discountableBase - discountAmount
            return discountedBase + passThroughExtrasTotal + taxAmount
        }

    // Profitability
    val costProducts: Double
        get() = selectedItems.sumOf { (productUnitCosts[it.productId] ?: 0.0) * it.quantity }

    val costExtras: Double
        get() = extras.filter { !it.excludeUtility }.sumOf { it.cost }

    val totalCosts: Double
        get() = costProducts + costExtras

    val revenue: Double
        get() = total - taxAmount

    val netProfit: Double
        get() = revenue - totalCosts

    val profitMargin: Double
        get() {
            val adjustedRevenue = revenue - passThroughExtrasTotal
            return if (adjustedRevenue > 0) (netProfit / adjustedRevenue) * 100 else 0.0
        }

    val hasCosts: Boolean
        get() = totalCosts > 0
}

@HiltViewModel
class QuickQuoteViewModel @Inject constructor(
    private val productRepository: ProductRepository,
    private val clientRepository: ClientRepository,
    private val apiService: ApiService,
    private val authManager: AuthManager,
    @ApplicationContext private val appContext: Context,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val clientId: String? = savedStateHandle["clientId"]

    private val _uiState = MutableStateFlow(QuickQuoteUiState(isLoading = true))
    val uiState: StateFlow<QuickQuoteUiState> = _uiState.asStateFlow()

    init {
        loadData()
    }

    private fun loadData() {
        viewModelScope.launch {
            try {
                // Sync products from network first
                try {
                    productRepository.syncProducts()
                } catch (_: Exception) {
                    // Use cached data if sync fails
                }

                val products = productRepository.getProducts().first()
                val client = clientId?.let { clientRepository.getClient(it) }

                _uiState.update {
                    it.copy(
                        products = products.filter { p -> p.isActive },
                        client = client,
                        isLoading = false
                    )
                }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        errorMessage = e.message ?: appContext.getString(R.string.clients_quick_quote_load_error),
                        isLoading = false
                    )
                }
            }
        }
    }

    fun updateNumPeople(value: String) {
        _uiState.update { it.copy(numPeople = value) }
    }

    fun addItem() {
        _uiState.update { state ->
            state.copy(selectedItems = state.selectedItems + QuoteItem())
        }
    }

    fun removeItem(itemId: String) {
        _uiState.update { state ->
            val items = state.selectedItems.filter { it.id != itemId }
            state.copy(selectedItems = items.ifEmpty { listOf(QuoteItem()) })
        }
    }

    fun updateItemProduct(itemId: String, product: Product) {
        _uiState.update { state ->
            state.copy(
                selectedItems = state.selectedItems.map { item ->
                    if (item.id == itemId) {
                        item.copy(
                            productId = product.id,
                            productName = product.name,
                            unitPrice = product.basePrice
                        )
                    } else item
                }
            )
        }
        fetchProductCosts(product.id)
    }

    fun updateItemQuantity(itemId: String, quantity: String) {
        val qty = quantity.toIntOrNull() ?: return
        if (qty < 1) return
        _uiState.update { state ->
            state.copy(
                selectedItems = state.selectedItems.map { item ->
                    if (item.id == itemId) item.copy(quantity = qty) else item
                }
            )
        }
    }

    fun updateItemPrice(itemId: String, price: String) {
        val p = price.toDoubleOrNull() ?: return
        if (p < 0) return
        _uiState.update { state ->
            state.copy(
                selectedItems = state.selectedItems.map { item ->
                    if (item.id == itemId) item.copy(unitPrice = p) else item
                }
            )
        }
    }

    fun addExtra() {
        _uiState.update { state ->
            state.copy(extras = state.extras + QuoteExtra())
        }
    }

    fun removeExtra(extraId: String) {
        _uiState.update { state ->
            state.copy(extras = state.extras.filter { it.id != extraId })
        }
    }

    fun updateExtraDescription(extraId: String, description: String) {
        _uiState.update { state ->
            state.copy(
                extras = state.extras.map { extra ->
                    if (extra.id == extraId) extra.copy(description = description) else extra
                }
            )
        }
    }

    fun updateExtraPrice(extraId: String, price: String) {
        val p = price.toDoubleOrNull() ?: return
        _uiState.update { state ->
            state.copy(
                extras = state.extras.map { extra ->
                    if (extra.id == extraId) extra.copy(price = p) else extra
                }
            )
        }
    }

    fun updateExtraCost(extraId: String, cost: String) {
        val c = cost.toDoubleOrNull() ?: return
        _uiState.update { state ->
            state.copy(
                extras = state.extras.map { extra ->
                    if (extra.id == extraId) {
                        if (extra.excludeUtility) {
                            extra.copy(cost = c, price = c)
                        } else {
                            extra.copy(cost = c)
                        }
                    } else extra
                }
            )
        }
    }

    fun updateExtraExcludeUtility(extraId: String, excludeUtility: Boolean) {
        _uiState.update { state ->
            state.copy(
                extras = state.extras.map { extra ->
                    if (extra.id == extraId) {
                        if (excludeUtility) {
                            extra.copy(excludeUtility = true, price = extra.cost)
                        } else {
                            extra.copy(excludeUtility = false)
                        }
                    } else extra
                }
            )
        }
    }

    fun updateRequiresInvoice(value: Boolean) {
        _uiState.update { it.copy(requiresInvoice = value) }
    }

    fun updateTaxRate(value: String) {
        _uiState.update { it.copy(taxRate = value) }
    }

    fun updateDiscount(value: String) {
        _uiState.update { it.copy(discount = value) }
    }

    fun updateDiscountType(type: DiscountType) {
        _uiState.update { it.copy(discountType = type) }
    }

    fun updateClientName(value: String) {
        _uiState.update { it.copy(clientName = value) }
    }

    fun updateClientPhone(value: String) {
        _uiState.update { it.copy(clientPhone = value) }
    }

    fun updateClientEmail(value: String) {
        _uiState.update { it.copy(clientEmail = value) }
    }

    fun toggleClientInfo() {
        _uiState.update { it.copy(showClientInfo = !it.showClientInfo) }
    }

    private fun fetchProductCosts(productId: String) {
        if (_uiState.value.productUnitCosts.containsKey(productId)) return
        viewModelScope.launch {
            try {
                val ingredients: List<ProductIngredient> = apiService.get(Endpoints.productIngredients(productId))
                val cost = ingredients
                    .filter { it.type == InventoryType.INGREDIENT || it.type == InventoryType.SUPPLY }
                    .sumOf { (it.unitCost ?: 0.0) * it.quantityRequired }
                _uiState.update { state ->
                    state.copy(productUnitCosts = state.productUnitCosts + (productId to cost))
                }
            } catch (_: Exception) {
                // Silently fail — costs are optional for profitability display
            }
        }
    }

    private fun fetchAllProductCosts() {
        val state = _uiState.value
        state.selectedItems
            .map { it.productId }
            .filter { it.isNotEmpty() }
            .distinct()
            .forEach { fetchProductCosts(it) }
    }

    fun clearPdfFile() {
        _uiState.update { it.copy(generatedPdfFile = null) }
    }

    fun clearError() {
        _uiState.update { it.copy(errorMessage = null) }
    }

    fun generatePdf(context: Context) {
        val state = _uiState.value
        val validItems = state.selectedItems.filter { it.productId.isNotEmpty() && it.quantity > 0 }

        if (validItems.isEmpty()) {
            _uiState.update { it.copy(errorMessage = appContext.getString(R.string.clients_quick_quote_add_product_error)) }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isGeneratingPdf = true) }
            try {
                val user = authManager.currentUser.value
                val file = QuickQuotePdfGenerator.generate(
                    context = context,
                    client = state.client,
                    items = validItems,
                    extras = state.extras.filter { it.description.isNotBlank() },
                    numPeople = state.numPeople.toIntOrNull(),
                    subtotalProducts = state.subtotalProducts,
                    extrasTotal = state.extrasTotal,
                    discountAmount = state.discountAmount,
                    discountType = state.discountType,
                    discountValue = state.discount.toDoubleOrNull() ?: 0.0,
                    requiresInvoice = state.requiresInvoice,
                    taxRate = state.taxRate.toDoubleOrNull() ?: 0.0,
                    taxAmount = state.taxAmount,
                    total = state.total,
                    user = user,
                    clientName = state.clientName.takeIf { state.client == null },
                    clientPhone = state.clientPhone.takeIf { state.client == null },
                    clientEmail = state.clientEmail.takeIf { state.client == null }
                )
                _uiState.update { it.copy(generatedPdfFile = file, isGeneratingPdf = false) }
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        errorMessage = appContext.getString(
                            R.string.clients_quick_quote_pdf_error,
                            e.message ?: e.javaClass.simpleName
                        ),
                        isGeneratingPdf = false
                    )
                }
            }
        }
    }
}
