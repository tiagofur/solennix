package com.creapolis.solennix.core.database.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey
import com.creapolis.solennix.core.model.DiscountType
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.EventStatus

enum class SyncStatus {
    SYNCED, PENDING_INSERT, PENDING_UPDATE, PENDING_DELETE
}

@Entity(tableName = "events")
data class CachedEvent(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "user_id") val userId: String,
    @ColumnInfo(name = "client_id") val clientId: String,
    @ColumnInfo(name = "event_date") val eventDate: String,
    @ColumnInfo(name = "start_time") val startTime: String?,
    @ColumnInfo(name = "end_time") val endTime: String?,
    @ColumnInfo(name = "service_type") val serviceType: String,
    @ColumnInfo(name = "num_people") val numPeople: Int,
    val status: EventStatus,
    val discount: Double,
    @ColumnInfo(name = "discount_type") val discountType: DiscountType,
    @ColumnInfo(name = "requires_invoice") val requiresInvoice: Boolean,
    @ColumnInfo(name = "tax_rate") val taxRate: Double,
    @ColumnInfo(name = "tax_amount") val taxAmount: Double,
    @ColumnInfo(name = "total_amount") val totalAmount: Double,
    val location: String?,
    val city: String?,
    @ColumnInfo(name = "deposit_percent") val depositPercent: Double?,
    @ColumnInfo(name = "cancellation_days") val cancellationDays: Double?,
    @ColumnInfo(name = "refund_percent") val refundPercent: Double?,
    val notes: String?,
    val photos: String?,
    @ColumnInfo(name = "created_at") val createdAt: String,
    @ColumnInfo(name = "updated_at") val updatedAt: String,
    @ColumnInfo(name = "sync_status") val syncStatus: SyncStatus = SyncStatus.SYNCED
)

fun CachedEvent.asExternalModel() = Event(
    id = id,
    userId = userId,
    clientId = clientId,
    eventDate = eventDate,
    startTime = startTime,
    endTime = endTime,
    serviceType = serviceType,
    numPeople = numPeople,
    status = status,
    discount = discount,
    discountType = discountType,
    requiresInvoice = requiresInvoice,
    taxRate = taxRate,
    taxAmount = taxAmount,
    totalAmount = totalAmount,
    location = location,
    city = city,
    depositPercent = depositPercent,
    cancellationDays = cancellationDays,
    refundPercent = refundPercent,
    notes = notes,
    photos = photos,
    createdAt = createdAt,
    updatedAt = updatedAt
)

fun Event.asEntity(syncStatus: SyncStatus = SyncStatus.SYNCED) = CachedEvent(
    id = id,
    userId = userId,
    clientId = clientId,
    eventDate = eventDate,
    startTime = startTime,
    endTime = endTime,
    serviceType = serviceType,
    numPeople = numPeople,
    status = status,
    discount = discount,
    discountType = discountType,
    requiresInvoice = requiresInvoice,
    taxRate = taxRate,
    taxAmount = taxAmount,
    totalAmount = totalAmount,
    location = location,
    city = city,
    depositPercent = depositPercent,
    cancellationDays = cancellationDays,
    refundPercent = refundPercent,
    notes = notes,
    photos = photos,
    createdAt = createdAt,
    updatedAt = updatedAt,
    syncStatus = syncStatus
)
