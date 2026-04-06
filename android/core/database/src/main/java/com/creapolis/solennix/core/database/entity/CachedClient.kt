package com.creapolis.solennix.core.database.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey
import com.creapolis.solennix.core.model.Client

@Entity(tableName = "clients")
data class CachedClient(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "user_id") val userId: String,
    val name: String,
    val phone: String,
    val email: String?,
    val address: String?,
    val city: String?,
    val notes: String?,
    @ColumnInfo(name = "photo_url") val photoUrl: String?,
    @ColumnInfo(name = "total_events") val totalEvents: Int?,
    @ColumnInfo(name = "total_spent") val totalSpent: Double?,
    @ColumnInfo(name = "created_at") val createdAt: String,
    @ColumnInfo(name = "updated_at") val updatedAt: String,
    @ColumnInfo(name = "sync_status") val syncStatus: SyncStatus = SyncStatus.SYNCED
)

fun CachedClient.asExternalModel() = Client(
    id = id,
    userId = userId,
    name = name,
    phone = phone,
    email = email,
    address = address,
    city = city,
    notes = notes,
    photoUrl = photoUrl,
    totalEvents = totalEvents,
    totalSpent = totalSpent,
    createdAt = createdAt,
    updatedAt = updatedAt
)

fun Client.asEntity(syncStatus: SyncStatus = SyncStatus.SYNCED) = CachedClient(
    id = id,
    userId = userId,
    name = name,
    phone = phone,
    email = email,
    address = address,
    city = city,
    notes = notes,
    photoUrl = photoUrl,
    totalEvents = totalEvents,
    totalSpent = totalSpent,
    createdAt = createdAt,
    updatedAt = updatedAt,
    syncStatus = syncStatus
)
