package com.creapolis.solennix.core.model

import kotlinx.serialization.Serializable

/**
 * Attendance RSVP summary of the staff assigned to an event.
 *
 * Mirrors the backend `StaffAttendanceSummary` served by
 * `GET /api/events/{id}/staff/summary` — counts are computed server-side
 * from the assignment `status` (`pending|confirmed|declined|cancelled`).
 */
@Serializable
data class StaffAttendanceSummary(
    val total: Int = 0,
    val confirmed: Int = 0,
    val pending: Int = 0,
    val declined: Int = 0,
    val cancelled: Int = 0
)
