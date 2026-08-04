package com.creapolis.solennix.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Shareable Solicitudes link (replaces EventFormLink / /event-forms). */
@Serializable
data class PublicRequestLink(
    val id: String = "",
    @SerialName("organizer_user_id") val organizerUserId: String = "",
    val token: String = "",
    val label: String? = null,
    val status: String = "active",
    @SerialName("submit_mode") val submitMode: String = "auto_event",
    @SerialName("max_uses") val maxUses: Int? = null,
    @SerialName("use_count") val useCount: Int = 0,
    @SerialName("expires_at") val expiresAt: String? = null,
    val url: String? = null,
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("updated_at") val updatedAt: String = ""
) {
    /** Absolute visitor URL `/s/{token}` when the API omits `url`. */
    val shareUrl: String
        get() = url?.takeIf { it.isNotBlank() } ?: "https://solennix.com/s/$token"
}

@Serializable
data class GeneratePublicRequestLinkRequest(
    val label: String? = null,
    @SerialName("ttl_days") val ttlDays: Int? = null,
    @SerialName("max_uses") val maxUses: Int? = null,
    @SerialName("submit_mode") val submitMode: String = "auto_event"
)
