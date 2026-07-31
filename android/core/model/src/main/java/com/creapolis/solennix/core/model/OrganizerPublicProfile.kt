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
    @SerialName("show_packages") val showPackages: Boolean = true,
    @SerialName("show_faq") val showFaq: Boolean = true,
    @SerialName("show_policies") val showPolicies: Boolean = false,
    val about: String? = null,
    @SerialName("service_areas") val serviceAreas: List<String>? = null,
    @SerialName("event_types") val eventTypes: List<String>? = null,
    val languages: List<String>? = null,
    @SerialName("min_guests") val minGuests: Int? = null,
    @SerialName("max_guests") val maxGuests: Int? = null,
    @SerialName("response_time") val responseTime: String? = null,
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
    @SerialName("show_packages") val showPackages: Boolean? = null,
    @SerialName("show_faq") val showFaq: Boolean? = null,
    @SerialName("show_policies") val showPolicies: Boolean? = null,
    val about: String? = null,
    @SerialName("service_areas") val serviceAreas: List<String>? = null,
    @SerialName("event_types") val eventTypes: List<String>? = null,
    val languages: List<String>? = null,
    @SerialName("min_guests") val minGuests: Int? = null,
    @SerialName("max_guests") val maxGuests: Int? = null,
    @SerialName("response_time") val responseTime: String? = null,
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

/** Active product with its public-profile visibility flag (settings multi-select). */
@Serializable
data class PublicProfileServiceSelectionItem(
    val id: String,
    val name: String,
    val category: String = "",
    @SerialName("base_price") val basePrice: Double = 0.0,
    @SerialName("image_url") val imageUrl: String? = null,
    @SerialName("show_on_public_profile") val showOnPublicProfile: Boolean = false,
    @SerialName("is_featured") val isFeatured: Boolean = false
)

/** PUT /users/me/public-profile/services body. */
@Serializable
data class SetPublicProfileServicesRequest(
    @SerialName("product_ids") val productIds: List<String>
)

/** Pro+ public package from `/users/me/public-profile/packages` (bare array). */
@Serializable
data class OrganizerPublicPackage(
    val id: String,
    val title: String,
    val description: String? = null,
    @SerialName("from_price") val fromPrice: Double? = null,
    val inclusions: List<String>? = null,
    @SerialName("image_url") val imageUrl: String? = null,
    @SerialName("is_featured") val isFeatured: Boolean = false,
    @SerialName("sort_order") val sortOrder: Int = 0,
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("updated_at") val updatedAt: String = ""
)

/** POST /users/me/public-profile/packages body. */
@Serializable
data class PackageCreateRequest(
    val title: String,
    val description: String? = null,
    @SerialName("from_price") val fromPrice: Double? = null,
    val inclusions: List<String>? = null,
    @SerialName("image_url") val imageUrl: String? = null,
    @SerialName("is_featured") val isFeatured: Boolean? = null,
    @SerialName("sort_order") val sortOrder: Int? = null
)

/** PUT /users/me/public-profile/packages/{id} body (partial). */
@Serializable
data class PackageUpdateRequest(
    val title: String? = null,
    val description: String? = null,
    @SerialName("from_price") val fromPrice: Double? = null,
    val inclusions: List<String>? = null,
    @SerialName("image_url") val imageUrl: String? = null,
    @SerialName("is_featured") val isFeatured: Boolean? = null,
    @SerialName("sort_order") val sortOrder: Int? = null
)

/** Pro+ public FAQ item from `/users/me/public-profile/faq` (bare array). */
@Serializable
data class OrganizerPublicFaqItem(
    val id: String,
    val question: String,
    val answer: String,
    @SerialName("sort_order") val sortOrder: Int = 0,
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("updated_at") val updatedAt: String = ""
)

/** POST /users/me/public-profile/faq body. */
@Serializable
data class FaqCreateRequest(
    val question: String,
    val answer: String,
    @SerialName("sort_order") val sortOrder: Int? = null
)

/** PUT /users/me/public-profile/faq/{id} body (partial). */
@Serializable
data class FaqUpdateRequest(
    val question: String? = null,
    val answer: String? = null,
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
