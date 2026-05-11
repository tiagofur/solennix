package com.creapolis.solennix.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class StaffInviteResponse(
    @SerialName("invite_id") val inviteId: String,
    @SerialName("staff_id") val staffId: String,
    val email: String,
    val status: String,
    @SerialName("accept_url") val acceptUrl: String,
    @SerialName("expires_at") val expiresAt: String,
    @SerialName("created_at") val createdAt: String
)
