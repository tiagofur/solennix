package com.creapolis.solennix.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Event(
    val id: String = "",
    @SerialName("user_id") val userId: String = "",
    @SerialName("client_id") val clientId: String,
    @SerialName("event_date") val eventDate: String,
    @SerialName("start_time") val startTime: String? = null,
    @SerialName("end_time") val endTime: String? = null,
    @SerialName("service_type") val serviceType: String,
    @SerialName("num_people") val numPeople: Int,
    val status: EventStatus,
    val discount: Double = 0.0,
    @SerialName("discount_type") val discountType: DiscountType = DiscountType.PERCENT,
    @SerialName("requires_invoice") val requiresInvoice: Boolean = false,
    @SerialName("tax_rate") val taxRate: Double = 0.0,
    @SerialName("tax_amount") val taxAmount: Double = 0.0,
    @SerialName("total_amount") val totalAmount: Double = 0.0,
    val location: String? = null,
    val city: String? = null,
    @SerialName("deposit_percent") val depositPercent: Double? = null,
    @SerialName("cancellation_days") val cancellationDays: Double? = null,
    @SerialName("refund_percent") val refundPercent: Double? = null,
    val notes: String? = null,
    val photos: String? = null, // JSON array of URLs
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("updated_at") val updatedAt: String = "",
    @SerialName("currency") val currency: String? = "MXN"
) {
    val currencyCode: String get() = currency ?: "MXN"
}

@Serializable
enum class EventStatus {
    @SerialName("quoted") QUOTED,
    @SerialName("confirmed") CONFIRMED,
    @SerialName("completed") COMPLETED,
    @SerialName("cancelled") CANCELLED
}

@Serializable
enum class DiscountType {
    @SerialName("percent") PERCENT,
    @SerialName("fixed") FIXED
}
