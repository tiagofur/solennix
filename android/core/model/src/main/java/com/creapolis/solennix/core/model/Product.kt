package com.creapolis.solennix.core.model

import kotlinx.serialization.EncodeDefault
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Product(
    val id: String = "",
    @SerialName("user_id") val userId: String? = null,
    val name: String,
    val category: String,
    @SerialName("base_price") val basePrice: Double,
    val recipe: String? = null,
    @SerialName("image_url") val imageUrl: String? = null,
    @EncodeDefault(EncodeDefault.Mode.ALWAYS)
    @SerialName("is_active") val isActive: Boolean = true,
    @EncodeDefault(EncodeDefault.Mode.ALWAYS)
    @SerialName("show_on_public_profile") val showOnPublicProfile: Boolean = true,
    @EncodeDefault(EncodeDefault.Mode.ALWAYS)
    @SerialName("is_featured") val isFeatured: Boolean = false,
    @SerialName("staff_team_id") val staffTeamId: String? = null,
    @SerialName("created_at") val createdAt: String? = null,
    @SerialName("updated_at") val updatedAt: String? = null
)
