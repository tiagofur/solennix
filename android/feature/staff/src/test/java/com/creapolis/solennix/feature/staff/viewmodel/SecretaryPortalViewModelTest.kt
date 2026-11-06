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
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runCurrent
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
        return SecretaryPortalViewModel(staffRepository, eventRepository, mockk<android.content.Context>(relaxed = true))
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
    fun `selectEvent rapid A then B keeps B data with B selected`() = runTest {
        // Rapid A→B taps must never let A's late response overwrite B's
        // selection (issue #1366).
        val staffRepository = mockk<StaffRepository>()
        val eventRepository = mockk<EventRepository>()
        coEvery {
            eventRepository.getEventsByDateRangeFromApi(any(), any())
        } returns listOf(event("e1", "2026-12-01"), event("e2", "2026-12-02"))
        coEvery { staffRepository.syncStaff() } returns Unit
        coEvery { staffRepository.getStaff() } returns MutableStateFlow(emptyList())

        val gateA = CompletableDeferred<List<EventStaff>>()
        coEvery { staffRepository.syncEventStaff("e1") } coAnswers { gateA.await() }
        coEvery { staffRepository.getEventStaffSummary("e1") } returns StaffAttendanceSummary(
            total = 1, confirmed = 1, pending = 0, declined = 0, cancelled = 0
        )
        coEvery { staffRepository.syncEventStaff("e2") } returns listOf(
            EventStaff(id = "esB", eventId = "e2", staffId = "s2", status = "pending")
        )
        coEvery { staffRepository.getEventStaffSummary("e2") } returns StaffAttendanceSummary(
            total = 1, confirmed = 0, pending = 1, declined = 0, cancelled = 0
        )

        val vm = viewModel(staffRepository, eventRepository)
        advanceUntilIdle()

        vm.selectEvent("e1")
        runCurrent() // A starts and suspends on the gate
        vm.selectEvent("e2") // B starts; A must be cancelled
        advanceUntilIdle() // B completes

        gateA.complete(
            listOf(EventStaff(id = "esA", eventId = "e1", staffId = "s1", status = "confirmed"))
        )
        advanceUntilIdle() // A's late answer must not overwrite B

        val state = vm.uiState.value
        assertEquals("e2", state.selectedEventId)
        assertEquals(listOf("esB"), state.eventStaff.map { it.id })
        assertNull(state.errorMessage)
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
        // Fail-closed (#1365): an unknown/absent role never lands in the
        // organizer app; it falls back to the least-privileged portal.
        assertEquals(PortalDestination.TEAM_MEMBER, portalDestinationForRole(null))
        assertEquals(PortalDestination.TEAM_MEMBER, portalDestinationForRole(""))
        assertEquals(PortalDestination.TEAM_MEMBER, portalDestinationForRole("   "))
    }
}
