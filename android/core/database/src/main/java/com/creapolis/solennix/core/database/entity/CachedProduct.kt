package com.creapolis.solennix.core.database.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey
import com.creapolis.solennix.core.model.Product

@Entity(tableName = "products")
data class CachedProduct(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "user_id") val userId: String,
    val name: String,
    val category: String,
    @ColumnInfo(name = "base_price") val basePrice: Double,
    val recipe: String?,
    @ColumnInfo(name = "image_url") val imageUrl: String?,
    @ColumnInfo(name = "is_active") val isActive: Boolean,
    @ColumnInfo(name = "staff_team_id") val staffTeamId: String?,
    @ColumnInfo(name = "created_at") val createdAt: String,
    @ColumnInfo(name = "updated_at") val updatedAt: String
)

fun CachedProduct.asExternalModel() = Product(
    id = id,
    userId = userId,
    name = name,
    category = category,
    basePrice = basePrice,
    recipe = recipe,
    imageUrl = imageUrl,
    isActive = isActive,
    staffTeamId = staffTeamId,
    createdAt = createdAt,
    updatedAt = updatedAt
)

fun Product.asEntity() = CachedProduct(
    id = id,
    userId = userId,
    name = name,
    category = category,
    basePrice = basePrice,
    recipe = recipe,
    imageUrl = imageUrl,
    isActive = isActive,
    staffTeamId = staffTeamId,
    createdAt = createdAt,
    updatedAt = updatedAt
)
