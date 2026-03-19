package com.creapolis.solennix.core.database.dao

import androidx.room.*
import com.creapolis.solennix.core.database.entity.CachedProduct
import kotlinx.coroutines.flow.Flow

@Dao
interface ProductDao {
    @Query("SELECT * FROM products WHERE is_active = 1 ORDER BY name ASC")
    fun getProducts(): Flow<List<CachedProduct>>

    @Query("SELECT * FROM products WHERE id = :id")
    suspend fun getProduct(id: String): CachedProduct?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProducts(products: List<CachedProduct>)

    @Delete
    suspend fun deleteProduct(product: CachedProduct)

    @Query("DELETE FROM products WHERE id = :id")
    suspend fun deleteProductById(id: String)

    @Query("DELETE FROM products")
    suspend fun deleteAll()
}
