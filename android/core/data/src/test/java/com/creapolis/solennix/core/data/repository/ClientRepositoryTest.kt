package com.creapolis.solennix.core.data.repository

import com.creapolis.solennix.core.database.dao.ClientDao
import com.creapolis.solennix.core.database.dao.EventDao
import com.creapolis.solennix.core.database.entity.CachedClient
import com.creapolis.solennix.core.database.entity.asExternalModel
import com.creapolis.solennix.core.model.Client
import com.creapolis.solennix.core.network.ApiService
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

class ClientRepositoryTest {

    private lateinit var repository: OfflineFirstClientRepository
    private val mockClientDao = mockk<ClientDao>(relaxed = true)
    private val mockEventDao = mockk<EventDao>(relaxed = true)
    private val mockApiService = mockk<ApiService>(relaxed = true)

    @BeforeEach
    fun setUp() {
        repository = OfflineFirstClientRepository(mockClientDao, mockEventDao, mockApiService)
    }

    @Test
    fun `getClients returns flow of domain models`() = runTest {
        val cachedClients = listOf(
            createCachedClient(id = "1", name = "Client 1"),
            createCachedClient(id = "2", name = "Client 2")
        )
        every { mockClientDao.getClients() } returns flowOf(cachedClients)

        val result = repository.getClients().first()

        assertEquals(2, result.size)
        assertEquals("Client 1", result[0].name)
        assertEquals("Client 2", result[1].name)
    }

    @Test
    fun `syncClients fetches from network and reconciles via dao syncClients`() = runTest {
        val networkClients = listOf(
            createClient(id = "1", name = "Network Client")
        )
        coEvery { mockApiService.get<List<Client>>(any(), any(), any()) } returns networkClients

        repository.syncClients()

        // Must call the transactional syncClients (upsert + orphan cleanup), not the bare
        // insertClients — otherwise deleted-on-server clients persist locally (#832).
        coVerify {
            mockClientDao.syncClients(withArg { entities ->
                assertEquals(1, entities.size)
                assertEquals("1", entities[0].id)
            })
        }
        coVerify(exactly = 0) { mockClientDao.insertClients(any()) }
    }

    @Test
    fun `createClient posts to network and inserts to dao`() = runTest {
        val client = createClient(id = "1", name = "New Client")
        coEvery { mockApiService.post<Client>(any(), any(), any()) } returns client

        val result = repository.createClient(client)

        assertEquals("New Client", result.name)
        coVerify { mockClientDao.insertClients(any()) }
    }

    @Test
    fun `updateClient calls api and inserts to dao`() = runTest {
        val client = createClient(id = "1", name = "Updated Client")
        coEvery { mockApiService.put<Client>(any(), any(), any()) } returns client

        val result = repository.updateClient(client)

        assertEquals("Updated Client", result.name)
        coVerify { mockClientDao.insertClients(any()) }
    }

    @Test
    fun `deleteClient calls api and deletes from daos`() = runTest {
        val clientId = "1"
        val cachedClient = createCachedClient(id = clientId, name = "To Delete")
        coEvery { mockClientDao.getClient(clientId) } returns cachedClient

        repository.deleteClient(clientId)

        coVerify { mockApiService.delete(any()) }
        coVerify { mockEventDao.deleteEventsByClientId(clientId) }
        coVerify { mockClientDao.deleteClient(cachedClient) }
    }

    private fun createClient(id: String, name: String) = Client(
        id = id,
        userId = "user1",
        name = name,
        phone = "1234567890",
        createdAt = "2024-01-01",
        updatedAt = "2024-01-01"
    )

    private fun createCachedClient(id: String, name: String) = CachedClient(
        id = id,
        userId = "user1",
        name = name,
        phone = "1234567890",
        email = null,
        address = null,
        city = null,
        notes = null,
        photoUrl = null,
        totalEvents = null,
        totalSpent = null,
        createdAt = "2024-01-01",
        updatedAt = "2024-01-01"
    )
}
