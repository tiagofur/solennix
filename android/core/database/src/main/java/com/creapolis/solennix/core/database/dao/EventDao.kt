package com.creapolis.solennix.core.database.dao

import androidx.room.*
import com.creapolis.solennix.core.database.entity.CachedEvent
import kotlinx.coroutines.flow.Flow

@Dao
interface EventDao {
    @Query("SELECT * FROM events WHERE user_id = :userId ORDER BY event_date DESC")
    fun getEvents(userId: String): Flow<List<CachedEvent>>

    @Query("SELECT * FROM events ORDER BY event_date DESC")
    fun getEvents(): Flow<List<CachedEvent>>

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

    @Query("SELECT * FROM events WHERE event_date >= date('now') AND status = 'CONFIRMED' AND user_id = :userId ORDER BY event_date ASC LIMIT :limit")
    fun getUpcomingEvents(userId: String, limit: Int): Flow<List<CachedEvent>>

    @Query("SELECT * FROM events WHERE event_date >= date('now') AND status = 'CONFIRMED' ORDER BY event_date ASC LIMIT :limit")
    fun getUpcomingEvents(limit: Int): Flow<List<CachedEvent>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertEvents(events: List<CachedEvent>)

    @Delete
    suspend fun deleteEvent(event: CachedEvent)

    @Query("DELETE FROM events WHERE client_id = :clientId")
    suspend fun deleteEventsByClientId(clientId: String)

    @Query("DELETE FROM events")
    suspend fun deleteAll()

    /**
     * Deletes locally-cached SYNCED events whose id is not in [keepIds] — i.e. events that
     * were deleted on the server and are therefore stale orphans locally.
     *
     * PENDING_* rows are explicitly preserved: they represent offline mutations that have
     * not yet been uploaded, so they will not appear in the API response yet.
     */
    @Query("DELETE FROM events WHERE id NOT IN (:keepIds) AND sync_status = 'SYNCED'")
    suspend fun deleteSyncedOrphans(keepIds: List<String>)

    /** Deletes every SYNCED event — used when a sync response is empty (everything deleted). */
    @Query("DELETE FROM events WHERE sync_status = 'SYNCED'")
    suspend fun deleteAllSynced()

    /**
     * Atomically reconciles the cached events table with a fresh server response: upserts
     * [events], then deletes SYNCED rows whose id is absent from the batch.
     *
     * Wrapped in `@Transaction` so Flow collectors don't briefly emit a stale/partial list
     * between the upsert and the orphan cleanup. PENDING_* rows are preserved by
     * [deleteSyncedOrphans] / [deleteAllSynced] (offline mutations not yet uploaded).
     */
    @Transaction
    suspend fun syncEvents(events: List<CachedEvent>) {
        insertEvents(events)
        if (events.isEmpty()) {
            deleteAllSynced()
        } else {
            deleteSyncedOrphans(events.map { it.id })
        }
    }

    @Query("SELECT COUNT(*) FROM events WHERE user_id = :userId AND event_date >= :monthStart AND event_date < :monthEnd")
    fun getEventCountForMonth(userId: String, monthStart: String, monthEnd: String): Flow<Int>
}
