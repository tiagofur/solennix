package com.creapolis.solennix.core.data.repository

import com.creapolis.solennix.core.database.dao.ClientDao
import com.creapolis.solennix.core.database.dao.EventDao
import com.creapolis.solennix.core.database.entity.asEntity
import com.creapolis.solennix.core.database.entity.asExternalModel
import com.creapolis.solennix.core.model.Client
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.Endpoints
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.onEach
import javax.inject.Inject
import javax.inject.Singleton

interface ClientRepository {
    fun getClients(): Flow<List<Client>>
    suspend fun getClient(id: String): Client?
    suspend fun syncClients()
    suspend fun createClient(client: Client): Client
    suspend fun updateClient(client: Client): Client
    suspend fun deleteClient(id: String)
}

@Singleton
class OfflineFirstClientRepository @Inject constructor(
    private val clientDao: ClientDao,
    private val eventDao: EventDao,
    private val apiService: ApiService
) : ClientRepository {

    override fun getClients(): Flow<List<Client>> =
        clientDao.getClients().map { it.map { entity -> entity.asExternalModel() } }

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
        apiService.delete(Endpoints.client(id))
        eventDao.deleteEventsByClientId(id)
        val cached = clientDao.getClient(id)
        if (cached != null) {
            clientDao.deleteClient(cached)
        }
    }
}
