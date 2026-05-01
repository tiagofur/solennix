package com.creapolis.solennix.feature.inventory.viewmodel

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.data.plan.LimitCheckResult
import com.creapolis.solennix.core.data.plan.PlanLimitsManager
import com.creapolis.solennix.core.data.repository.InventoryRepository
import com.creapolis.solennix.core.model.InventoryItem
import com.creapolis.solennix.core.model.InventoryType
import com.creapolis.solennix.core.model.Plan
import com.creapolis.solennix.core.network.AuthManager
import com.creapolis.solennix.feature.inventory.InventoryStrings
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import java.util.UUID
import javax.inject.Inject

@HiltViewModel
class InventoryFormViewModel @Inject constructor(
    private val inventoryRepository: InventoryRepository,
    private val planLimitsManager: PlanLimitsManager,
    private val authManager: AuthManager,
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

    var limitCheckResult by mutableStateOf<LimitCheckResult?>(null)
        private set

    val isLimitReached: Boolean
        get() = limitCheckResult is LimitCheckResult.LimitReached

    val isFormValid: Boolean
        get() = ingredientName.isNotBlank() && currentStock.toDoubleOrNull() != null && minimumStock.toDoubleOrNull() != null && unit.isNotBlank()

    init {
        if (itemId != null) {
            loadItem(itemId)
        } else {
            checkPlanLimit()
        }
    }

    private fun checkPlanLimit() {
        viewModelScope.launch {
            try {
                val plan = authManager.currentUser.value?.plan ?: Plan.BASIC
                val limits = planLimitsManager.getLimits(plan)
                val inventoryCount = inventoryRepository.getInventoryItems().first().size
                limitCheckResult = when {
                    inventoryCount >= limits.totalInventory -> LimitCheckResult.LimitReached(
                        feature = "inventory",
                        current = inventoryCount,
                        limit = limits.totalInventory,
                        message = InventoryStrings.limitReached(limits.totalInventory)
                    )
                    inventoryCount >= limits.totalInventory - 3 -> LimitCheckResult.NearLimit(
                        feature = "inventory",
                        current = inventoryCount,
                        limit = limits.totalInventory,
                        remaining = limits.totalInventory - inventoryCount
                    )
                    else -> LimitCheckResult.Allowed
                }
            } catch (_: Exception) {
                // Non-fatal — allow creation if limit check fails
            }
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
                errorMessage = InventoryStrings.loadItemError(e.message)
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
                errorMessage = InventoryStrings.saveItemError(e.message)
            } finally {
                isSaving = false
            }
        }
    }
}
