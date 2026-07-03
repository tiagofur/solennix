package com.creapolis.solennix.feature.calendar.viewmodel

import android.util.Log
import com.creapolis.solennix.core.data.repository.ClientRepository
import com.creapolis.solennix.core.data.repository.EventRepository
import com.creapolis.solennix.core.model.Client
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.EventStatus
import com.creapolis.solennix.core.model.UnavailableDate
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.get
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import io.mockk.mockkStatic
import io.mockk.unmockkStatic
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import kotlinx.coroutines.launch
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.time.LocalDate
import java.time.YearMonth

@OptIn(ExperimentalCoroutinesApi::class)
class CalendarViewModelTest {

    private val dispatcher = StandardTestDispatcher()
    private val eventRepository = mockk<EventRepository>()
    private val clientRepository = mockk<ClientRepository>()
    private val apiService = mockk<ApiService>()
    private val logger = com.creapolis.solennix.core.network.log.AndroidSolennixLogger()

    @BeforeEach
    fun setUp() {
        Dispatchers.setMain(dispatcher)
        mockkStatic(Log::class)
        every { Log.w(any<String>(), any<String>(), any<Throwable>()) } returns 0
    }

    @AfterEach
    fun tearDown() {
        unmockkStatic(Log::class)
        Dispatchers.resetMain()
    }

    @Test
    fun `filters events by selected date and status`() = runTest {
        val selectedDate = LocalDate.now()
        val quotedEvent = sampleEvent(id = "e1", clientId = "c1", date = selectedDate, status = EventStatus.QUOTED)
        val confirmedEvent = sampleEvent(id = "e2", clientId = "c2", date = selectedDate, status = EventStatus.CONFIRMED)
        val otherDateEvent = sampleEvent(id = "e3", clientId = "c1", date = selectedDate.plusDays(1), status = EventStatus.CONFIRMED)

        everyFlowSetup(events = listOf(quotedEvent, confirmedEvent, otherDateEvent))

        val viewModel = CalendarViewModel(eventRepository, clientRepository, apiService, logger)
        val collector = backgroundScope.launch { viewModel.uiState.collect { } }
        advanceUntilIdle()

        viewModel.setStatusFilter(EventStatus.CONFIRMED)
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertFalse(state.isLoading)
        assertEquals(listOf(confirmedEvent, otherDateEvent), state.events)
        assertEquals(EventStatus.CONFIRMED, state.statusFilter)
        assertEquals("Ana", state.clientNames["c1"])
        assertEquals("Luis", state.clientNames["c2"])
        collector.cancel()
    }

    @Test
    fun `refresh error surfaces load failed state`() = runTest {
        everyFlowSetup(events = emptyList())
        coEvery { eventRepository.syncEvents() } throws IllegalStateException("boom")

        val viewModel = CalendarViewModel(eventRepository, clientRepository, apiService, logger)
        val collector = backgroundScope.launch { viewModel.uiState.collect { } }
        advanceUntilIdle()

        viewModel.refresh()
        advanceUntilIdle()

        assertEquals(CalendarError.LoadFailed, viewModel.error.value)
        coVerify(atLeast = 2) { eventRepository.syncEvents() }
        collector.cancel()
    }

    private fun everyFlowSetup(events: List<Event>) {
        every { eventRepository.getEvents() } returns MutableStateFlow(events)
        every { clientRepository.getClients() } returns MutableStateFlow(
            listOf(
                Client(id = "c1", name = "Ana", phone = "111"),
                Client(id = "c2", name = "Luis", phone = "222")
            )
        )
        coEvery {
            apiService.get<List<UnavailableDate>>(any(), any())
        } returns emptyList()
        coEvery { eventRepository.syncEvents() } returns Unit
        coEvery { clientRepository.syncClients() } returns Unit
    }

    private fun sampleEvent(
        id: String,
        clientId: String,
        date: LocalDate,
        status: EventStatus
    ) = Event(
        id = id,
        clientId = clientId,
        eventDate = date.toString(),
        serviceType = "Boda",
        numPeople = 100,
        status = status,
        totalAmount = 2500.0,
        createdAt = "2026-05-13T00:00:00Z",
        updatedAt = "2026-05-13T00:00:00Z"
    )
}