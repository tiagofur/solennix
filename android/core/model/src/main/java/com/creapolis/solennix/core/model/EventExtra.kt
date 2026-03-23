package com.creapolis.solennix.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class EventExtra(
    val id: String,
    @SerialName("event_id") val eventId: String,
    val description: String,
    val cost: Double,
    val price: Double,
    @SerialName("exclude_utility") val excludeUtility: Boolean = false,
    @SerialName("created_at") val createdAt: String = ""
)
