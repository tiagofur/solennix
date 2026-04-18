package com.creapolis.solennix.core.database.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey
import com.creapolis.solennix.core.model.EventExtra

@Entity(tableName = "event_extras")
data class CachedEventExtra(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "event_id") val eventId: String,
    val description: String,
    val cost: Double,
    val price: Double,
    @ColumnInfo(name = "exclude_utility") val excludeUtility: Boolean,
    @ColumnInfo(name = "include_in_checklist", defaultValue = "1") val includeInChecklist: Boolean = true,
    @ColumnInfo(name = "created_at") val createdAt: String
)

fun CachedEventExtra.asExternalModel() = EventExtra(
    id = id,
    eventId = eventId,
    description = description,
    cost = cost,
    price = price,
    excludeUtility = excludeUtility,
    includeInChecklist = includeInChecklist,
    createdAt = createdAt
)

fun EventExtra.asEntity() = CachedEventExtra(
    id = id,
    eventId = eventId,
    description = description,
    cost = cost,
    price = price,
    excludeUtility = excludeUtility,
    includeInChecklist = includeInChecklist,
    createdAt = createdAt
)
