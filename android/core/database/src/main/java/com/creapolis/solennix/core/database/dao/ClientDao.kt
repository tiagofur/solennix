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

    /**
     * Deletes locally-cached SYNCED clients whose id is not in [keepIds] — i.e. clients
     * deleted on the server. PENDING_* rows are preserved (offline mutations not yet
     * uploaded, so absent from the API response).
     */
    @Query("DELETE FROM clients WHERE id NOT IN (:keepIds) AND sync_status = 'SYNCED'")
    suspend fun deleteSyncedOrphans(keepIds: List<String>)

    /** Deletes every SYNCED client — used when a sync response is empty (everything deleted). */
    @Query("DELETE FROM clients WHERE sync_status = 'SYNCED'")
    suspend fun deleteAllSynced()

    /**
     * Atomically reconciles the cached clients table with a fresh server response: upserts
     * [clients], then deletes SYNCED rows whose id is absent from the batch. PENDING_*
     * rows are preserved (offline mutations not yet uploaded).
     */
    @Transaction
    suspend fun syncClients(clients: List<CachedClient>) {
        insertClients(clients)
        if (clients.isEmpty()) {
            deleteAllSynced()
        } else {
            deleteSyncedOrphans(clients.map { it.id })
        }
    }

    @Query("SELECT COUNT(*) FROM clients")
    fun getClientCount(): Flow<Int>

    @Query("UPDATE clients SET sync_status = :status WHERE id = :id")
    suspend fun updateSyncStatus(id: String, status: com.creapolis.solennix.core.database.entity.SyncStatus)
}
