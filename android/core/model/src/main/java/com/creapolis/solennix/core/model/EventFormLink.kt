package com.creapolis.solennix.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class EventFormLink(
    val id: String = "",
    @SerialName("user_id") val userId: String = "",
    val token: String = "",
    val label: String? = null,
    val status: String = "active",
    @SerialName("submitted_event_id") val submittedEventId: String? = null,
    @SerialName("submitted_client_id") val submittedClientId: String? = null,
    val url: String = "",
    @SerialName("expires_at") val expiresAt: String = "",
    @SerialName("used_at") val usedAt: String? = null,
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("updated_at") val updatedAt: String = ""
)

@Serializable
data class GenerateEventFormLinkRequest(
    val label: String? = null,
    @SerialName("ttl_days") val ttlDays: Int? = null
)
