package com.creapolis.solennix.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Asignación de un [Staff] a un evento.
 *
 * Los campos `staff_*` vienen del JOIN que hace el backend en
 * `GET /api/events/{id}/staff` — permiten pintar la lista sin un round-trip
 * adicional al catálogo.
 *
 * `notificationSentAt` / `notificationLastResult` se poblarán en Phase 2
 * cuando el email de asignación sea real. En Phase 1 son null.
 *
 * Ola 1 (operational layer) añade `shiftStart`, `shiftEnd` y `status`:
 *   - `shiftStart` / `shiftEnd`: ISO8601 UTC, opcionales. Pueden cruzar medianoche.
 *   - `status`: enum (`pending|confirmed|declined|cancelled`). Opcional en payloads
 *     (nil = preservar valor existente en upsert). En lecturas del backend siempre
 *     viene poblado, pero se mantiene nullable por compatibilidad con caches viejos.
 */
@Serializable
data class EventStaff(
    val id: String = "",
    @SerialName("event_id") val eventId: String = "",
    @SerialName("staff_id") val staffId: String,
    @SerialName("fee_amount") val feeAmount: Double? = null,
    @SerialName("role_override") val roleOverride: String? = null,
    val notes: String? = null,
    @SerialName("notification_sent_at") val notificationSentAt: String? = null,
    @SerialName("notification_last_result") val notificationLastResult: String? = null,
    @SerialName("created_at") val createdAt: String = "",

    // Campos joineados (populados por el backend en GET /events/{id}/staff)
    @SerialName("staff_name") val staffName: String? = null,
    @SerialName("staff_role_label") val staffRoleLabel: String? = null,
    @SerialName("staff_phone") val staffPhone: String? = null,
    @SerialName("staff_email") val staffEmail: String? = null,

    // Ola 1
    @SerialName("shift_start") val shiftStart: String? = null,
    @SerialName("shift_end") val shiftEnd: String? = null,
    val status: String? = null
)

/**
 * Payload que se manda dentro de `PUT /api/events/{id}/items` en la lista
 * `staff`. No incluye id/event_id/created_at/notification_* — el backend
 * los maneja.
 *
 * Los campos de Ola 1 (`shiftStart`, `shiftEnd`, `status`) son opcionales:
 * si se mandan como `null` el backend preserva el valor existente en upsert.
 */
@Serializable
data class EventStaffAssignmentPayload(
    @SerialName("staff_id") val staffId: String,
    @SerialName("fee_amount") val feeAmount: Double? = null,
    @SerialName("role_override") val roleOverride: String? = null,
    val notes: String? = null,
    @SerialName("shift_start") val shiftStart: String? = null,
    @SerialName("shift_end") val shiftEnd: String? = null,
    val status: String? = null
)

/**
 * Estado de una asignación a evento. El backend persiste el valor crudo
 * (`pending|confirmed|declined|cancelled`); este enum lo normaliza para el
 * cliente — valores desconocidos caen a [CONFIRMED] para mantener paridad
 * con el default del servidor.
 */
enum class AssignmentStatus(val raw: String) {
    PENDING("pending"),
    CONFIRMED("confirmed"),
    DECLINED("declined"),
    CANCELLED("cancelled");

    companion object {
        fun fromString(value: String?): AssignmentStatus =
            when (value?.lowercase()) {
                "pending" -> PENDING
                "confirmed" -> CONFIRMED
                "declined" -> DECLINED
                "cancelled" -> CANCELLED
                else -> CONFIRMED
            }
    }
}
