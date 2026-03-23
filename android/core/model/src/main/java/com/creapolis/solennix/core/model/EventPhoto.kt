package com.creapolis.solennix.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class EventPhoto(
    val id: String,
    @SerialName("event_id") val eventId: String,
    val url: String,
    @SerialName("thumbnail_url") val thumbnailUrl: String? = null,
    val caption: String? = null,
    @SerialName("created_at") val createdAt: String = ""
)
