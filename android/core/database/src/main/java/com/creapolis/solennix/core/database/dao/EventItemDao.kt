package com.creapolis.solennix.core.database.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.creapolis.solennix.core.database.entity.CachedEventExtra
import com.creapolis.solennix.core.database.entity.CachedEventProduct
import kotlinx.coroutines.flow.Flow

@Dao
interface EventItemDao {
    @Query("SELECT * FROM event_products WHERE event_id = :eventId")
    fun getProductsByEventId(eventId: String): Flow<List<CachedEventProduct>>

    @Query("SELECT * FROM event_extras WHERE event_id = :eventId")
    fun getExtrasByEventId(eventId: String): Flow<List<CachedEventExtra>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProducts(products: List<CachedEventProduct>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertExtras(extras: List<CachedEventExtra>)

    @Query("DELETE FROM event_products WHERE event_id = :eventId")
    suspend fun deleteProductsByEventId(eventId: String)

    @Query("DELETE FROM event_extras WHERE event_id = :eventId")
    suspend fun deleteExtrasByEventId(eventId: String)

    @Query("DELETE FROM event_products")
    suspend fun deleteAllProducts()

    @Query("DELETE FROM event_extras")
    suspend fun deleteAllExtras()
}
