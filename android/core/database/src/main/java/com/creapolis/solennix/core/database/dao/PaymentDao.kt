package com.creapolis.solennix.core.database.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.creapolis.solennix.core.database.entity.CachedPayment
import kotlinx.coroutines.flow.Flow

@Dao
interface PaymentDao {
    @Query("SELECT * FROM payments")
    fun getPayments(): Flow<List<CachedPayment>>

    @Query("SELECT * FROM payments WHERE eventId = :eventId")
    fun getPaymentsByEventId(eventId: String): Flow<List<CachedPayment>>

    @Query("SELECT * FROM payments WHERE id = :id")
    suspend fun getPayment(id: String): CachedPayment?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPayments(payments: List<CachedPayment>)

    @Delete
    suspend fun deletePayment(payment: CachedPayment)

    @Query("DELETE FROM payments")
    suspend fun deleteAll()
}
