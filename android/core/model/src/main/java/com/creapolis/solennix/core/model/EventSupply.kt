package com.creapolis.solennix.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class EventSupply(
    val id: String = "",
    @SerialName("event_id") val eventId: String = "",
    @SerialName("inventory_id") val inventoryId: String,
    val quantity: Double,
    @SerialName("unit_cost") val unitCost: Double,
    val source: SupplySource = SupplySource.STOCK,
    @SerialName("exclude_cost") val excludeCost: Boolean = false,
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("supply_name") val supplyName: String? = null,
    val unit: String? = null,
    @SerialName("current_stock") val currentStock: Double? = null
)

@Serializable
enum class SupplySource {
    @SerialName("stock") STOCK,
    @SerialName("purchase") PURCHASE
}
