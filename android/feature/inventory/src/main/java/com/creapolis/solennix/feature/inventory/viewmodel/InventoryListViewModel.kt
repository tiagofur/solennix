package com.creapolis.solennix.feature.inventory.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.data.repository.InventoryRepository
import com.creapolis.solennix.core.designsystem.event.UiEvent
import com.creapolis.solennix.core.model.InventoryItem
import com.creapolis.solennix.core.model.InventoryType
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class InventorySortKey {
    NAME, CURRENT_STOCK, MINIMUM_STOCK, UNIT_COST
}

data class InventoryListUiState(
    val ingredientItems: List<InventoryItem> = emptyList(),
    val equipmentItems: List<InventoryItem> = emptyList(),
    val supplyItems: List<InventoryItem> = emptyList(),
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val searchQuery: String = "",
    val lowStockOnly: Boolean = false,
    val sortKey: InventorySortKey = InventorySortKey.NAME,
    val sortAscending: Boolean = true
)

@HiltViewModel
class InventoryListViewModel @Inject constructor(
    private val inventoryRepository: InventoryRepository
) : ViewModel() {

    private val _searchQuery = MutableStateFlow("")
    private val _lowStockOnly = MutableStateFlow(false)
    private val _isRefreshing = MutableStateFlow(false)
    private val _sortKey = MutableStateFlow(InventorySortKey.NAME)
    private val _sortAscending = MutableStateFlow(true)

    private val _uiEvents = MutableSharedFlow<UiEvent>(extraBufferCapacity = 1)
    val uiEvents: SharedFlow<UiEvent> = _uiEvents.asSharedFlow()

    // Holds the most recent stock-adjust request so `onRetry` can replay it without
    // forcing the snackbar to serialize the full InventoryItem + delta into the actionId.
    private var lastAdjustRequest: Pair<InventoryItem, Double>? = null

    val uiState: StateFlow<InventoryListUiState> = combine(
        inventoryRepository.getInventoryItems(),
        _searchQuery,
        _lowStockOnly,
        combine(_isRefreshing, _sortKey, _sortAscending) { r, k, a -> Triple(r, k, a) }
    ) { items, query, lowStock, (refreshing, sortKey, sortAscending) ->
        var filtered = items
        if (query.isNotBlank()) {
            filtered = filtered.filter { it.ingredientName.contains(query, ignoreCase = true) }
        }
        if (lowStock) {
            filtered = filtered.filter { it.minimumStock > 0 && it.currentStock < it.minimumStock }
        }
        val sorted = when (sortKey) {
            InventorySortKey.NAME -> if (sortAscending) filtered.sortedBy { it.ingredientName.lowercase() }
                else filtered.sortedByDescending { it.ingredientName.lowercase() }
            InventorySortKey.CURRENT_STOCK -> if (sortAscending) filtered.sortedBy { it.currentStock }
                else filtered.sortedByDescending { it.currentStock }
            InventorySortKey.MINIMUM_STOCK -> if (sortAscending) filtered.sortedBy { it.minimumStock }
                else filtered.sortedByDescending { it.minimumStock }
            InventorySortKey.UNIT_COST -> if (sortAscending) filtered.sortedBy { it.unitCost ?: 0.0 }
                else filtered.sortedByDescending { it.unitCost ?: 0.0 }
        }
        InventoryListUiState(
            ingredientItems = sorted.filter { it.type == InventoryType.INGREDIENT },
            equipmentItems = sorted.filter { it.type == InventoryType.EQUIPMENT },
            supplyItems = sorted.filter { it.type == InventoryType.SUPPLY },
            isRefreshing = refreshing,
            searchQuery = query,
            lowStockOnly = lowStock,
            sortKey = sortKey,
            sortAscending = sortAscending
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = InventoryListUiState(isLoading = true)
    )

    init {
        refresh()
    }

    fun onSearchQueryChange(query: String) {
        _searchQuery.value = query
    }

    fun onLowStockToggle(enabled: Boolean) {
        _lowStockOnly.value = enabled
    }

    fun onSortChange(key: InventorySortKey) {
        if (_sortKey.value == key) {
            _sortAscending.value = !_sortAscending.value
        } else {
            _sortKey.value = key
            _sortAscending.value = true
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _isRefreshing.value = true
            try {
                inventoryRepository.syncInventory()
            } catch (e: Exception) {
                _uiEvents.tryEmit(
                    UiEvent.Error(
                        message = "No se pudo sincronizar el inventario. Mostrando datos en caché.",
                        retryActionId = ACTION_REFRESH,
                    )
                )
            } finally {
                _isRefreshing.value = false
            }
        }
    }

    fun deleteItem(id: String) {
        viewModelScope.launch {
            try {
                inventoryRepository.deleteInventoryItem(id)
            } catch (e: Exception) {
                _uiEvents.tryEmit(
                    UiEvent.Error(
                        message = "No se pudo borrar el item",
                        retryActionId = "$ACTION_DELETE:$id",
                    )
                )
            }
        }
    }

    fun adjustStock(item: InventoryItem, delta: Double) {
        viewModelScope.launch {
            try {
                val updated = item.copy(
                    currentStock = (item.currentStock + delta).coerceAtLeast(0.0)
                )
                inventoryRepository.updateInventoryItem(updated)
                lastAdjustRequest = null
            } catch (e: Exception) {
                lastAdjustRequest = item to delta
                _uiEvents.tryEmit(
                    UiEvent.Error(
                        message = "No se pudo ajustar el stock de ${item.ingredientName}",
                        retryActionId = ACTION_ADJUST_STOCK,
                    )
                )
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
            ACTION_REFRESH -> refresh()
            ACTION_DELETE -> parts.getOrNull(1)?.let { deleteItem(it) }
            ACTION_ADJUST_STOCK -> lastAdjustRequest?.let { (item, delta) ->
                adjustStock(item, delta)
            }
        }
    }

    private companion object {
        const val ACTION_REFRESH = "refresh"
        const val ACTION_DELETE = "delete"
        const val ACTION_ADJUST_STOCK = "adjustStock"
    }
}
