package com.creapolis.solennix.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Colaborador / personal recurrente del organizador.
 *
 * Phase 1 — CRUD local del catálogo. El costo NO vive acá: se cobra por
 * asignación en [EventStaff.feeAmount] porque el mismo colaborador puede
 * cobrar distinto en cada evento.
 *
 * Phase 2 activará `notificationEmailOptIn` (email automático al asignarlo a
 * un evento, feature Pro+). En Phase 1 el toggle se guarda pero no dispara
 * nada.
 *
 * Phase 3 (Business) activará [invitedUserId] cuando el organizer invite al
 * colaborador a crear una cuenta. En Phase 1 siempre es null.
 */
@Serializable
data class Staff(
    val id: String = "",
    @SerialName("user_id") val userId: String = "",
    val name: String,
    @SerialName("role_label") val roleLabel: String? = null,
    val phone: String? = null,
    val email: String? = null,
    val notes: String? = null,
    @SerialName("notification_email_opt_in") val notificationEmailOptIn: Boolean = false,
    @SerialName("invited_user_id") val invitedUserId: String? = null,
    @SerialName("invite_status") val inviteStatus: String? = null,
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("updated_at") val updatedAt: String = ""
)
