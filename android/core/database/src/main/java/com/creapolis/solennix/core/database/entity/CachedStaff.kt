package com.creapolis.solennix.core.database.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey
import com.creapolis.solennix.core.model.EventStaff
import com.creapolis.solennix.core.model.Staff

@Entity(tableName = "cached_staff")
data class CachedStaff(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "user_id") val userId: String,
    val name: String,
    @ColumnInfo(name = "role_label") val roleLabel: String?,
    val phone: String?,
    val email: String?,
    val notes: String?,
    @ColumnInfo(name = "notification_email_opt_in") val notificationEmailOptIn: Boolean,
    @ColumnInfo(name = "invited_user_id") val invitedUserId: String?,
    @ColumnInfo(name = "created_at") val createdAt: String,
    @ColumnInfo(name = "updated_at") val updatedAt: String,
    @ColumnInfo(name = "sync_status") val syncStatus: SyncStatus = SyncStatus.SYNCED
)

fun CachedStaff.asExternalModel() = Staff(
    id = id,
    userId = userId,
    name = name,
    roleLabel = roleLabel,
    phone = phone,
    email = email,
    notes = notes,
    notificationEmailOptIn = notificationEmailOptIn,
    invitedUserId = invitedUserId,
    createdAt = createdAt,
    updatedAt = updatedAt
)

fun Staff.asEntity(syncStatus: SyncStatus = SyncStatus.SYNCED) = CachedStaff(
    id = id,
    userId = userId,
    name = name,
    roleLabel = roleLabel,
    phone = phone,
    email = email,
    notes = notes,
    notificationEmailOptIn = notificationEmailOptIn,
    invitedUserId = invitedUserId,
    createdAt = createdAt,
    updatedAt = updatedAt,
    syncStatus = syncStatus
)

/**
 * Cache de `event_staff` (asignaciones). Se reescribe cuando se carga el
 * evento. No se marca como fuente de verdad offline — es un snapshot para
 * pintar rápido la lista mientras el GET /events/{id}/staff vuelve.
 */
@Entity(tableName = "cached_event_staff")
data class CachedEventStaff(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "event_id") val eventId: String,
    @ColumnInfo(name = "staff_id") val staffId: String,
    @ColumnInfo(name = "fee_amount") val feeAmount: Double?,
    @ColumnInfo(name = "role_override") val roleOverride: String?,
    val notes: String?,
    @ColumnInfo(name = "notification_sent_at") val notificationSentAt: String?,
    @ColumnInfo(name = "notification_last_result") val notificationLastResult: String?,
    @ColumnInfo(name = "created_at") val createdAt: String,
    // Campos joineados — los cacheamos así la UI no necesita un segundo fetch
    @ColumnInfo(name = "staff_name") val staffName: String?,
    @ColumnInfo(name = "staff_role_label") val staffRoleLabel: String?,
    @ColumnInfo(name = "staff_phone") val staffPhone: String?,
    @ColumnInfo(name = "staff_email") val staffEmail: String?,
    // Ola 1 (operational layer)
    @ColumnInfo(name = "shift_start") val shiftStart: String? = null,
    @ColumnInfo(name = "shift_end") val shiftEnd: String? = null,
    val status: String? = null
)

fun CachedEventStaff.asExternalModel() = EventStaff(
    id = id,
    eventId = eventId,
    staffId = staffId,
    feeAmount = feeAmount,
    roleOverride = roleOverride,
    notes = notes,
    notificationSentAt = notificationSentAt,
    notificationLastResult = notificationLastResult,
    createdAt = createdAt,
    staffName = staffName,
    staffRoleLabel = staffRoleLabel,
    staffPhone = staffPhone,
    staffEmail = staffEmail,
    shiftStart = shiftStart,
    shiftEnd = shiftEnd,
    status = status
)

fun EventStaff.asEntity() = CachedEventStaff(
    id = id,
    eventId = eventId,
    staffId = staffId,
    feeAmount = feeAmount,
    roleOverride = roleOverride,
    notes = notes,
    notificationSentAt = notificationSentAt,
    notificationLastResult = notificationLastResult,
    createdAt = createdAt,
    staffName = staffName,
    staffRoleLabel = staffRoleLabel,
    staffPhone = staffPhone,
    staffEmail = staffEmail,
    shiftStart = shiftStart,
    shiftEnd = shiftEnd,
    status = status
)
