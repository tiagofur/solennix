package com.creapolis.solennix.feature.events.viewmodel

import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.model.EventEquipment
import com.creapolis.solennix.core.model.EventSupply
import com.creapolis.solennix.core.model.EquipmentSuggestion
import com.creapolis.solennix.core.model.InventoryItem
import com.creapolis.solennix.core.model.SupplySource
import com.creapolis.solennix.core.model.SupplySuggestion
import kotlinx.coroutines.launch
import java.util.UUID

// Equipment Methods
fun EventFormViewModel.addEquipment(item: InventoryItem, quantity: Int) {
    val existing = selectedEquipment.find { it.inventoryId == item.id }
    if (existing != null) {
        val index = selectedEquipment.indexOf(existing)
        selectedEquipment[index] = existing.copy(quantity = existing.quantity + quantity)
    } else {
        val equipment = EventEquipment(
            id = UUID.randomUUID().toString(),
            eventId = "",
            inventoryId = item.id,
            quantity = quantity,
            createdAt = "",
            equipmentName = item.ingredientName,
            unit = item.unit,
            currentStock = item.currentStock
        )
        selectedEquipment.add(equipment)
    }
    checkEquipmentConflicts()
}

fun EventFormViewModel.removeEquipment(inventoryId: String) {
    selectedEquipment.removeAll { it.inventoryId == inventoryId }
    checkEquipmentConflicts()
}

fun EventFormViewModel.updateEquipmentQuantity(inventoryId: String, newQuantity: Int) {
    val existing = selectedEquipment.find { it.inventoryId == inventoryId }
    if (existing != null) {
        val index = selectedEquipment.indexOf(existing)
        selectedEquipment[index] = existing.copy(quantity = newQuantity.coerceAtLeast(0))
    }
    checkEquipmentConflicts()
}

fun EventFormViewModel.checkEquipmentConflicts() {
    if (selectedEquipment.isEmpty()) {
        internalEquipmentConflicts.value = emptyList()
        return
    }
    viewModelScope.launch {
        isCheckingConflicts = true
        try {
            val conflicts = eventRepository.getEquipmentConflicts(
                eventDate = eventDate.toString(),
                equipmentIds = selectedEquipment.map { it.inventoryId }
            )
            internalEquipmentConflicts.value = conflicts
        } catch (e: Exception) {
            internalEquipmentConflicts.value = emptyList()
        } finally {
            isCheckingConflicts = false
        }
    }
}

fun EventFormViewModel.fetchEquipmentSuggestions() {
    if (selectedProducts.isEmpty()) {
        internalEquipmentSuggestions.value = emptyList()
        return
    }
    viewModelScope.launch {
        try {
            val suggestions = eventRepository.getEquipmentSuggestions(
                productIds = selectedProducts.map { it.productId }
            )
            internalEquipmentSuggestions.value = suggestions
        } catch (e: Exception) {
            internalEquipmentSuggestions.value = emptyList()
        }
    }
}

fun EventFormViewModel.addEquipmentFromSuggestion(suggestion: EquipmentSuggestion) {
    val existing = selectedEquipment.find { it.inventoryId == suggestion.id }
    if (existing == null) {
        val equipment = EventEquipment(
            id = UUID.randomUUID().toString(),
            eventId = "",
            inventoryId = suggestion.id,
            quantity = suggestion.suggestedQuantity.toInt().coerceAtLeast(1),
            createdAt = "",
            equipmentName = suggestion.ingredientName,
            unit = suggestion.unit,
            currentStock = suggestion.currentStock
        )
        selectedEquipment.add(equipment)
        checkEquipmentConflicts()
    }
}

// Supplies Methods
fun EventFormViewModel.addSupply(item: InventoryItem, quantity: Double, source: SupplySource = SupplySource.STOCK) {
    val existing = selectedSupplies.find { it.inventoryId == item.id }
    if (existing != null) {
        val index = selectedSupplies.indexOf(existing)
        selectedSupplies[index] = existing.copy(quantity = existing.quantity + quantity)
    } else {
        val supply = EventSupply(
            id = UUID.randomUUID().toString(),
            eventId = "",
            inventoryId = item.id,
            quantity = quantity,
            unitCost = item.unitCost ?: 0.0,
            source = source,
            createdAt = "",
            supplyName = item.ingredientName,
            unit = item.unit,
            currentStock = item.currentStock
        )
        selectedSupplies.add(supply)
    }
}

fun EventFormViewModel.removeSupply(inventoryId: String) {
    selectedSupplies.removeAll { it.inventoryId == inventoryId }
}

fun EventFormViewModel.updateSupplyQuantity(inventoryId: String, newQuantity: Double) {
    val existing = selectedSupplies.find { it.inventoryId == inventoryId }
    if (existing != null) {
        val index = selectedSupplies.indexOf(existing)
        selectedSupplies[index] = existing.copy(quantity = newQuantity.coerceAtLeast(0.0))
    }
}

fun EventFormViewModel.updateSupplySource(inventoryId: String, source: SupplySource) {
    val existing = selectedSupplies.find { it.inventoryId == inventoryId }
    if (existing != null) {
        val index = selectedSupplies.indexOf(existing)
        selectedSupplies[index] = existing.copy(source = source)
    }
}

fun EventFormViewModel.updateSupplyExcludeCost(inventoryId: String, excludeCost: Boolean) {
    val existing = selectedSupplies.find { it.inventoryId == inventoryId }
    if (existing != null) {
        val index = selectedSupplies.indexOf(existing)
        selectedSupplies[index] = existing.copy(excludeCost = excludeCost)
    }
}

fun EventFormViewModel.fetchSupplySuggestions() {
    if (selectedProducts.isEmpty()) {
        internalSupplySuggestions.value = emptyList()
        return
    }
    viewModelScope.launch {
        try {
            val suggestions = eventRepository.getSupplySuggestions(
                productIds = selectedProducts.map { it.productId },
                numPeople = numPeople.toIntOrNull() ?: 0
            )
            internalSupplySuggestions.value = suggestions
        } catch (e: Exception) {
            internalSupplySuggestions.value = emptyList()
        }
    }
}

fun EventFormViewModel.addSupplyFromSuggestion(suggestion: SupplySuggestion) {
    val existing = selectedSupplies.find { it.inventoryId == suggestion.id }
    if (existing == null) {
        val source = if (suggestion.currentStock >= suggestion.suggestedQuantity) {
            SupplySource.STOCK
        } else {
            SupplySource.PURCHASE
        }
        val supply = EventSupply(
            id = UUID.randomUUID().toString(),
            eventId = "",
            inventoryId = suggestion.id,
            quantity = suggestion.suggestedQuantity,
            unitCost = suggestion.unitCost,
            source = source,
            createdAt = "",
            supplyName = suggestion.ingredientName,
            unit = suggestion.unit,
            currentStock = suggestion.currentStock
        )
        selectedSupplies.add(supply)
    }
}
