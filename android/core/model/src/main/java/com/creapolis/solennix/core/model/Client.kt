package com.creapolis.solennix.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Client(
    val id: String,
    @SerialName("user_id") val userId: String,
    val name: String,
    val phone: String,
    val email: String? = null,
    val address: String? = null,
    val city: String? = null,
    val notes: String? = null,
    @SerialName("photo_url") val photoUrl: String? = null,
    @SerialName("total_events") val totalEvents: Int? = null,
    @SerialName("total_spent") val totalSpent: Double? = null,
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("updated_at") val updatedAt: String = ""
)
