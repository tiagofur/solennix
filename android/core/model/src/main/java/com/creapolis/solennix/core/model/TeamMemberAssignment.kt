package com.creapolis.solennix.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
enum class AssignmentPortalResponse(val raw: String) {
    ACCEPT("accept"),
    DECLINE("decline")
}

@Serializable
data class TeamMemberAssignment(
    @SerialName("event_staff_id") val eventStaffId: String,
    @SerialName("event_id") val eventId: String,
    @SerialName("event_name") val eventName: String,
    @SerialName("event_date") val eventDate: String,
    @SerialName("staff_id") val staffId: String,
    val status: String,
    val location: String? = null,
    val city: String? = null,
    @SerialName("contact_name") val contactName: String? = null,
    @SerialName("contact_phone") val contactPhone: String? = null,
    @SerialName("organizer_notes") val organizerNotes: String? = null,
    @SerialName("fee_amount") val feeAmount: Double? = null,
    @SerialName("role_override") val roleOverride: String? = null,
    val notes: String? = null,
    @SerialName("shift_start") val shiftStart: String? = null,
    @SerialName("shift_end") val shiftEnd: String? = null,
    @SerialName("offer_group_id") val offerGroupId: String? = null,
    @SerialName("offer_slots") val offerSlots: Int? = null,
    @SerialName("notification_last_result") val notificationLastResult: String? = null,
    @SerialName("notification_sent_at") val notificationSentAt: String? = null
)

@Serializable
data class AssignmentResponseOutcome(
    @SerialName("event_staff_id") val eventStaffId: String,
    @SerialName("final_status") val finalStatus: String,
    @SerialName("seats_remaining") val seatsRemaining: Int,
    @SerialName("auto_declined_count") val autoDeclinedCount: Int
)

@Serializable
data class TeamMemberChangeEvent(
    val id: String,
    @SerialName("event_id") val eventId: String,
    @SerialName("event_staff_id") val eventStaffId: String,
    @SerialName("event_name") val eventName: String,
    @SerialName("event_date") val eventDate: String,
    @SerialName("change_type") val changeType: String,
    @SerialName("field_name") val fieldName: String,
    @SerialName("old_value") val oldValue: String? = null,
    @SerialName("new_value") val newValue: String? = null,
    @SerialName("occurred_at") val occurredAt: String,
    @SerialName("read_at") val readAt: String? = null
)

@Serializable
data class TeamTimelineMarkReadResponse(
    val updated: Int
)
