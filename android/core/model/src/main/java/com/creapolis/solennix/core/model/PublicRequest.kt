package com.creapolis.solennix.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/** Structured quote request from a public visitor (NG1). */
@Serializable
data class PublicRequest(
    val id: String,
    @SerialName("contact_email") val contactEmail: String,
    @SerialName("contact_name") val contactName: String? = null,
    @SerialName("event_type") val eventType: String? = null,
    @SerialName("event_date") val eventDate: String? = null,
    val location: String? = null,
    @SerialName("guest_count") val guestCount: Int? = null,
    val budget: Double? = null,
    val currency: String = "MXN",
    val services: List<PublicRequestServiceSnapshot> = emptyList(),
    val message: String? = null,
    val status: String = "pending",
    @SerialName("is_read") val isRead: Boolean = false,
    @SerialName("event_id") val eventId: String? = null,
    @SerialName("declined_reason") val declinedReason: String? = null,
    @SerialName("last_status_change") val lastStatusChange: String? = null,
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("updated_at") val updatedAt: String = ""
) {
    val displayName: String
        get() {
            val name = contactName?.trim().orEmpty()
            if (name.isNotEmpty()) return name
            val at = contactEmail.indexOf('@')
            return if (at > 0) contactEmail.substring(0, at) else contactEmail
        }
}

@Serializable
data class PublicRequestServiceSnapshot(
    @SerialName("product_id") val productId: String,
    val name: String,
    val price: Double? = null,
    @SerialName("is_featured") val isFeatured: Boolean? = null
)

@Serializable
data class PublicResponse(
    val id: String,
    @SerialName("request_id") val requestId: String,
    @SerialName("quote_amount") val quoteAmount: Double,
    val currency: String = "MXN",
    val inclusions: List<String> = emptyList(),
    @SerialName("valid_until") val validUntil: String? = null,
    val message: String? = null,
    @SerialName("created_at") val createdAt: String = ""
)

/** Keyset pagination envelope from GET /organizers/me/requests?cursor= (#1121). */
@Serializable
data class CursorPaginatedPublicRequests(
    val data: List<PublicRequest> = emptyList(),
    @SerialName("next_cursor") val nextCursor: String? = null,
    @SerialName("has_more") val hasMore: Boolean = false,
    val limit: Int = 20
)

@Serializable
data class PublicRequestDetailData(
    val request: PublicRequest,
    val responses: List<PublicResponse> = emptyList()
)

@Serializable
data class PublicRequestDetailEnvelope(
    val data: PublicRequestDetailData
)

@Serializable
data class UnreadCountData(
    val count: Int = 0
)

@Serializable
data class UnreadCountEnvelope(
    val data: UnreadCountData
)

@Serializable
data class OkData(
    val ok: Boolean = true
)

@Serializable
data class OkEnvelope(
    val data: OkData = OkData()
)

@Serializable
data class RespondPublicRequestBody(
    @SerialName("quote_amount") val quoteAmount: Double,
    val currency: String = "MXN",
    val inclusions: List<String> = emptyList(),
    @SerialName("valid_until") val validUntil: String? = null,
    val message: String? = null
)

@Serializable
data class DeclinePublicRequestBody(
    val reason: String? = null
)

@Serializable
data class ConvertEventData(
    @SerialName("event_id") val eventId: String? = null
)

@Serializable
data class ConvertEventEnvelope(
    val data: ConvertEventData = ConvertEventData()
)

/** Empty JSON object for POSTs without a body. */
@Serializable
class EmptyJsonBody
