package com.creapolis.solennix.core.database.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import com.creapolis.solennix.core.database.entity.CachedEventStaff
import com.creapolis.solennix.core.database.entity.CachedStaff
import com.creapolis.solennix.core.database.entity.SyncStatus
import kotlinx.coroutines.flow.Flow

@Dao
interface StaffDao {

    // ===== Catálogo (cached_staff) =====

    @Query("SELECT * FROM cached_staff ORDER BY name ASC")
    fun getStaff(): Flow<List<CachedStaff>>

    @Query("SELECT * FROM cached_staff WHERE id = :id")
    suspend fun getStaffMember(id: String): CachedStaff?

    @Query("SELECT COUNT(*) FROM cached_staff")
    fun getStaffCount(): Flow<Int>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertStaff(staff: List<CachedStaff>)

    @Delete
    suspend fun deleteStaff(staff: CachedStaff)

    @Query("DELETE FROM cached_staff")
    suspend fun deleteAllStaff()

    @Query("UPDATE cached_staff SET sync_status = :status WHERE id = :id")
    suspend fun updateSyncStatus(id: String, status: SyncStatus)

    // ===== Asignaciones por evento (cached_event_staff) =====

    @Query("SELECT * FROM cached_event_staff WHERE event_id = :eventId ORDER BY created_at ASC")
    fun getEventStaff(eventId: String): Flow<List<CachedEventStaff>>

    @Query("SELECT * FROM cached_event_staff WHERE event_id = :eventId ORDER BY created_at ASC")
    suspend fun getEventStaffOnce(eventId: String): List<CachedEventStaff>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertEventStaff(assignments: List<CachedEventStaff>)

    @Query("DELETE FROM cached_event_staff WHERE event_id = :eventId")
    suspend fun deleteEventStaffByEventId(eventId: String)

    @Query("DELETE FROM cached_event_staff")
    suspend fun deleteAllEventStaff()

    /**
     * Reemplaza atómicamente todas las asignaciones de un evento. Sin
     * `@Transaction`, los colectores de [getEventStaff] verían una lista
     * vacía entre el DELETE y el INSERT.
     */
    @Transaction
    suspend fun replaceEventStaff(eventId: String, assignments: List<CachedEventStaff>) {
        deleteEventStaffByEventId(eventId)
        if (assignments.isNotEmpty()) insertEventStaff(assignments)
    }
}
