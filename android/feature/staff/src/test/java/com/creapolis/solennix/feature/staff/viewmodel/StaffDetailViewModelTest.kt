package com.creapolis.solennix.feature.staff.viewmodel

import androidx.lifecycle.SavedStateHandle
import com.creapolis.solennix.core.data.repository.StaffRepository
import com.creapolis.solennix.core.model.Staff
import com.creapolis.solennix.core.model.StaffInviteResponse
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

@OptIn(ExperimentalCoroutinesApi::class)
class StaffDetailViewModelTest {

    private val dispatcher = StandardTestDispatcher()

    private fun authManager(): com.creapolis.solennix.core.network.AuthManager {
        val authManager = io.mockk.mockk<com.creapolis.solennix.core.network.AuthManager>()
        io.mockk.every { authManager.currentUser } returns kotlinx.coroutines.flow.MutableStateFlow(null)
        return authManager
    }

    private fun appContext(): android.content.Context {
        val context = io.mockk.mockk<android.content.Context>()
        io.mockk.every { context.getString(any()) } returns ""
        io.mockk.every {
            context.getString(com.creapolis.solennix.feature.staff.R.string.staff_invite_created)
        } returns "Invitación creada correctamente."
        return context
    }

    @BeforeEach
    fun setUp() {
        Dispatchers.setMain(dispatcher)
    }

    @AfterEach
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `invite access shows feedback when email is missing`() = runTest {
        val repository = mockk<StaffRepository>()
        coEvery { repository.getStaffMember("s1") } returns Staff(id = "s1", name = "Ana")

        val viewModel = StaffDetailViewModel(repository, authManager(), SavedStateHandle(mapOf("staffId" to "s1")), appContext())
        val collector = backgroundScope.launch { viewModel.uiState.collect { } }
        advanceUntilIdle()

        viewModel.inviteAccess()
        advanceUntilIdle()

        assertEquals(
            "Este colaborador necesita email para activar acceso.",
            viewModel.uiState.value.inviteFeedback
        )
        assertTrue(viewModel.uiState.value.inviteFeedbackIsError)
        coVerify(exactly = 0) { repository.inviteStaffUser(any()) }
        collector.cancel()
    }

    @Test
    fun `invite stores server status so pending survives without in-memory url`() = runTest {
        val repository = mockk<StaffRepository>()
        coEvery { repository.getStaffMember("s1") } returns Staff(
            id = "s1",
            name = "Ana",
            email = "ana@example.com"
        )
        coEvery { repository.inviteStaffUser("s1") } returns StaffInviteResponse(
            inviteId = "i1",
            staffId = "s1",
            email = "ana@example.com",
            status = "pending",
            acceptUrl = "https://example.com/invite-1",
            expiresAt = "2026-05-13T00:00:00Z",
            createdAt = "2026-05-13T00:00:00Z"
        )

        val viewModel = StaffDetailViewModel(repository, authManager(), SavedStateHandle(mapOf("staffId" to "s1")), appContext())
        val collector = backgroundScope.launch { viewModel.uiState.collect { } }
        advanceUntilIdle()

        viewModel.inviteAccess()
        advanceUntilIdle()

        assertEquals("pending", viewModel.uiState.value.staff?.inviteStatus)
        assertTrue(viewModel.uiState.value.hasPendingInvite)
        collector.cancel()
    }

    @Test
    fun `pending invite from server shows without in-memory url`() = runTest {
        val repository = mockk<StaffRepository>()
        coEvery { repository.getStaffMember("s1") } returns Staff(
            id = "s1",
            name = "Ana",
            email = "ana@example.com",
            inviteStatus = "pending"
        )

        val viewModel = StaffDetailViewModel(repository, authManager(), SavedStateHandle(mapOf("staffId" to "s1")), appContext())
        val collector = backgroundScope.launch { viewModel.uiState.collect { } }
        advanceUntilIdle()

        assertEquals(null, viewModel.uiState.value.inviteUrl)
        assertTrue(viewModel.uiState.value.hasPendingInvite)
        collector.cancel()
    }

    @Test
    fun `re-invite rotates url when pending without in-memory url`() = runTest {
        val repository = mockk<StaffRepository>()
        coEvery { repository.getStaffMember("s1") } returns Staff(
            id = "s1",
            name = "Ana",
            email = "ana@example.com",
            inviteStatus = "pending"
        )
        coEvery { repository.inviteStaffUser("s1") } returnsMany listOf(
            StaffInviteResponse(
                inviteId = "i1",
                staffId = "s1",
                email = "ana@example.com",
                status = "pending",
                acceptUrl = "https://example.com/invite-1",
                expiresAt = "2026-05-13T00:00:00Z",
                createdAt = "2026-05-13T00:00:00Z"
            ),
            StaffInviteResponse(
                inviteId = "i2",
                staffId = "s1",
                email = "ana@example.com",
                status = "pending",
                acceptUrl = "https://example.com/invite-2",
                expiresAt = "2026-05-13T00:00:00Z",
                createdAt = "2026-05-13T00:00:00Z"
            )
        )

        val viewModel = StaffDetailViewModel(repository, authManager(), SavedStateHandle(mapOf("staffId" to "s1")), appContext())
        val collector = backgroundScope.launch { viewModel.uiState.collect { } }
        advanceUntilIdle()

        viewModel.inviteAccess()
        advanceUntilIdle()
        viewModel.inviteAccess()
        advanceUntilIdle()

        assertEquals("https://example.com/invite-2", viewModel.uiState.value.inviteUrl)
        coVerify(exactly = 2) { repository.inviteStaffUser("s1") }
        collector.cancel()
    }

    @Test
    fun `refresh reloads invite status from server`() = runTest {
        val repository = mockk<StaffRepository>()
        coEvery { repository.getStaffMember("s1") } returns Staff(
            id = "s1",
            name = "Ana",
            email = "ana@example.com"
        )

        val viewModel = StaffDetailViewModel(repository, authManager(), SavedStateHandle(mapOf("staffId" to "s1")), appContext())
        val collector = backgroundScope.launch { viewModel.uiState.collect { } }
        advanceUntilIdle()
        assertFalse(viewModel.uiState.value.hasPendingInvite)

        coEvery { repository.getStaffMember("s1") } returns Staff(
            id = "s1",
            name = "Ana",
            email = "ana@example.com",
            inviteStatus = "pending"
        )
        viewModel.refreshInviteStatus()
        advanceUntilIdle()

        assertEquals("pending", viewModel.uiState.value.staff?.inviteStatus)
        assertTrue(viewModel.uiState.value.hasPendingInvite)
        collector.cancel()
    }

    @Test
    fun `delete staff marks success and invite creates url`() = runTest {
        val repository = mockk<StaffRepository>()
        coEvery { repository.getStaffMember("s1") } returns Staff(
            id = "s1",
            name = "Ana",
            email = "ana@example.com"
        )
        coEvery { repository.inviteStaffUser("s1") } returns StaffInviteResponse(
            inviteId = "i1",
            staffId = "s1",
            email = "ana@example.com",
            status = "pending",
            acceptUrl = "https://example.com/invite",
            expiresAt = "2026-05-13T00:00:00Z",
            createdAt = "2026-05-13T00:00:00Z"
        )
        coEvery { repository.deleteStaff("s1") } returns Unit

        val viewModel = StaffDetailViewModel(repository, authManager(), SavedStateHandle(mapOf("staffId" to "s1")), appContext())
        val collector = backgroundScope.launch { viewModel.uiState.collect { } }
        advanceUntilIdle()

        viewModel.inviteAccess()
        advanceUntilIdle()
        viewModel.deleteStaff()
        advanceUntilIdle()

        assertEquals("https://example.com/invite", viewModel.uiState.value.inviteUrl)
        assertTrue(viewModel.uiState.value.inviteFeedback?.contains("correctamente") == true)
        assertTrue(viewModel.deleteSuccess)
        assertFalse(viewModel.uiState.value.isLoading)
        coVerify(exactly = 1) { repository.inviteStaffUser("s1") }
        coVerify(exactly = 1) { repository.deleteStaff("s1") }
        collector.cancel()
    }
}
