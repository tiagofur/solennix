package com.creapolis.solennix.feature.products.viewmodel

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.data.plan.LimitCheckResult
import com.creapolis.solennix.core.data.plan.PlanLimitsManager
import com.creapolis.solennix.core.data.repository.ProductRepository
import com.creapolis.solennix.core.designsystem.event.UiEvent
import com.creapolis.solennix.core.model.Plan
import com.creapolis.solennix.core.model.Product
import com.creapolis.solennix.core.network.AuthManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class ProductSortKey {
    NAME, PRICE, CATEGORY
}

data class ProductListUiState(
    val products: List<Product> = emptyList(),
    val allCategories: List<String> = emptyList(),
    val selectedCategory: String? = null,
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val searchQuery: String = "",
    val sortKey: ProductSortKey = ProductSortKey.NAME,
    val sortAscending: Boolean = true
)

@HiltViewModel
class ProductListViewModel @Inject constructor(
    private val productRepository: ProductRepository,
    private val planLimitsManager: PlanLimitsManager,
    private val authManager: AuthManager
) : ViewModel() {

    // Plan limit check
    var limitCheckResult by mutableStateOf<LimitCheckResult?>(null)
        private set
    val isLimitReached: Boolean
        get() = limitCheckResult is LimitCheckResult.LimitReached
    val nearLimitMessage: String?
        get() = (limitCheckResult as? LimitCheckResult.NearLimit)?.let { result ->
            "Te quedan ${result.remaining} productos disponibles en tu plan actual."
        }
    val limitReachedMessage: String?
        get() = (limitCheckResult as? LimitCheckResult.LimitReached)?.message

    private val _searchQuery = MutableStateFlow("")
    private val _selectedCategory = MutableStateFlow<String?>(null)
    private val _isRefreshing = MutableStateFlow(false)
    private val _sortKey = MutableStateFlow(ProductSortKey.NAME)
    private val _sortAscending = MutableStateFlow(true)

    private val _uiEvents = MutableSharedFlow<UiEvent>(extraBufferCapacity = 1)
    val uiEvents: SharedFlow<UiEvent> = _uiEvents.asSharedFlow()

    val uiState: StateFlow<ProductListUiState> = combine(
        productRepository.getProducts(),
        _searchQuery,
        _selectedCategory,
        combine(_isRefreshing, _sortKey, _sortAscending) { r, k, a -> Triple(r, k, a) }
    ) { products, query, category, (refreshing, sortKey, sortAscending) ->
        val allCategories = products.map { it.category }.distinct().sorted()
        var filtered = products
        if (query.isNotBlank()) {
            filtered = filtered.filter {
                it.name.contains(query, ignoreCase = true) || it.category.contains(query, ignoreCase = true)
            }
        }
        if (category != null) {
            filtered = filtered.filter { it.category == category }
        }
        val sorted = when (sortKey) {
            ProductSortKey.NAME -> if (sortAscending) filtered.sortedBy { it.name.lowercase() }
                else filtered.sortedByDescending { it.name.lowercase() }
            ProductSortKey.PRICE -> if (sortAscending) filtered.sortedBy { it.basePrice }
                else filtered.sortedByDescending { it.basePrice }
            ProductSortKey.CATEGORY -> if (sortAscending) filtered.sortedBy { it.category.lowercase() }
                else filtered.sortedByDescending { it.category.lowercase() }
        }
        ProductListUiState(
            products = sorted,
            allCategories = allCategories,
            selectedCategory = category,
            isRefreshing = refreshing,
            searchQuery = query,
            sortKey = sortKey,
            sortAscending = sortAscending
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = ProductListUiState(isLoading = true)
    )

    init {
        refresh()
        checkPlanLimits()
    }

    private fun checkPlanLimits() {
        viewModelScope.launch {
            val plan = authManager.currentUser.value?.plan ?: Plan.BASIC
            limitCheckResult = planLimitsManager.canCreateProduct(plan)
        }
    }

    fun onSearchQueryChange(query: String) {
        _searchQuery.value = query
    }

    fun onCategoryFilterChange(category: String?) {
        _selectedCategory.value = category
    }

    fun onSortChange(key: ProductSortKey) {
        if (_sortKey.value == key) {
            _sortAscending.value = !_sortAscending.value
        } else {
            _sortKey.value = key
            _sortAscending.value = true
        }
    }

    fun deleteProduct(id: String) {
        viewModelScope.launch {
            try {
                productRepository.deleteProduct(id)
            } catch (e: Exception) {
                _uiEvents.tryEmit(
                    UiEvent.Error(
                        message = "No se pudo borrar el producto",
                        retryActionId = "$ACTION_DELETE:$id",
                    )
                )
            }
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _isRefreshing.value = true
            try {
                productRepository.syncProducts()
            } catch (e: Exception) {
                _uiEvents.tryEmit(
                    UiEvent.Error(
                        message = "No se pudieron sincronizar los productos. Mostrando datos en caché.",
                        retryActionId = ACTION_REFRESH,
                    )
                )
            } finally {
                _isRefreshing.value = false
            }
        }
    }

    /**
     * Handle retry requests from UiEvent snackbar "Reintentar" actions.
     * `actionId` format: `"operation[:resourceId]"`.
     */
    fun onRetry(actionId: String) {
        val parts = actionId.split(":", limit = 2)
        when (parts[0]) {
            ACTION_DELETE -> parts.getOrNull(1)?.let { deleteProduct(it) }
            ACTION_REFRESH -> refresh()
        }
    }

    private companion object {
        const val ACTION_DELETE = "delete"
        const val ACTION_REFRESH = "refresh"
    }
}
