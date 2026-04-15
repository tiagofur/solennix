package com.creapolis.solennix.core.data.repository

import androidx.paging.Pager
import androidx.paging.PagingConfig
import androidx.paging.PagingData
import com.creapolis.solennix.core.data.paging.RemotePagingSource
import com.creapolis.solennix.core.database.dao.ClientDao
import com.creapolis.solennix.core.database.dao.EventDao
import com.creapolis.solennix.core.database.entity.SyncStatus
import com.creapolis.solennix.core.database.entity.asEntity
import com.creapolis.solennix.core.database.entity.asExternalModel
import com.creapolis.solennix.core.model.Client
import com.creapolis.solennix.core.model.PaginatedResponse
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.SolennixException
import com.creapolis.solennix.core.network.get
import com.creapolis.solennix.core.network.post
import com.creapolis.solennix.core.network.put
import com.creapolis.solennix.core.network.Endpoints
import io.ktor.util.reflect.typeInfo
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

interface ClientRepository {
    fun getClients(): Flow<List<Client>>
    fun getClientCount(): Flow<Int>
    suspend fun getClient(id: String): Client?
    suspend fun syncClients()
    suspend fun createClient(client: Client): Client
    suspend fun updateClient(client: Client): Client
    suspend fun deleteClient(id: String)

    /**
     * Returns a [PagingData] stream that loads client pages directly from
     * the remote API using server-side pagination.
     */
    fun getClientsRemotePaging(
        sort: String = "name",
        order: String = "asc",
        query: String = ""
    ): Flow<PagingData<Client>>
}

@Singleton
class OfflineFirstClientRepository @Inject constructor(
    private val clientDao: ClientDao,
    private val eventDao: EventDao,
    private val apiService: ApiService
) : ClientRepository {

    override fun getClients(): Flow<List<Client>> =
        clientDao.getClients().map { it.map { entity -> entity.asExternalModel() } }

    override fun getClientCount(): Flow<Int> = clientDao.getClientCount()

    override suspend fun getClient(id: String): Client? =
        clientDao.getClient(id)?.asExternalModel()

    override suspend fun syncClients() {
        val networkClients: List<Client> = apiService.get(Endpoints.CLIENTS)
        clientDao.insertClients(networkClients.map { it.asEntity() })
    }

    override suspend fun createClient(client: Client): Client {
        val networkClient: Client = apiService.post(Endpoints.CLIENTS, client)
        clientDao.insertClients(listOf(networkClient.asEntity()))
        return networkClient
    }

    override suspend fun updateClient(client: Client): Client {
        val networkClient: Client = apiService.put(Endpoints.client(client.id), client)
        clientDao.insertClients(listOf(networkClient.asEntity()))
        return networkClient
    }

    override suspend fun deleteClient(id: String) {
        try {
            apiService.delete(Endpoints.client(id))
            eventDao.deleteEventsByClientId(id)
            val cached = clientDao.getClient(id)
            if (cached != null) {
                clientDao.deleteClient(cached)
            }
        } catch (e: Exception) {
            if (e is SolennixException.Auth) throw e
            // Offline support: mark as pending delete, SyncWorker will push later
            clientDao.updateSyncStatus(id, SyncStatus.PENDING_DELETE)
        }
    }

    override fun getClientsRemotePaging(
        sort: String,
        order: String,
        query: String
    ): Flow<PagingData<Client>> {
        val params = buildMap {
            put("sort", sort)
            put("order", order)
            if (query.isNotBlank()) put("q", query)
        }
        return Pager(
            config = PagingConfig(
                pageSize = 20,
                enablePlaceholders = true
            ),
            pagingSourceFactory = {
                RemotePagingSource<Client>(
                    apiService = apiService,
                    endpoint = Endpoints.CLIENTS,
                    params = params,
                    typeInfo = typeInfo<PaginatedResponse<Client>>(),
                    pageSize = 20
                )
            }
        ).flow
    }
}
