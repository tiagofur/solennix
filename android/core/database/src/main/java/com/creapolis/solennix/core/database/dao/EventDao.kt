package com.creapolis.solennix.core.database.dao

import androidx.room.*
import com.creapolis.solennix.core.database.entity.CachedEvent
import kotlinx.coroutines.flow.Flow

@Dao
interface EventDao {
    @Query("SELECT * FROM events ORDER BY event_date DESC")
    fun getEvents(): Flow<List<CachedEvent>>

    @Query("SELECT * FROM events WHERE id = :id")
    suspend fun getEvent(id: String): CachedEvent?

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
}
