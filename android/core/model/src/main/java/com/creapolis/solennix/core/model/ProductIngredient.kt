package com.creapolis.solennix.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ProductIngredient(
    val id: String? = null,
    @SerialName("product_id") val productId: String,
    @SerialName("inventory_id") val inventoryId: String,
    @SerialName("quantity_required") val quantityRequired: Double,
    val capacity: Double? = null,
    @SerialName("bring_to_event") val bringToEvent: Boolean? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("ingredient_name") val ingredientName: String? = null,
    val unit: String? = null,
    @SerialName("unit_cost") val unitCost: Double? = null,
    val type: InventoryType? = null
)
