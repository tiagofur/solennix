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

    /**
     * Payments scoped to [userId]. Widgets MUST use this overload — the unscoped
     * [getPayments] can cross tenant boundaries when the cached prefs are stale
     * or the user is signed out (issue #825).
     */
    @Query("SELECT * FROM payments WHERE userId = :userId")
    fun getPayments(userId: String): Flow<List<CachedPayment>>

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
