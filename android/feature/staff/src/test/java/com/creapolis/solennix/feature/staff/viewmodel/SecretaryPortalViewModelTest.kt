package com.creapolis.solennix.feature.staff.viewmodel

import com.creapolis.solennix.core.data.repository.EventRepository
import com.creapolis.solennix.core.data.repository.StaffRepository
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.EventStaff
import com.creapolis.solennix.core.model.EventStatus
import com.creapolis.solennix.core.model.Staff
import com.creapolis.solennix.core.model.StaffAttendanceSummary
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

@OptIn(ExperimentalCoroutinesApi::class)
class SecretaryPortalViewModelTest {

    private val dispatcher = StandardTestDispatcher()

    @BeforeEach
    fun setUp() {
        Dispatchers.setMain(dispatcher)
    }

    @AfterEach
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun event(id: String, date: String) = Event(
        id = id,
        clientId = "c1",
        eventDate = date,
        serviceType = "Banquete",
        numPeople = 50,
        status = EventStatus.CONFIRMED
    )

    private fun viewModel(
        staffRepository: StaffRepository,
        eventRepository: EventRepository
    ): SecretaryPortalViewModel {
        return SecretaryPortalViewModel(staffRepository, eventRepository)
    }

    @Test
    fun `refresh loads upcoming agenda and staff directory read-only`() = runTest {
        val staffRepository = mockk<StaffRepository>()
        val eventRepository = mockk<EventRepository>()
        coEvery {
            eventRepository.getEventsByDateRangeFromApi(any(), any())
        } returns listOf(event("e2", "2026-12-02"), event("e1", "2026-12-01"))
        coEvery { staffRepository.syncStaff() } returns Unit
        coEvery { staffRepository.getStaff() } returns MutableStateFlow(
            listOf(Staff(id = "s1", name = "Ana"))
        )

        val vm = viewModel(staffRepository, eventRepository)
        advanceUntilIdle()

        val state = vm.uiState.value
        assertEquals(listOf("e1", "e2"), state.upcomingEvents.map { it.id })
        assertEquals(listOf("s1"), state.staffDirectory.map { it.id })
        assertNull(state.errorMessage)
        coVerify(exactly = 0) { staffRepository.inviteStaffUser(any(), any()) }
    }

    @Test
    fun `selectEvent loads staffing and attendance summary`() = runTest {
        val staffRepository = mockk<StaffRepository>()
        val eventRepository = mockk<EventRepository>()
        coEvery {
            eventRepository.getEventsByDateRangeFromApi(any(), any())
        } returns listOf(event("e1", "2026-12-01"))
        coEvery { staffRepository.syncStaff() } returns Unit
        coEvery { staffRepository.getStaff() } returns MutableStateFlow(emptyList())
        coEvery { staffRepository.syncEventStaff("e1") } returns listOf(
            EventStaff(id = "es1", eventId = "e1", staffId = "s1", status = "confirmed"),
            EventStaff(id = "es2", eventId = "e1", staffId = "s2", status = "pending")
        )
        coEvery { staffRepository.getEventStaffSummary("e1") } returns StaffAttendanceSummary(
            total = 2, confirmed = 1, pending = 1, declined = 0, cancelled = 0
        )

        val vm = viewModel(staffRepository, eventRepository)
        advanceUntilIdle()
        vm.selectEvent("e1")
        advanceUntilIdle()

        val state = vm.uiState.value
        assertEquals("e1", state.selectedEventId)
        assertEquals(2, state.eventStaff.size)
        assertNotNull(state.attendanceSummary)
        assertEquals(1, state.attendanceSummary?.confirmed)
        assertEquals(1, state.attendanceSummary?.pending)
    }

    @Test
    fun `refresh failure surfaces error without crashing`() = runTest {
        val staffRepository = mockk<StaffRepository>()
        val eventRepository = mockk<EventRepository>()
        coEvery {
            eventRepository.getEventsByDateRangeFromApi(any(), any())
        } throws RuntimeException("network down")

        val vm = viewModel(staffRepository, eventRepository)
        advanceUntilIdle()

        val state = vm.uiState.value
        assertNotNull(state.errorMessage)
        assertTrue(state.upcomingEvents.isEmpty())
        vm.clearError()
        advanceUntilIdle()
        assertNull(vm.uiState.value.errorMessage)
    }

    @Test
    fun `portalDestinationForRole routes assistant to secretary portal`() {
        assertEquals(PortalDestination.SECRETARY, portalDestinationForRole("assistant"))
        assertEquals(PortalDestination.SECRETARY, portalDestinationForRole(" Assistant "))
        assertEquals(PortalDestination.TEAM_MEMBER, portalDestinationForRole("team_member"))
        assertEquals(PortalDestination.ORGANIZER, portalDestinationForRole("organizer"))
        assertEquals(PortalDestination.ORGANIZER, portalDestinationForRole(null))
        assertEquals(PortalDestination.ORGANIZER, portalDestinationForRole(""))
    }
}
