package com.creapolis.solennix.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Top client by total spent, returned by `GET /api/dashboard/top-clients`.
 * Mirrors [backend/internal/repository/TopClient].
 */
@Serializable
data class TopClient(
    val id: String,
    val name: String,
    @SerialName("total_spent") val totalSpent: Double,
    @SerialName("event_count") val eventCount: Int
)

/**
 * Product by demand (times used), returned by `GET /api/dashboard/product-demand`.
 * Mirrors [backend/internal/repository/ProductDemandItem].
 */
@Serializable
data class ProductDemandItem(
    val id: String,
    val name: String,
    @SerialName("times_used") val timesUsed: Int,
    @SerialName("total_revenue") val totalRevenue: Double
)

/**
 * Monthly revenue forecast, returned by `GET /api/dashboard/forecast`.
 * Mirrors [backend/internal/repository/ForecastDataPoint].
 */
@Serializable
data class ForecastDataPoint(
    val month: String, // "YYYY-MM"
    @SerialName("confirmed_revenue") val confirmedRevenue: Double,
    @SerialName("confirmed_event_count") val confirmedEventCount: Int
)
