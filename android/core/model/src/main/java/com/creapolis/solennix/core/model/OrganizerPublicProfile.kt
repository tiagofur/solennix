package com.creapolis.solennix.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Authenticated organizer public-profile config from
 * `GET/PUT /users/me/public-profile`.
 */
@Serializable
data class OrganizerPublicProfile(
    @SerialName("user_id") val userId: String = "",
    @SerialName("is_enabled") val isEnabled: Boolean = false,
    val headline: String? = null,
    @SerialName("contact_type") val contactType: String? = null,
    @SerialName("contact_value") val contactValue: String? = null,
    val city: String? = null,
    val region: String? = null,
    val country: String? = null,
    @SerialName("show_prices") val showPrices: Boolean = false,
    @SerialName("show_services") val showServices: Boolean = true,
    @SerialName("show_reviews") val showReviews: Boolean = true,
    @SerialName("show_portfolio") val showPortfolio: Boolean = true,
    @SerialName("show_contact") val showContact: Boolean = true,
    val socials: Map<String, String>? = null,
    @SerialName("public_slug") val publicSlug: String? = null,
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("updated_at") val updatedAt: String = ""
)

/** PUT /users/me/public-profile body. */
@Serializable
data class OrganizerPublicProfileUpsertRequest(
    @SerialName("is_enabled") val isEnabled: Boolean? = null,
    @SerialName("public_slug") val publicSlug: String? = null,
    val headline: String? = null,
    @SerialName("contact_type") val contactType: String? = null,
    @SerialName("contact_value") val contactValue: String? = null,
    val city: String? = null,
    val region: String? = null,
    val country: String? = null,
    @SerialName("show_prices") val showPrices: Boolean? = null,
    @SerialName("show_services") val showServices: Boolean? = null,
    @SerialName("show_reviews") val showReviews: Boolean? = null,
    @SerialName("show_portfolio") val showPortfolio: Boolean? = null,
    @SerialName("show_contact") val showContact: Boolean? = null,
    val socials: Map<String, String>? = null
)

/** Pro+ portfolio item from `/users/me/public-profile/portfolio`. */
@Serializable
data class OrganizerPublicPortfolioItem(
    val id: String,
    @SerialName("user_id") val userId: String,
    @SerialName("event_id") val eventId: String? = null,
    val title: String,
    @SerialName("event_date") val eventDate: String? = null,
    @SerialName("photo_url") val photoUrl: String,
    @SerialName("thumbnail_url") val thumbnailUrl: String? = null,
    @SerialName("sort_order") val sortOrder: Int = 0,
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("updated_at") val updatedAt: String = ""
)

/** POST /users/me/public-profile/portfolio body. */
@Serializable
data class PortfolioCreateRequest(
    val title: String,
    @SerialName("photo_url") val photoUrl: String,
    @SerialName("event_id") val eventId: String? = null,
    @SerialName("event_date") val eventDate: String? = null,
    @SerialName("thumbnail_url") val thumbnailUrl: String? = null,
    @SerialName("sort_order") val sortOrder: Int? = null
)

/** Envelope used by GET/PUT public-profile (`{ "data": ... }`). */
@Serializable
data class DataEnvelope<T>(
    val data: T
)

/** Public web origin for share links — never the API host. */
object SolennixUrls {
    const val WEB_BASE_URL = "https://solennix.com"

    fun publicProfileUrl(slug: String): String = "$WEB_BASE_URL/u/$slug"
}
