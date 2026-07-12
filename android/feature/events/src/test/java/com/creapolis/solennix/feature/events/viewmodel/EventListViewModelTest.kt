package com.creapolis.solennix.feature.events.viewmodel

import android.content.Context
import com.creapolis.solennix.core.data.plan.LimitCheckResult
import com.creapolis.solennix.core.data.plan.PlanLimitsManager
import com.creapolis.solennix.core.data.repository.ClientRepository
import com.creapolis.solennix.core.data.repository.EventRepository
import com.creapolis.solennix.core.model.Plan
import com.creapolis.solennix.core.model.User
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.AuthManager
import com.creapolis.solennix.core.network.log.SolennixLogger
import com.creapolis.solennix.core.designsystem.R as DesignSystemR
import io.mockk.coEvery
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.flowOf
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

/**
 * Covers the plan-limit gating surface added in #830: the list VM exposes
 * `limitCheckResult` / `nearLimitMessage` / `limitReachedMessage` so the
 * EventsScreen can show a proactive UpgradeBanner before the hard block
 * fires in the FAB/quick-action.
 */
@OptIn(ExperimentalCoroutinesApi::class)
class EventListViewModelTest {

    private val appContext = mockk<Context>(relaxed = true)
    private val eventRepository = mockk<EventRepository>(relaxed = true)
    private val clientRepository = mockk<ClientRepository>(relaxed = true)
    private val apiService = mockk<ApiService>(relaxed = true)
    private val logger = mockk<SolennixLogger>(relaxed = true)
    private val planLimitsManager = mockk<PlanLimitsManager>(relaxed = true)
    private val authManager = mockk<AuthManager>(relaxed = true)
    private val widgetSyncTrigger = mockk<com.creapolis.solennix.core.data.widget.WidgetSyncTrigger>(relaxed = true)

    private val dispatcher = StandardTestDispatcher()

    @BeforeEach
    fun setUp() {
        Dispatchers.setMain(dispatcher)
        every { appContext.getString(any()) } returns ""
        every { appContext.getString(any(), *anyVararg()) } answers {
            val resId = firstArg<Int>()
            val args = secondArg<Array<out Any>>()
            when (resId) {
                DesignSystemR.string.plan_limit_events_near ->
                    "Te quedan ${args[0]} eventos disponibles este mes."
                DesignSystemR.string.plan_limit_events_reached ->
                    "Has alcanzado el límite de ${args[0]} eventos este mes."
                else -> ""
            }
        }
        every { eventRepository.getEvents() } returns flowOf(emptyList())
        every { clientRepository.getClients() } returns flowOf(emptyList())
        every { authManager.currentUser } returns MutableStateFlow(
            User(id = "user-1", email = "a@b.com", name = "Juan", plan = Plan.BASIC)
        )
        coEvery { eventRepository.syncEvents() } returns Unit
        coEvery { clientRepository.syncClients() } returns Unit
        // loadUnavailableDatesForCurrentMonth is called from refresh(); stub the API call.
        coEvery {
            apiService.get<List<com.creapolis.solennix.core.model.UnavailableDate>>(
                any(), any(), any()
            )
        } returns emptyList()
    }

    @AfterEach
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `nearLimitMessage is populated when plan limit is NearLimit`() = runTest {
        coEvery { planLimitsManager.canCreateEvent(Plan.BASIC) } returns LimitCheckResult.NearLimit(
            feature = "events", current = 3, limit = 4, remaining = 1
        )

        val vm = EventListViewModel(
            appContext, eventRepository, clientRepository, apiService, logger,
            widgetSyncTrigger, planLimitsManager, authManager
        )
        advanceUntilIdle()

        assertTrue(vm.limitCheckResult is LimitCheckResult.NearLimit)
        assertNotNull(vm.nearLimitMessage)
        assertEquals(1, (vm.limitCheckResult as LimitCheckResult.NearLimit).remaining)
    }

    @Test
    fun `limitReachedMessage is populated and isLimitReached is true at cap`() = runTest {
        coEvery { planLimitsManager.canCreateEvent(Plan.BASIC) } returns LimitCheckResult.LimitReached(
            feature = "events", current = 4, limit = 4,
            message = "Has alcanzado el límite de 4 eventos este mes."
        )

        val vm = EventListViewModel(
            appContext, eventRepository, clientRepository, apiService, logger,
            widgetSyncTrigger, planLimitsManager, authManager
        )
        advanceUntilIdle()

        assertTrue(vm.isLimitReached)
        assertNotNull(vm.limitReachedMessage)
    }

    @Test
    fun `no banner when plan limit is Allowed`() = runTest {
        coEvery { planLimitsManager.canCreateEvent(Plan.BASIC) } returns LimitCheckResult.Allowed

        val vm = EventListViewModel(
            appContext, eventRepository, clientRepository, apiService, logger,
            widgetSyncTrigger, planLimitsManager, authManager
        )
        advanceUntilIdle()

        assertNull(vm.nearLimitMessage)
        assertNull(vm.limitReachedMessage)
        assertEquals(false, vm.isLimitReached)
    }

    @Test
    fun `refresh re-evaluates the plan limit after sync`() = runTest {
        // First emission: near limit
        coEvery { planLimitsManager.canCreateEvent(Plan.BASIC) } returns LimitCheckResult.NearLimit(
            feature = "events", current = 3, limit = 4, remaining = 1
        )

        val vm = EventListViewModel(
            appContext, eventRepository, clientRepository, apiService, logger,
            widgetSyncTrigger, planLimitsManager, authManager
        )
        advanceUntilIdle()
        assertTrue(vm.limitCheckResult is LimitCheckResult.NearLimit)

        // After a refresh (event deleted), the limit lifts
        coEvery { planLimitsManager.canCreateEvent(Plan.BASIC) } returns LimitCheckResult.Allowed
        vm.refresh()
        advanceUntilIdle()

        assertNull(vm.nearLimitMessage)
        assertEquals(false, vm.isLimitReached)
    }
}
