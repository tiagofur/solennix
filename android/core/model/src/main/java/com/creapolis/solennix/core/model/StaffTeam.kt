package com.creapolis.solennix.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Equipo de colaboradores — agrupa staff recurrente para asignación en bloque
 * a eventos. Ola 2 del "Personal".
 *
 * [members] llega sólo en respuestas detalladas (GET by id / POST / PUT).
 * [memberCount] llega sólo en el listado liviano.
 */
@Serializable
data class StaffTeam(
    val id: String = "",
    @SerialName("user_id") val userId: String = "",
    val name: String,
    @SerialName("role_label") val roleLabel: String? = null,
    val notes: String? = null,
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("updated_at") val updatedAt: String = "",
    val members: List<StaffTeamMember>? = null,
    @SerialName("member_count") val memberCount: Int? = null
)

@Serializable
data class StaffTeamMember(
    @SerialName("team_id") val teamId: String = "",
    @SerialName("staff_id") val staffId: String,
    @SerialName("is_lead") val isLead: Boolean = false,
    val position: Int = 0,
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("staff_name") val staffName: String? = null,
    @SerialName("staff_role_label") val staffRoleLabel: String? = null,
    @SerialName("staff_phone") val staffPhone: String? = null,
    @SerialName("staff_email") val staffEmail: String? = null
)
