package com.creapolis.solennix.core.database.dao

import androidx.room.*
import com.creapolis.solennix.core.database.entity.CachedProduct
import kotlinx.coroutines.flow.Flow

@Dao
interface ProductDao {
    @Query("SELECT * FROM products ORDER BY name ASC")
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

    /**
     * Deletes locally-cached products whose id is not in [keepIds] — i.e. products deleted
     * on the server. Products do not support offline mutations (no sync_status column), so
     * all rows are eligible for orphan cleanup.
     */
    @Query("DELETE FROM products WHERE id NOT IN (:keepIds)")
    suspend fun deleteOrphans(keepIds: List<String>)

    /**
     * Atomically reconciles the cached products table with a fresh server response: upserts
     * [products], then deletes rows whose id is absent from the batch. Products do not
     * support offline mutations, so all rows are eligible for orphan cleanup.
     */
    @Transaction
    suspend fun syncProducts(products: List<CachedProduct>) {
        insertProducts(products)
        if (products.isEmpty()) {
            deleteAll()
        } else {
            deleteOrphans(products.map { it.id })
        }
    }

    @Query("SELECT COUNT(*) FROM products WHERE is_active = 1")
    fun getActiveProductCount(): Flow<Int>
}
