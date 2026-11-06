package com.creapolis.solennix.feature.staff.viewmodel

import androidx.lifecycle.SavedStateHandle
import com.creapolis.solennix.core.data.repository.StaffRepository
import com.creapolis.solennix.core.model.Plan
import com.creapolis.solennix.core.model.Staff
import com.creapolis.solennix.core.model.StaffInviteResponse
import com.creapolis.solennix.core.model.User
import com.creapolis.solennix.core.network.AuthManager
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
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
class StaffInviteTargetRoleTest {

    private val dispatcher = StandardTestDispatcher()

    @BeforeEach
    fun setUp() {
        Dispatchers.setMain(dispatcher)
    }

    @AfterEach
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun authManagerWithPlan(plan: Plan?): AuthManager {
        val authManager = mockk<AuthManager>()
        val user = plan?.let { User(id = "u1", email = "org@example.com", name = "Org", plan = it) }
        every { authManager.currentUser } returns MutableStateFlow(user)
        return authManager
    }

    private fun inviteResponse() = StaffInviteResponse(
        inviteId = "i1",
        staffId = "s1",
        email = "ana@example.com",
        status = "pending",
        acceptUrl = "https://example.com/invite",
        expiresAt = "2026-05-13T00:00:00Z",
        createdAt = "2026-05-13T00:00:00Z"
    )

    private fun repositoryWithInvite(): StaffRepository {
        val repository = mockk<StaffRepository>()
        coEvery { repository.getStaffMember("s1") } returns Staff(
            id = "s1",
            name = "Ana",
            email = "ana@example.com"
        )
        coEvery { repository.inviteStaffUser(any(), any()) } returns inviteResponse()
        return repository
    }

    @Test
    fun `invite defaults to team_member role`() = runTest {
        val repository = repositoryWithInvite()
        val viewModel = StaffDetailViewModel(
            repository,
            authManagerWithPlan(Plan.BUSINESS),
            SavedStateHandle(mapOf("staffId" to "s1")),
            mockk<android.content.Context>(relaxed = true)
        )
        val collector = backgroundScope.launch { viewModel.uiState.collect { } }
        advanceUntilIdle()

        viewModel.inviteAccess()
        advanceUntilIdle()

        coVerify(exactly = 1) { repository.inviteStaffUser("s1", "team_member") }
        collector.cancel()
    }

    @Test
    fun `assistant invite sends assistant target_role on Business plan`() = runTest {
        val repository = repositoryWithInvite()
        val viewModel = StaffDetailViewModel(
            repository,
            authManagerWithPlan(Plan.BUSINESS),
            SavedStateHandle(mapOf("staffId" to "s1")),
            mockk<android.content.Context>(relaxed = true)
        )
        val collector = backgroundScope.launch { viewModel.uiState.collect { } }
        advanceUntilIdle()

        assertTrue(viewModel.uiState.value.canInviteAsAssistant)
        viewModel.setInviteTargetRole("assistant")
        advanceUntilIdle()
        assertEquals("assistant", viewModel.uiState.value.inviteTargetRole)

        viewModel.inviteAccess()
        advanceUntilIdle()

        coVerify(exactly = 1) { repository.inviteStaffUser("s1", "assistant") }
        collector.cancel()
    }

    @Test
    fun `assistant role is blocked without Business plan`() = runTest {
        for (plan in listOf(Plan.BASIC, Plan.PRO, null)) {
            val repository = repositoryWithInvite()
            val viewModel = StaffDetailViewModel(
                repository,
                authManagerWithPlan(plan),
                SavedStateHandle(mapOf("staffId" to "s1")),
                mockk<android.content.Context>(relaxed = true)
            )
            val collector = backgroundScope.launch { viewModel.uiState.collect { } }
            advanceUntilIdle()

            assertFalse(viewModel.uiState.value.canInviteAsAssistant)
            viewModel.setInviteTargetRole("assistant")
            advanceUntilIdle()
            assertEquals("team_member", viewModel.uiState.value.inviteTargetRole)

            viewModel.inviteAccess()
            advanceUntilIdle()

            coVerify(exactly = 1) { repository.inviteStaffUser("s1", "team_member") }
            collector.cancel()
        }
    }
}
