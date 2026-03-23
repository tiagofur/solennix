package com.creapolis.solennix.core.database.dao

import androidx.room.*
import com.creapolis.solennix.core.database.entity.CachedInventoryItem
import kotlinx.coroutines.flow.Flow

@Dao
interface InventoryDao {
    @Query("SELECT * FROM inventory ORDER BY ingredient_name ASC")
    fun getInventoryItems(): Flow<List<CachedInventoryItem>>

    @Query("SELECT * FROM inventory WHERE minimum_stock > 0 AND current_stock < minimum_stock ORDER BY ingredient_name ASC")
    fun getLowStockItems(): Flow<List<CachedInventoryItem>>

    @Query("SELECT * FROM inventory WHERE id = :id")
    suspend fun getInventoryItem(id: String): CachedInventoryItem?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertInventoryItems(items: List<CachedInventoryItem>)

    @Delete
    suspend fun deleteInventoryItem(item: CachedInventoryItem)

    @Query("DELETE FROM inventory WHERE id = :id")
    suspend fun deleteInventoryItemById(id: String)

    @Query("DELETE FROM inventory")
    suspend fun deleteAll()
}
