package com.creapolis.solennix.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class EventEquipment(
    val id: String = "",
    @SerialName("event_id") val eventId: String = "",
    @SerialName("inventory_id") val inventoryId: String,
    val quantity: Int,
    val notes: String? = null,
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("equipment_name") val equipmentName: String? = null,
    val unit: String? = null,
    @SerialName("current_stock") val currentStock: Double? = null
)
