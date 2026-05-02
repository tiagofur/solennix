package com.creapolis.solennix.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class EquipmentAvailability(
    @SerialName("inventory_id") val inventoryId: String,
    @SerialName("available") val available: Int
)