package com.creapolis.solennix.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class InventoryItem(
    val id: String = "",
    @SerialName("user_id") val userId: String = "",
    @SerialName("ingredient_name") val ingredientName: String,
    @SerialName("current_stock") val currentStock: Double,
    @SerialName("minimum_stock") val minimumStock: Double,
    val unit: String,
    @SerialName("unit_cost") val unitCost: Double? = null,
    @SerialName("last_updated") val lastUpdated: String = "",
    val type: InventoryType
)

@Serializable
enum class InventoryType {
    @SerialName("ingredient") INGREDIENT,
    @SerialName("equipment") EQUIPMENT,
    @SerialName("supply") SUPPLY
}
