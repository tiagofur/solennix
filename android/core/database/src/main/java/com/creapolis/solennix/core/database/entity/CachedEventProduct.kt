package com.creapolis.solennix.core.database.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey
import com.creapolis.solennix.core.model.EventProduct

@Entity(tableName = "event_products")
data class CachedEventProduct(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "event_id") val eventId: String,
    @ColumnInfo(name = "product_id") val productId: String,
    val quantity: Double,
    @ColumnInfo(name = "unit_price") val unitPrice: Double,
    val discount: Double,
    @ColumnInfo(name = "total_price") val totalPrice: Double?,
    @ColumnInfo(name = "created_at") val createdAt: String,
    @ColumnInfo(name = "product_name") val productName: String? = null
)

fun CachedEventProduct.asExternalModel() = EventProduct(
    id = id,
    eventId = eventId,
    productId = productId,
    quantity = quantity,
    unitPrice = unitPrice,
    discount = discount,
    totalPrice = totalPrice,
    createdAt = createdAt,
    productName = productName
)

fun EventProduct.asEntity() = CachedEventProduct(
    id = id,
    eventId = eventId,
    productId = productId,
    quantity = quantity,
    unitPrice = unitPrice,
    discount = discount,
    totalPrice = totalPrice,
    createdAt = createdAt,
    productName = productName
)
