package com.creapolis.solennix.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class EventProduct(
    val id: String,
    @SerialName("event_id") val eventId: String,
    @SerialName("product_id") val productId: String,
    val quantity: Double,
    @SerialName("unit_price") val unitPrice: Double,
    val discount: Double = 0.0,
    @SerialName("total_price") val totalPrice: Double? = null,
    @SerialName("created_at") val createdAt: String = ""
)
