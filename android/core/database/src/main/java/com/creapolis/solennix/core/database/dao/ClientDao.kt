package com.creapolis.solennix.core.database.dao

import androidx.room.*
import com.creapolis.solennix.core.database.entity.CachedClient
import kotlinx.coroutines.flow.Flow

@Dao
interface ClientDao {
    @Query("SELECT * FROM clients ORDER BY name ASC")
    fun getClients(): Flow<List<CachedClient>>

    @Query("SELECT * FROM clients WHERE id = :id")
    suspend fun getClient(id: String): CachedClient?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertClients(clients: List<CachedClient>)

    @Delete
    suspend fun deleteClient(client: CachedClient)

    @Query("DELETE FROM clients")
    suspend fun deleteAll()

    @Query("SELECT COUNT(*) FROM clients")
    fun getClientCount(): Flow<Int>

    @Query("UPDATE clients SET sync_status = :status WHERE id = :id")
    suspend fun updateSyncStatus(id: String, status: com.creapolis.solennix.core.database.entity.SyncStatus)
}
