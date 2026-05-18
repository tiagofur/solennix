package com.creapolis.solennix.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
enum class ReviewVisibility {
    @SerialName("private") PRIVATE,
    @SerialName("public") PUBLIC
}

@Serializable
data class EventReview(
    val id: String,
    @SerialName("event_id") val eventId: String,
    @SerialName("user_id") val userId: String,
    @SerialName("client_id") val clientId: String,
    @SerialName("review_request_id") val reviewRequestId: String? = null,
    val rating: Int,
    val comment: String? = null,
    val visibility: ReviewVisibility,
    @SerialName("organizer_response") val organizerResponse: String? = null,
    @SerialName("responded_at") val respondedAt: String? = null,
    @SerialName("submitted_at") val submittedAt: String,
    @SerialName("created_at") val createdAt: String,
    @SerialName("updated_at") val updatedAt: String,
    @SerialName("client_name") val clientName: String? = null,
    @SerialName("event_label") val eventLabel: String? = null,
    @SerialName("organizer_name") val organizerName: String? = null,
    @SerialName("public_slug") val publicSlug: String? = null
)

@Serializable
data class UpdateReviewResponseRequest(
    val response: String? = null
)

@Serializable
data class UpdateReviewVisibilityRequest(
    val visibility: ReviewVisibility
)
