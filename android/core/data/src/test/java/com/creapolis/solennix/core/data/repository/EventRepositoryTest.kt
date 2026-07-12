package com.creapolis.solennix.core.data.repository

import com.creapolis.solennix.core.database.dao.EventDao
import com.creapolis.solennix.core.database.dao.EventItemDao
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.EventStatus
import com.creapolis.solennix.core.network.ApiService
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

class EventRepositoryTest {

    private lateinit var repository: OfflineFirstEventRepository
    private val mockEventDao = mockk<EventDao>(relaxed = true)
    private val mockEventItemDao = mockk<EventItemDao>(relaxed = true)
    private val mockApiService = mockk<ApiService>(relaxed = true)

    @BeforeEach
    fun setUp() {
        repository = OfflineFirstEventRepository(mockEventDao, mockEventItemDao, mockApiService)
    }

    @Test
    fun `syncEvents fetches from network and reconciles via dao syncEvents`() = runTest {
        val networkEvents = listOf(
            createEvent(id = "1"),
            createEvent(id = "2")
        )
        coEvery { mockApiService.get<List<Event>>(any(), any(), any()) } returns networkEvents

        repository.syncEvents()

        // Must call the transactional syncEvents (upsert + orphan cleanup), not the bare
        // insertEvents — otherwise deleted-on-server events persist locally (#832).
        coVerify {
            mockEventDao.syncEvents(withArg { entities ->
                assertEquals(2, entities.size)
                assertEquals("1", entities[0].id)
                assertEquals("2", entities[1].id)
            })
        }
        coVerify(exactly = 0) { mockEventDao.insertEvents(any()) }
    }

    private fun createEvent(id: String) = Event(
        id = id,
        userId = "user1",
        clientId = "client1",
        eventDate = "2026-01-01",
        serviceType = "Boda",
        numPeople = 100,
        status = EventStatus.CONFIRMED
    )
}
