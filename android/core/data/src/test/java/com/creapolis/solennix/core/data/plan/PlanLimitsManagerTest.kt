package com.creapolis.solennix.core.data.plan

import android.content.Context
import com.creapolis.solennix.core.data.repository.ClientRepository
import com.creapolis.solennix.core.data.repository.EventRepository
import com.creapolis.solennix.core.data.repository.InventoryRepository
import com.creapolis.solennix.core.data.repository.ProductRepository
import com.creapolis.solennix.core.model.InventoryItem
import com.creapolis.solennix.core.model.InventoryType
import com.creapolis.solennix.core.model.Plan
import com.creapolis.solennix.core.model.User
import com.creapolis.solennix.core.network.AuthManager
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.time.LocalDate
import java.time.YearMonth

/**
 * Unit tests for [PlanLimitsManager].
 *
 * Pins the free-tier (BASIC) usage caps, the near-limit/limit-reached
 * thresholds, the server-then-cache fallback for the monthly event count,
 * and the tenant (`user_id`) scoping of the offline fallback query.
 *
 * Parity reference: the iOS `PlanLimitsManagerTests` use the same numeric
 * fixtures (free event limit = 4, clients = 20, products = 15, inventory = 30,
 * catalog = 20). Those mirror the [PlanLimitsManager] companion constants.
 *
 * The [Context] dependency is mocked because [PlanLimitsManager] resolves its
 * localized limit-reached messages via `appContext.getString(...)`. We don't
 * assert on the exact message text (that belongs in the designsystem string
 * resources); instead we assert on the structured [LimitCheckResult] fields.
 */
class PlanLimitsManagerTest {

    private lateinit var manager: PlanLimitsManager

    private val appContext = mockk<Context>(relaxed = true)
    private val eventRepository = mockk<EventRepository>(relaxed = true)
    private val clientRepository = mockk<ClientRepository>(relaxed = true)
    private val productRepository = mockk<ProductRepository>(relaxed = true)
    private val inventoryRepository = mockk<InventoryRepository>(relaxed = true)
    private val authManager = mockk<AuthManager>(relaxed = true)

    @BeforeEach
    fun setUp() {
        // getString(resId, formatArgs...) returns a non-null message so the
        // LimitReached branches compile without touching real Android resources.
        every { appContext.getString(any<Int>(), any<Int>()) } returns "limit reached"
        manager = PlanLimitsManager(
            appContext,
            eventRepository,
            clientRepository,
            productRepository,
            inventoryRepository,
            authManager
        )
        // Default usage stubs (used by canCreate* and getUsage()).
        every { clientRepository.getClientCount() } returns flowOf(0)
        every { productRepository.getActiveProductCount() } returns flowOf(0)
        every { inventoryRepository.getInventoryItems() } returns flowOf(emptyList())
    }

    // --- getLimits: BASIC caps match the iOS free-tier fixture (#852 parity) ---

    @Test
    fun `getLimits BASIC returns the documented free-tier caps`() {
        val limits = manager.getLimits(Plan.BASIC)

        assertEquals(PlanLimitsManager.BASIC_EVENTS_PER_MONTH, limits.eventsPerMonth)
        assertEquals(PlanLimitsManager.BASIC_CLIENTS_TOTAL, limits.totalClients)
        assertEquals(PlanLimitsManager.BASIC_PRODUCTS_TOTAL, limits.totalProducts)
        assertEquals(PlanLimitsManager.BASIC_INVENTORY_TOTAL, limits.totalInventory)
        assertEquals(PlanLimitsManager.BASIC_CATALOG_TOTAL, limits.totalCatalog)
        assertEquals(false, limits.hasAdvancedReports)
        assertEquals(false, limits.hasCustomBranding)
        assertEquals(false, limits.hasPrioritySupport)
    }

    // --- getLimits: paid plans are uncapped and feature-unlocked ---

    @Test
    fun `getLimits returns unlimited caps for every paid plan`() {
        for (plan in listOf(Plan.PRO, Plan.PREMIUM, Plan.BUSINESS)) {
            val limits = manager.getLimits(plan)
            assertEquals(Int.MAX_VALUE, limits.eventsPerMonth, "events for $plan")
            assertEquals(Int.MAX_VALUE, limits.totalClients, "clients for $plan")
            assertEquals(Int.MAX_VALUE, limits.totalProducts, "products for $plan")
            assertEquals(Int.MAX_VALUE, limits.totalInventory, "inventory for $plan")
            assertEquals(Int.MAX_VALUE, limits.totalCatalog, "catalog for $plan")
            assertTrue(limits.hasAdvancedReports, "advanced reports for $plan")
            assertTrue(limits.hasCustomBranding, "branding for $plan")
        }
    }

    @Test
    fun `getLimits reserves priority support for BUSINESS`() {
        assertTrue(manager.getLimits(Plan.BUSINESS).hasPrioritySupport)
        assertEquals(false, manager.getLimits(Plan.PRO).hasPrioritySupport)
        assertEquals(false, manager.getLimits(Plan.PREMIUM).hasPrioritySupport)
    }

    // --- canCreateEvent: API-sourced monthly count drives the gate ---

    @Test
    fun `canCreateEvent allows when below the free event cap`() = runTest {
        stubEventsFromApi(count = 2)

        assertEquals(LimitCheckResult.Allowed, manager.canCreateEvent(Plan.BASIC))
    }

    @Test
    fun `canCreateEvent reports near-limit one slot before the cap`() = runTest {
        stubEventsFromApi(count = PlanLimitsManager.BASIC_EVENTS_PER_MONTH - 1)

        val result = manager.canCreateEvent(Plan.BASIC)

        assertTrue(result is LimitCheckResult.NearLimit)
        result as LimitCheckResult.NearLimit
        assertEquals("events", result.feature)
        assertEquals(PlanLimitsManager.BASIC_EVENTS_PER_MONTH, result.limit)
        assertEquals(1, result.remaining)
    }

    @Test
    fun `canCreateEvent blocks at the free event cap`() = runTest {
        stubEventsFromApi(count = PlanLimitsManager.BASIC_EVENTS_PER_MONTH)

        val result = manager.canCreateEvent(Plan.BASIC)

        assertTrue(result is LimitCheckResult.LimitReached)
        result as LimitCheckResult.LimitReached
        assertEquals("events", result.feature)
        assertEquals(PlanLimitsManager.BASIC_EVENTS_PER_MONTH, result.limit)
        assertEquals(PlanLimitsManager.BASIC_EVENTS_PER_MONTH, result.current)
        // Message comes from appContext.getString(...) — mocked; just assert non-blank.
        assertTrue(result.message.isNotBlank(), "message: ${result.message}")
    }

    @Test
    fun `canCreateEvent is always allowed for paid plans`() = runTest {
        // Paid plans short-circuit before counting events, so the API is never hit.
        for (plan in listOf(Plan.PRO, Plan.PREMIUM, Plan.BUSINESS)) {
            coEvery { eventRepository.getEventsByDateRangeFromApi(any(), any()) } throws IllegalStateException("must not be called")
            assertEquals(LimitCheckResult.Allowed, manager.canCreateEvent(plan))
        }
    }

    // --- canCreateEvent: month-boundary query params ---

    @Test
    fun `canCreateEvent queries a half-open month range keyed to the current month`() = runTest {
        stubEventsFromApi(count = 0)

        manager.canCreateEvent(Plan.BASIC)

        val now = YearMonth.now()
        val expectedStart = now.atDay(1).toString()
        val expectedEnd = now.plusMonths(1).atDay(1).toString()
        coVerify {
            eventRepository.getEventsByDateRangeFromApi(expectedStart, expectedEnd)
        }
    }

    @Test
    fun `canCreateEvent month range is half-open - first of next month excluded`() = runTest {
        // The range passed to the API is [firstOfMonth, firstOfNextMonth). Verify
        // that the end param is the *first day of next month*, not the last day
        // of this month — this is the half-open contract distinct from iOS's
        // inclusive range, and pinning it guards against an off-by-one that would
        // silently drop/leak month-boundary events.
        stubEventsFromApi(count = 0)

        manager.canCreateEvent(Plan.BASIC)

        val now = YearMonth.now()
        coVerify {
            eventRepository.getEventsByDateRangeFromApi(
                now.atDay(1).toString(),
                now.plusMonths(1).atDay(1).toString()
            )
        }
    }

    // --- canCreateEvent: offline fallback scoping (user_id + month range) ---

    @Test
    fun `canCreateEvent falls back to user-scoped cache count when the API errors`() = runTest {
        coEvery { eventRepository.getEventsByDateRangeFromApi(any(), any()) } throws RuntimeException("offline")
        every { authManager.currentUser } returns MutableStateFlow(user(id = "user-7"))
        every {
            eventRepository.getEventCountForMonth("user-7", any(), any())
        } returns flowOf(1)

        val result = manager.canCreateEvent(Plan.BASIC)

        assertEquals(LimitCheckResult.Allowed, result)
        val now = YearMonth.now()
        coVerify {
            eventRepository.getEventCountForMonth(
                "user-7",
                now.atDay(1).toString(),
                now.plusMonths(1).atDay(1).toString()
            )
        }
    }

    @Test
    fun `canCreateEvent offline fallback reports LimitReached when cache count is at cap`() = runTest {
        coEvery { eventRepository.getEventsByDateRangeFromApi(any(), any()) } throws RuntimeException("offline")
        every { authManager.currentUser } returns MutableStateFlow(user(id = "user-7"))
        every {
            eventRepository.getEventCountForMonth("user-7", any(), any())
        } returns flowOf(PlanLimitsManager.BASIC_EVENTS_PER_MONTH)

        val result = manager.canCreateEvent(Plan.BASIC)

        assertTrue(result is LimitCheckResult.LimitReached)
    }

    @Test
    fun `canCreateEvent offline fallback uses the authenticated user id for tenant scoping`() = runTest {
        // Regression guard: the cache-count fallback MUST pass the logged-in
        // user's id so the count is tenant-scoped (never another user's rows).
        coEvery { eventRepository.getEventsByDateRangeFromApi(any(), any()) } throws RuntimeException("offline")
        every { authManager.currentUser } returns MutableStateFlow(user(id = "tenant-owner"))
        every { eventRepository.getEventCountForMonth("tenant-owner", any(), any()) } returns flowOf(0)

        manager.canCreateEvent(Plan.BASIC)

        coVerify(exactly = 1) { eventRepository.getEventCountForMonth("tenant-owner", any(), any()) }
    }

    // --- canCreateClient: BASIC near-limit window is 5 slots ---

    @Test
    fun `canCreateClient allows when far below the cap`() = runTest {
        every { clientRepository.getClientCount() } returns flowOf(1)

        assertEquals(LimitCheckResult.Allowed, manager.canCreateClient(Plan.BASIC))
    }

    @Test
    fun `canCreateClient reports near-limit within 5 slots of the cap`() = runTest {
        val nearLimitCount = PlanLimitsManager.BASIC_CLIENTS_TOTAL - 5
        every { clientRepository.getClientCount() } returns flowOf(nearLimitCount)

        val result = manager.canCreateClient(Plan.BASIC)

        assertTrue(result is LimitCheckResult.NearLimit)
        result as LimitCheckResult.NearLimit
        assertEquals(5, result.remaining)
    }

    @Test
    fun `canCreateClient blocks at the cap`() = runTest {
        every { clientRepository.getClientCount() } returns flowOf(PlanLimitsManager.BASIC_CLIENTS_TOTAL)

        val result = manager.canCreateClient(Plan.BASIC)

        assertTrue(result is LimitCheckResult.LimitReached)
        result as LimitCheckResult.LimitReached
        assertEquals("clients", result.feature)
        assertTrue(result.message.isNotBlank(), "message: ${result.message}")
    }

    @Test
    fun `canCreateClient allows unlimited for paid plans even with a large count`() = runTest {
        every { clientRepository.getClientCount() } returns flowOf(1_000_000)

        assertEquals(LimitCheckResult.Allowed, manager.canCreateClient(Plan.PRO))
    }

    // --- canCreateProduct: product cap + combined catalog gate ---

    @Test
    fun `canCreateProduct blocks when the product cap alone is reached`() = runTest {
        stubCatalog(products = PlanLimitsManager.BASIC_PRODUCTS_TOTAL, inventory = 0)

        val result = manager.canCreateProduct(Plan.BASIC)

        assertTrue(result is LimitCheckResult.LimitReached)
        result as LimitCheckResult.LimitReached
        assertEquals("products", result.feature)
    }

    @Test
    fun `canCreateProduct blocks on the catalog gate even when products are under their own cap`() = runTest {
        // Products alone are fine (14 < 15) but catalog total (14 + 7 = 21)
        // exceeds the catalog cap (20) — the combined gate must fire.
        stubCatalog(
            products = PlanLimitsManager.BASIC_PRODUCTS_TOTAL - 1,
            inventory = PlanLimitsManager.BASIC_CATALOG_TOTAL - (PlanLimitsManager.BASIC_PRODUCTS_TOTAL - 1) + 1
        )

        val result = manager.canCreateProduct(Plan.BASIC)

        assertTrue(result is LimitCheckResult.LimitReached)
        result as LimitCheckResult.LimitReached
        assertEquals("catalog", result.feature)
    }

    @Test
    fun `canCreateProduct reports near-limit within 3 slots of the product cap`() = runTest {
        stubCatalog(products = PlanLimitsManager.BASIC_PRODUCTS_TOTAL - 3, inventory = 0)

        val result = manager.canCreateProduct(Plan.BASIC)

        assertTrue(result is LimitCheckResult.NearLimit)
        result as LimitCheckResult.NearLimit
        assertEquals("products", result.feature)
        assertEquals(3, result.remaining)
    }

    @Test
    fun `canCreateProduct allows when both product and catalog counts leave room`() = runTest {
        stubCatalog(products = 5, inventory = 5)

        assertEquals(LimitCheckResult.Allowed, manager.canCreateProduct(Plan.BASIC))
    }

    @Test
    fun `canCreateProduct is always allowed for paid plans`() = runTest {
        stubCatalog(products = 9_999, inventory = 9_999)

        assertEquals(LimitCheckResult.Allowed, manager.canCreateProduct(Plan.BUSINESS))
    }

    // --- canCreateInventoryItem: mirror of products ---

    @Test
    fun `canCreateInventoryItem blocks when the inventory cap is reached`() = runTest {
        stubCatalog(products = 0, inventory = PlanLimitsManager.BASIC_INVENTORY_TOTAL)

        val result = manager.canCreateInventoryItem(Plan.BASIC)

        assertTrue(result is LimitCheckResult.LimitReached)
        result as LimitCheckResult.LimitReached
        assertEquals("inventory", result.feature)
    }

    @Test
    fun `canCreateInventoryItem blocks on the catalog gate even when inventory is under its own cap`() = runTest {
        stubCatalog(
            inventory = PlanLimitsManager.BASIC_INVENTORY_TOTAL - 1,
            products = PlanLimitsManager.BASIC_CATALOG_TOTAL - (PlanLimitsManager.BASIC_INVENTORY_TOTAL - 1) + 1
        )

        val result = manager.canCreateInventoryItem(Plan.BASIC)

        assertTrue(result is LimitCheckResult.LimitReached)
        result as LimitCheckResult.LimitReached
        assertEquals("catalog", result.feature)
    }

    @Test
    fun `canCreateInventoryItem near-limit only reachable when catalog gate leaves room`() = runTest {
        // The inventory near-limit window is `inventory >= totalInventory - 3` (27
        // for a 30 cap). But the combined catalog gate (`products + inventory >= 20`)
        // is checked *before* the near-limit branch, so with zero products the
        // catalog gate (0 + 27 = 27 >= 20) fires first as LimitReached("catalog").
        // The inventory near-limit is only reachable when products are high enough
        // that the catalog gate still has room. Pin this shadowing explicitly so a
        // future reorder of the branches is a conscious decision, not an accident.
        stubCatalog(products = 0, inventory = PlanLimitsManager.BASIC_INVENTORY_TOTAL - 3)

        val result = manager.canCreateInventoryItem(Plan.BASIC)

        assertTrue(result is LimitCheckResult.LimitReached)
        result as LimitCheckResult.LimitReached
        assertEquals("catalog", result.feature)
    }

    @Test
    fun `canCreateInventoryItem allows when both inventory and catalog counts leave room`() = runTest {
        stubCatalog(products = 4, inventory = 4)

        assertEquals(LimitCheckResult.Allowed, manager.canCreateInventoryItem(Plan.BASIC))
    }

    @Test
    fun `canCreateInventoryItem is always allowed for paid plans`() = runTest {
        stubCatalog(products = 9_999, inventory = 9_999)

        assertEquals(LimitCheckResult.Allowed, manager.canCreateInventoryItem(Plan.PRO))
    }

    // --- helpers ---

    private fun stubEventsFromApi(count: Int) {
        // getEventsByDateRangeFromApi returns a List<Event>; size is what matters.
        val list = List(count) { index ->
            com.creapolis.solennix.core.model.Event(
                id = "e$index",
                userId = "u1",
                clientId = "c1",
                eventDate = LocalDate.now().toString(),
                serviceType = "Boda",
                numPeople = 1,
                status = com.creapolis.solennix.core.model.EventStatus.CONFIRMED
            )
        }
        coEvery { eventRepository.getEventsByDateRangeFromApi(any(), any()) } returns list
    }

    private fun stubCatalog(products: Int, inventory: Int) {
        every { productRepository.getActiveProductCount() } returns flowOf(products)
        every { inventoryRepository.getInventoryItems() } returns flowOf(List(inventory) { inventoryItem() })
    }

    private fun user(id: String) = User(id = id, email = "test@example.com", name = "Test")

    private fun inventoryItem() = InventoryItem(
        id = "i",
        userId = "u1",
        ingredientName = "item",
        currentStock = 1.0,
        minimumStock = 0.0,
        unit = "unit",
        type = InventoryType.EQUIPMENT
    )
}
