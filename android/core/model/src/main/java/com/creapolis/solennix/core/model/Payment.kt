package com.creapolis.solennix.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Payment(
    @SerialName("id") val id: String = "",
    @SerialName("event_id") val eventId: String = "",
    @SerialName("user_id") val userId: String = "",
    val amount: Double,
    @SerialName("payment_date") val paymentDate: String,
    @SerialName("payment_method") val paymentMethod: String,
    val notes: String? = null,
    @SerialName("created_at") val createdAt: String = ""
)

@Serializable
data class CreatePaymentRequest(
    @SerialName("event_id") val eventId: String,
    @SerialName("user_id") val userId: String,
    /**
     * Payment amount rounded to 2 decimal places (cents precision).
     * The backend validates that amounts have no sub-cent noise; callers
     * should use [roundedAmount] or round before constructing this request.
     */
    val amount: Double,
    @SerialName("payment_date") val paymentDate: String,
    @SerialName("payment_method") val paymentMethod: String,
    val notes: String? = null
)
