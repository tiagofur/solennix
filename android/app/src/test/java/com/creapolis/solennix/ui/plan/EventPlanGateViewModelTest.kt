package com.creapolis.solennix.ui.plan

import com.creapolis.solennix.core.data.plan.LimitCheckResult
import com.creapolis.solennix.core.data.plan.PlanLimitsManager
import com.creapolis.solennix.core.model.Plan
import com.creapolis.solennix.core.model.User
import com.creapolis.solennix.core.network.AuthManager
import io.mockk.coEvery
import io.mockk.every
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
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

/**
 * The centralized gate (#830): every "create new event" entrypoint consults
 * this VM before navigating to event_form. These tests pin the contract the
 * navigation layer relies on — `isLimitReached` + `limitReachedMessage`.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class EventPlanGateViewModelTest {

    private val planLimitsManager = mockk<PlanLimitsManager>(relaxed = true)
    private val authManager = mockk<AuthManager>(relaxed = true)
    private val dispatcher = StandardTestDispatcher()

    @BeforeEach
    fun setUp() {
        Dispatchers.setMain(dispatcher)
        every { authManager.currentUser } returns MutableStateFlow(
            User(id = "user-1", email = "a@b.com", name = "Juan", plan = Plan.BASIC)
        )
    }

    @AfterEach
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `isLimitReached is true and message exposed when limit reached`() = runTest {
        val reached = LimitCheckResult.LimitReached(
            feature = "events", current = 4, limit = 4,
            message = "Has alcanzado el límite de 4 eventos este mes."
        )
        coEvery { planLimitsManager.canCreateEvent(Plan.BASIC) } returns reached

        val vm = EventPlanGateViewModel(planLimitsManager, authManager)
        advanceUntilIdle()

        assertTrue(vm.isLimitReached)
        assertEquals(reached.message, vm.limitReachedMessage)
    }

    @Test
    fun `isLimitReached is false when near limit`() = runTest {
        coEvery { planLimitsManager.canCreateEvent(Plan.BASIC) } returns LimitCheckResult.NearLimit(
            feature = "events", current = 3, limit = 4, remaining = 1
        )

        val vm = EventPlanGateViewModel(planLimitsManager, authManager)
        advanceUntilIdle()

        // Near-limit is a warning, not a hard block — navigation must proceed.
        assertFalse(vm.isLimitReached)
        assertNotNull(vm.limitCheckResult)
    }

    @Test
    fun `isLimitReached is false when allowed`() = runTest {
        coEvery { planLimitsManager.canCreateEvent(Plan.BASIC) } returns LimitCheckResult.Allowed

        val vm = EventPlanGateViewModel(planLimitsManager, authManager)
        advanceUntilIdle()

        assertFalse(vm.isLimitReached)
    }

    @Test
    fun `checkLimit refreshes after events are deleted`() = runTest {
        // Initially at cap
        coEvery { planLimitsManager.canCreateEvent(Plan.BASIC) } returns LimitCheckResult.LimitReached(
            feature = "events", current = 4, limit = 4,
            message = "Has alcanzado el límite de 4 eventos este mes."
        )
        val vm = EventPlanGateViewModel(planLimitsManager, authManager)
        advanceUntilIdle()
        assertTrue(vm.isLimitReached)

        // After a deletion the count drops, gate re-opens
        coEvery { planLimitsManager.canCreateEvent(Plan.BASIC) } returns LimitCheckResult.Allowed
        vm.checkLimit()
        advanceUntilIdle()

        assertFalse(vm.isLimitReached)
    }
}
