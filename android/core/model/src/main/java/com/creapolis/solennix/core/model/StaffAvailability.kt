package com.creapolis.solennix.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Respuesta de `GET /api/staff/availability?date=YYYY-MM-DD` o
 * `?start=YYYY-MM-DD&end=YYYY-MM-DD`. Sólo se devuelven colaboradores CON
 * asignaciones en la ventana consultada — si un staff no aparece, está libre.
 */
@Serializable
data class StaffAvailability(
    @SerialName("staff_id") val staffId: String,
    @SerialName("staff_name") val staffName: String,
    val assignments: List<StaffAvailabilityAssignment> = emptyList()
)

@Serializable
data class StaffAvailabilityAssignment(
    @SerialName("event_id") val eventId: String,
    @SerialName("event_name") val eventName: String,
    @SerialName("event_date") val eventDate: String,
    @SerialName("shift_start") val shiftStart: String? = null,
    @SerialName("shift_end") val shiftEnd: String? = null,
    val status: String
)
