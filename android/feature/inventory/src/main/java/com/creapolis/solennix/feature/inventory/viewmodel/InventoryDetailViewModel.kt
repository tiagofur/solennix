package com.creapolis.solennix.feature.inventory.viewmodel

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.data.repository.InventoryRepository
import com.creapolis.solennix.core.model.InventoryItem
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class InventoryDetailUiState(
    val item: InventoryItem? = null,
    val isLoading: Boolean = false,
    val errorMessage: String? = null
)

@HiltViewModel
class InventoryDetailViewModel @Inject constructor(
    private val inventoryRepository: InventoryRepository,
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

    private fun loadItem() {
        viewModelScope.launch {
            try {
                val item = inventoryRepository.getInventoryItem(itemId)
                _uiState.value = InventoryDetailUiState(item = item, isLoading = false)
            } catch (e: Exception) {
                _uiState.value = InventoryDetailUiState(errorMessage = e.message, isLoading = false)
            }
        }
    }

    fun deleteItem() {
        viewModelScope.launch {
            try {
                inventoryRepository.deleteInventoryItem(itemId)
                deleteSuccess = true
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(errorMessage = "Error al eliminar item: ${e.message}")
            }
        }
    }
}
