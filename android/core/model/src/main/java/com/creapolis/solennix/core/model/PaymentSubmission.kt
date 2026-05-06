package com.creapolis.solennix.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class PaymentSubmission(
    val id: String,
    @SerialName("event_id") val eventId: String,
    @SerialName("client_id") val clientId: String,
    @SerialName("user_id") val userId: String,
    val amount: Double,
    @SerialName("transfer_ref") val transferRef: String? = null,
    @SerialName("receipt_file_url") val receiptFileUrl: String? = null,
    val status: String, // "pending" | "approved" | "rejected"
    @SerialName("submitted_at") val submittedAt: String,
    @SerialName("reviewed_at") val reviewedAt: String? = null,
    @SerialName("rejection_reason") val rejectionReason: String? = null,
    @SerialName("linked_payment_id") val linkedPaymentId: String? = null,
    @SerialName("client_name") val clientName: String? = null,
    @SerialName("event_label") val eventLabel: String? = null
)

@Serializable
data class ReviewSubmissionRequest(
    val status: String, // "approved" | "rejected"
    @SerialName("rejection_reason") val rejectionReason: String? = null
)
