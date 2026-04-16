package com.creapolis.solennix.core.database.dao

import androidx.paging.PagingSource
import androidx.room.*
import com.creapolis.solennix.core.database.entity.CachedEvent
import kotlinx.coroutines.flow.Flow

@Dao
interface EventDao {
    @Query("SELECT * FROM events WHERE user_id = :userId ORDER BY event_date DESC")
    fun getEvents(userId: String): Flow<List<CachedEvent>>

    @Query("SELECT * FROM events ORDER BY event_date DESC")
    fun getEvents(): Flow<List<CachedEvent>>

    @Transaction
    @Query("""
        SELECT * FROM events 
        WHERE (:status IS NULL OR status = :status)
        AND (:startDate IS NULL OR event_date >= :startDate)
        AND (:endDate IS NULL OR event_date <= :endDate)
        AND (
            :query = '' OR 
            service_type LIKE '%' || :query || '%' OR 
            location LIKE '%' || :query || '%' OR 
            city LIKE '%' || :query || '%'
        )
        ORDER BY event_date DESC
    """)
    fun getEventsPaging(
        query: String = "", 
        status: String? = null,
        startDate: String? = null,
        endDate: String? = null
    ): PagingSource<Int, CachedEvent>

    @Query("SELECT * FROM events WHERE id = :id")
    suspend fun getEvent(id: String): CachedEvent?

    /**
     * Observes a single event by id. Use this instead of `getEvents()` + `.find { }`
     * when a screen only cares about one event — avoids re-scanning the full events
     * table on every unrelated mutation.
     */
    @Query("SELECT * FROM events WHERE id = :id")
    fun observeEvent(id: String): Flow<CachedEvent?>

    @Query("SELECT * FROM events WHERE sync_status != 'SYNCED'")
    suspend fun getPendingEvents(): List<CachedEvent>

    @Query("UPDATE events SET sync_status = :status WHERE id = :id")
    suspend fun updateSyncStatus(id: String, status: com.creapolis.solennix.core.database.entity.SyncStatus)

    @Query("SELECT * FROM events WHERE event_date >= date('now') AND user_id = :userId ORDER BY event_date ASC LIMIT :limit")
    fun getUpcomingEvents(userId: String, limit: Int): Flow<List<CachedEvent>>

    @Query("SELECT * FROM events WHERE event_date >= date('now') ORDER BY event_date ASC LIMIT :limit")
    fun getUpcomingEvents(limit: Int): Flow<List<CachedEvent>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertEvents(events: List<CachedEvent>)

    @Delete
    suspend fun deleteEvent(event: CachedEvent)

    @Query("DELETE FROM events WHERE client_id = :clientId")
    suspend fun deleteEventsByClientId(clientId: String)

    @Query("DELETE FROM events")
    suspend fun deleteAll()

    @Query("SELECT COUNT(*) FROM events WHERE event_date >= :monthStart AND event_date < :monthEnd")
    fun getEventCountForMonth(monthStart: String, monthEnd: String): Flow<Int>
}
