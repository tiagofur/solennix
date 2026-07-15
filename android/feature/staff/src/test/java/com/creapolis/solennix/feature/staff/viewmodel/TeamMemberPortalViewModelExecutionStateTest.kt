package com.creapolis.solennix.feature.staff.viewmodel

import com.creapolis.solennix.core.data.repository.StaffRepository
import com.creapolis.solennix.core.model.AssignmentExecutionState
import com.creapolis.solennix.core.model.ExecutionChecklist
import com.creapolis.solennix.core.model.TeamMemberAssignment
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.coVerifyOrder
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

/**
 * P0 harden for Android execution-state (#1003), parity with iOS #1001.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class TeamMemberPortalViewModelExecutionStateTest {

    private val dispatcher = StandardTestDispatcher()
    private val staffRepository = mockk<StaffRepository>(relaxed = true)
    private lateinit var viewModel: TeamMemberPortalViewModel

    private val assignment = TeamMemberAssignment(
        eventStaffId = "es_1",
        eventId = "ev_1",
        eventName = "Boda Ana",
        eventDate = "2026-03-10",
        staffId = "st_7",
        status = "confirmed"
    )

    @BeforeEach
    fun setUp() {
        Dispatchers.setMain(dispatcher)
        coEvery { staffRepository.getMyAssignments() } returns emptyList()
        coEvery { staffRepository.getMyTimeline(any(), any()) } returns emptyList()
        coEvery { staffRepository.getMyUnavailableDates(any(), any()) } returns emptyList()
        viewModel = TeamMemberPortalViewModel(staffRepository)
        // Drain init refresh
        dispatcher.scheduler.advanceUntilIdle()
    }

    @AfterEach
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `GET fail without legacy leaves cache unset and FAILED — no sticky DEFAULT`() = runTest(dispatcher) {
        coEvery { staffRepository.getExecutionState("es_1") } throws RuntimeException("offline")

        viewModel.loadExecutionState(assignment)
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertFalse(state.executionStates.containsKey("es_1"))
        assertEquals(ExecutionLoadState.FAILED, state.executionLoadStates["es_1"])
        assertEquals(
            TeamMemberPortalViewModel.EXECUTION_LOAD_ERROR,
            state.executionErrorMessages["es_1"]
        )
        assertEquals(false, state.executionServerSeeded["es_1"])
    }

    @Test
    fun `GET fail with non-default legacy seeds offline READY without PUT`() = runTest(dispatcher) {
        coEvery { staffRepository.getExecutionState("es_1") } throws RuntimeException("offline")
        var legacyCleared = false
        val legacy = TeamMemberPortalViewModel.LegacyExecutionState(
            arrival = true,
            materials = true,
            quickNote = "offline note"
        )

        viewModel.loadExecutionState(assignment, legacy) { legacyCleared = true }
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertEquals(ExecutionLoadState.READY, state.executionLoadStates["es_1"])
        assertEquals(false, state.executionServerSeeded["es_1"])
        assertTrue(state.executionStates["es_1"]?.checklist?.arrival == true)
        assertEquals("offline note", state.executionStates["es_1"]?.quickNote)
        assertFalse(legacyCleared)
        coVerify(exactly = 0) { staffRepository.putExecutionState(any(), any()) }
    }

    @Test
    fun `legacy migrate GET-first empty server PUT then clear legacy only on ack`() = runTest(dispatcher) {
        coEvery { staffRepository.getExecutionState("es_1") } returns AssignmentExecutionState.DEFAULT
        coEvery { staffRepository.putExecutionState("es_1", any()) } answers {
            secondArg()
        }
        var legacyCleared = false
        val legacy = TeamMemberPortalViewModel.LegacyExecutionState(
            arrival = true,
            materials = false,
            quickNote = "migrate me"
        )

        viewModel.loadExecutionState(assignment, legacy) { legacyCleared = true }
        advanceUntilIdle()

        assertTrue(legacyCleared)
        assertEquals(true, viewModel.uiState.value.executionServerSeeded["es_1"])
        assertEquals(ExecutionLoadState.READY, viewModel.uiState.value.executionLoadStates["es_1"])
        coVerifyOrder {
            staffRepository.getExecutionState("es_1")
            staffRepository.putExecutionState("es_1", match { it.quickNote == "migrate me" && it.checklist.arrival })
        }
    }

    @Test
    fun `legacy migrate PUT fail keeps legacy and does not call onLegacyCleared`() = runTest(dispatcher) {
        coEvery { staffRepository.getExecutionState("es_1") } returns AssignmentExecutionState.DEFAULT
        coEvery { staffRepository.putExecutionState("es_1", any()) } throws RuntimeException("500")
        var legacyCleared = false
        val legacy = TeamMemberPortalViewModel.LegacyExecutionState(arrival = true, quickNote = "keep")

        viewModel.loadExecutionState(assignment, legacy) { legacyCleared = true }
        advanceUntilIdle()

        assertFalse(legacyCleared)
        assertEquals(ExecutionLoadState.FAILED, viewModel.uiState.value.executionLoadStates["es_1"])
        assertFalse(viewModel.uiState.value.executionStates.containsKey("es_1"))
    }

    @Test
    fun `merge non-default server and richer legacy ORs checklist and prefers longer note`() = runTest(dispatcher) {
        val server = AssignmentExecutionState(
            checklist = ExecutionChecklist(arrival = true, materials = false, closing = false),
            quickNote = "srv"
        )
        coEvery { staffRepository.getExecutionState("es_1") } returns server
        coEvery { staffRepository.putExecutionState("es_1", any()) } answers { secondArg() }
        var legacyCleared = false
        val legacy = TeamMemberPortalViewModel.LegacyExecutionState(
            arrival = false,
            materials = true,
            closing = false,
            quickNote = "legacy longer note"
        )

        viewModel.loadExecutionState(assignment, legacy) { legacyCleared = true }
        advanceUntilIdle()

        val merged = viewModel.uiState.value.executionStates["es_1"]!!
        assertTrue(merged.checklist.arrival)
        assertTrue(merged.checklist.materials)
        assertEquals("legacy longer note", merged.quickNote)
        assertTrue(legacyCleared)
        coVerify {
            staffRepository.putExecutionState(
                "es_1",
                match { it.checklist.arrival && it.checklist.materials && it.quickNote == "legacy longer note" }
            )
        }
    }

    @Test
    fun `merge equal to server clears legacy without PUT`() = runTest(dispatcher) {
        val server = AssignmentExecutionState(
            checklist = ExecutionChecklist(arrival = true, materials = true, closing = false),
            quickNote = "same"
        )
        coEvery { staffRepository.getExecutionState("es_1") } returns server
        var legacyCleared = false
        // Legacy subset already covered by server OR → merged == server
        val legacy = TeamMemberPortalViewModel.LegacyExecutionState(
            arrival = true,
            materials = false,
            quickNote = "same"
        )

        viewModel.loadExecutionState(assignment, legacy) { legacyCleared = true }
        advanceUntilIdle()

        assertTrue(legacyCleared)
        assertEquals(server, viewModel.uiState.value.executionStates["es_1"])
        coVerify(exactly = 0) { staffRepository.putExecutionState(any(), any()) }
    }

    @Test
    fun `putExecutionState is gated until READY`() = runTest(dispatcher) {
        // Force FAILED so state is not READY (no successful seed).
        coEvery { staffRepository.getExecutionState("es_1") } throws RuntimeException("offline")

        viewModel.loadExecutionState(assignment)
        advanceUntilIdle()
        assertEquals(ExecutionLoadState.FAILED, viewModel.uiState.value.executionLoadStates["es_1"])

        viewModel.putExecutionState(
            assignment,
            AssignmentExecutionState(checklist = ExecutionChecklist(arrival = true))
        )
        advanceUntilIdle()

        coVerify(exactly = 0) { staffRepository.putExecutionState(any(), any()) }
    }

    @Test
    fun `putExecutionState rolls back to lastSynced on hard fail`() = runTest(dispatcher) {
        val server = AssignmentExecutionState(
            checklist = ExecutionChecklist(arrival = true),
            quickNote = "seeded"
        )
        coEvery { staffRepository.getExecutionState("es_1") } returns server
        coEvery { staffRepository.putExecutionState("es_1", any()) } throws RuntimeException("422")

        viewModel.loadExecutionState(assignment)
        advanceUntilIdle()
        assertEquals(ExecutionLoadState.READY, viewModel.uiState.value.executionLoadStates["es_1"])

        val dirty = server.copy(checklist = server.checklist.copy(materials = true), quickNote = "dirty")
        viewModel.putExecutionState(assignment, dirty)
        advanceUntilIdle()

        assertEquals(server, viewModel.uiState.value.executionStates["es_1"])
        assertEquals(
            TeamMemberPortalViewModel.EXECUTION_SAVE_ERROR,
            viewModel.uiState.value.executionErrorMessages["es_1"]
        )
    }

    @Test
    fun `mergeExecutionStates equal-length different notes prefer legacy`() {
        val server = AssignmentExecutionState(quickNote = "AAAA")
        val legacy = AssignmentExecutionState(quickNote = "BBBB")
        val merged = TeamMemberPortalViewModel.mergeExecutionStates(server, legacy)
        assertEquals("BBBB", merged.quickNote)
    }

    @Test
    fun `server success short-circuits second load when server-seeded`() = runTest(dispatcher) {
        coEvery { staffRepository.getExecutionState("es_1") } returns AssignmentExecutionState.DEFAULT

        viewModel.loadExecutionState(assignment)
        advanceUntilIdle()
        viewModel.loadExecutionState(assignment)
        advanceUntilIdle()

        coVerify(exactly = 1) { staffRepository.getExecutionState("es_1") }
    }

    @Test
    fun `offline seed re-GETs on next open soft revalidate keeps live authority`() = runTest(dispatcher) {
        coEvery { staffRepository.getExecutionState("es_1") } throws RuntimeException("offline") andThen
            AssignmentExecutionState(checklist = ExecutionChecklist(arrival = true), quickNote = "from server")
        coEvery { staffRepository.putExecutionState("es_1", any()) } answers { secondArg() }
        val legacy = TeamMemberPortalViewModel.LegacyExecutionState(arrival = true, quickNote = "offline")

        viewModel.loadExecutionState(assignment, legacy)
        advanceUntilIdle()
        assertEquals(false, viewModel.uiState.value.executionServerSeeded["es_1"])

        // Soft revalidate: live offline cache is full-state authority (may PUT over server).
        viewModel.loadExecutionState(assignment, legacyPrefs = null)
        advanceUntilIdle()

        coVerify(exactly = 2) { staffRepository.getExecutionState("es_1") }
        assertEquals(true, viewModel.uiState.value.executionServerSeeded["es_1"])
        assertEquals("offline", viewModel.uiState.value.executionStates["es_1"]?.quickNote)
        coVerify {
            staffRepository.putExecutionState("es_1", match { it.quickNote == "offline" })
        }
    }

    @Test
    fun `mergeExecutionStates ORs checklist flags`() {
        val server = AssignmentExecutionState(
            checklist = ExecutionChecklist(arrival = true, materials = false, closing = false)
        )
        val legacy = AssignmentExecutionState(
            checklist = ExecutionChecklist(arrival = false, materials = true, closing = true)
        )
        val merged = TeamMemberPortalViewModel.mergeExecutionStates(server, legacy)
        assertTrue(merged.checklist.arrival)
        assertTrue(merged.checklist.materials)
        assertTrue(merged.checklist.closing)
    }
}
