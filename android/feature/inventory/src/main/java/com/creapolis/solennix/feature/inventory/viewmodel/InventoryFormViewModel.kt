package com.creapolis.solennix.feature.inventory.viewmodel

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.data.repository.InventoryRepository
import com.creapolis.solennix.core.model.InventoryItem
import com.creapolis.solennix.core.model.InventoryType
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import java.util.UUID
import javax.inject.Inject

@HiltViewModel
class InventoryFormViewModel @Inject constructor(
    private val inventoryRepository: InventoryRepository,
    savedStateHandle: SavedStateHandle
) : ViewModel() {

    private val itemId: String? = savedStateHandle["itemId"]

    var ingredientName by mutableStateOf("")
    var currentStock by mutableStateOf("")
    var minimumStock by mutableStateOf("")
    var unit by mutableStateOf("")
    var unitCost by mutableStateOf("")
    var type by mutableStateOf(InventoryType.INGREDIENT)

    var isLoading by mutableStateOf(false)
    var isSaving by mutableStateOf(false)
    var saveSuccess by mutableStateOf(false)
    var errorMessage by mutableStateOf<String?>(null)

    val isFormValid: Boolean
        get() = ingredientName.isNotBlank() && currentStock.toDoubleOrNull() != null && minimumStock.toDoubleOrNull() != null && unit.isNotBlank()

    init {
        if (itemId != null) {
            loadItem(itemId)
        }
    }

    private fun loadItem(id: String) {
        viewModelScope.launch {
            isLoading = true
            try {
                val item = inventoryRepository.getInventoryItem(id)
                if (item != null) {
                    ingredientName = item.ingredientName
                    currentStock = item.currentStock.toString()
                    minimumStock = item.minimumStock.toString()
                    unit = item.unit
                    unitCost = item.unitCost?.toString() ?: ""
                    type = item.type
                }
            } catch (e: Exception) {
                errorMessage = "Error al cargar item: ${e.message}"
            } finally {
                isLoading = false
            }
        }
    }

    fun saveItem() {
        if (!isFormValid) return

        viewModelScope.launch {
            isSaving = true
            errorMessage = null
            try {
                val item = InventoryItem(
                    id = itemId ?: UUID.randomUUID().toString(),
                    userId = "", // Managed by backend
                    ingredientName = ingredientName,
                    currentStock = currentStock.toDouble(),
                    minimumStock = minimumStock.toDouble(),
                    unit = unit,
                    unitCost = unitCost.toDoubleOrNull(),
                    lastUpdated = "", // Handled by backend
                    type = type
                )

                if (itemId != null) {
                    inventoryRepository.updateInventoryItem(item)
                } else {
                    inventoryRepository.createInventoryItem(item)
                }
                saveSuccess = true
            } catch (e: Exception) {
                errorMessage = "Error al guardar item: ${e.message}"
            } finally {
                isSaving = false
            }
        }
    }
}
