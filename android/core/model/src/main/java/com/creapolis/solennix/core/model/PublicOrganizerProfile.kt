package com.creapolis.solennix.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Visitor-facing public organizer profile from `GET /public/organizers/{slug}`.
 * Plan-aware: Free omits reviews/portfolio/socials on the backend.
 */
@Serializable
data class PublicOrganizerProfile(
    val slug: String,
    @SerialName("business_name") val businessName: String? = null,
    @SerialName("show_business_name") val showBusinessName: Boolean = true,
    @SerialName("logo_url") val logoUrl: String? = null,
    @SerialName("cover_url") val coverUrl: String? = null,
    @SerialName("brand_color") val brandColor: String? = null,
    val headline: String? = null,
    val about: String? = null,
    @SerialName("service_areas") val serviceAreas: List<String>? = null,
    @SerialName("min_guests") val minGuests: Int? = null,
    @SerialName("max_guests") val maxGuests: Int? = null,
    @SerialName("event_types") val eventTypes: List<String>? = null,
    @SerialName("response_time") val responseTime: String? = null,
    val languages: List<String>? = null,
    val location: PublicLocation? = null,
    val contact: PublicContact? = null,
    val services: List<PublicProfileService>? = null,
    val reviews: List<PublicReview>? = null,
    val portfolio: List<PublicPortfolioItem>? = null,
    val socials: Map<String, String>? = null,
    val packages: List<PublicPackage>? = null,
    val faq: List<PublicFaqItem>? = null,
    val policies: PublicPolicies? = null,
    @SerialName("events_completed") val eventsCompleted: Int = 0,
    @SerialName("average_rating") val averageRating: Double? = null,
    @SerialName("reviews_count") val reviewsCount: Int? = null
) {
    val displayName: String
        get() = if (!showBusinessName) {
            headline?.takeIf { it.isNotBlank() } ?: slug
        } else {
            businessName?.takeIf { it.isNotBlank() } ?: headline?.takeIf { it.isNotBlank() } ?: slug
        }

    val publicUrl: String
        get() = SolennixUrls.publicProfileUrl(slug)
}

@Serializable
data class PublicLocation(
    val city: String? = null,
    val region: String? = null,
    val country: String? = null
) {
    val formatted: String
        get() = listOfNotNull(city, region, country)
            .map { it.trim() }
            .filter { it.isNotEmpty() }
            .joinToString(", ")
}

@Serializable
data class PublicContact(
    val type: String,
    val value: String
)

@Serializable
data class PublicProfileService(
    val id: String,
    val name: String,
    val category: String = "",
    @SerialName("image_url") val imageUrl: String? = null,
    @SerialName("base_price") val basePrice: Double? = null,
    @SerialName("is_featured") val isFeatured: Boolean = false
)

@Serializable
data class PublicReview(
    val rating: Int,
    val comment: String? = null,
    @SerialName("submitted_at") val submittedAt: String = "",
    @SerialName("organizer_response") val organizerResponse: String? = null,
    @SerialName("display_name") val displayName: String = "",
    @SerialName("event_label") val eventLabel: String? = null
)

@Serializable
data class PublicPortfolioItem(
    val id: String,
    val title: String,
    @SerialName("event_date") val eventDate: String? = null,
    @SerialName("photo_url") val photoUrl: String,
    @SerialName("thumbnail_url") val thumbnailUrl: String? = null,
    @SerialName("sort_order") val sortOrder: Int = 0
)

@Serializable
data class PublicPackage(
    val id: String,
    val title: String,
    val description: String? = null,
    @SerialName("from_price") val fromPrice: Double? = null,
    val inclusions: List<String>? = null,
    @SerialName("image_url") val imageUrl: String? = null,
    @SerialName("is_featured") val isFeatured: Boolean = false,
    @SerialName("sort_order") val sortOrder: Int = 0
)

@Serializable
data class PublicFaqItem(
    val id: String,
    val question: String,
    val answer: String,
    @SerialName("sort_order") val sortOrder: Int = 0
)

@Serializable
data class PublicPolicies(
    @SerialName("deposit_percent") val depositPercent: Double? = null,
    @SerialName("cancellation_days") val cancellationDays: Int? = null,
    @SerialName("refund_percent") val refundPercent: Double? = null
)
