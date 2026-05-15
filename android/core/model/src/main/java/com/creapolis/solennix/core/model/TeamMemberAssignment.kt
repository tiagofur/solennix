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
