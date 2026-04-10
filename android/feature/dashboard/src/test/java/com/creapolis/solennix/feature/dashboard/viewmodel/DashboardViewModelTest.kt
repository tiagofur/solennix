package com.creapolis.solennix.feature.dashboard.viewmodel

import com.creapolis.solennix.core.data.repository.ClientRepository
import com.creapolis.solennix.core.data.repository.EventRepository
import com.creapolis.solennix.core.data.repository.InventoryRepository
import com.creapolis.solennix.core.data.repository.PaymentRepository
import com.creapolis.solennix.core.data.repository.ProductRepository
import com.creapolis.solennix.core.model.Client
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.EventStatus
import com.creapolis.solennix.core.model.InventoryItem
import com.creapolis.solennix.core.model.InventoryType
import com.creapolis.solennix.core.model.Payment
import com.creapolis.solennix.core.model.Plan
import com.creapolis.solennix.core.model.Product
import com.creapolis.solennix.core.model.User
import com.creapolis.solennix.core.network.AuthManager
import io.mockk.coEvery
import io.mockk.coVerify
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
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import java.time.LocalDate

@OptIn(ExperimentalCoroutinesApi::class)
class DashboardViewModelTest {

    private val eventRepository = mockk<EventRepository>(relaxed = true)
    private val inventoryRepository = mockk<InventoryRepository>(relaxed = true)
    private val clientRepository = mockk<ClientRepository>(relaxed = true)
    private val paymentRepository = mockk<PaymentRepository>(relaxed = true)
    private val productRepository = mockk<ProductRepository>(relaxed = true)
    private val authManager = mockk<AuthManager>(relaxed = true)

    private val dispatcher = StandardTestDispatcher()

    @BeforeEach
    fun setUp() {
        Dispatchers.setMain(dispatcher)
    }

    @AfterEach
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `uiState computes main dashboard metrics`() = runTest {
        val today = LocalDate.now().toString()

        every { eventRepository.getUpcomingEvents(5) } returns flowOf(
            listOf(
                Event(
                    id = "event-1",
                    clientId = "client-1",
                    eventDate = today,
                    serviceType = "Boda",
                    numPeople = 80,
                    status = EventStatus.QUOTED,
                    totalAmount = 1000.0,
                    taxRate = 0.16
                )
            )
        )
        every { inventoryRepository.getLowStockItems() } returns flowOf(
            listOf(
                InventoryItem(
                    id = "inv-1",
                    ingredientName = "Sillas",
                    currentStock = 2.0,
                    minimumStock = 5.0,
                    unit = "pzs",
                    type = InventoryType.EQUIPMENT
                )
            )
        )
        every { eventRepository.getEvents() } returns flowOf(
            listOf(
                Event(
                    id = "event-1",
                    clientId = "client-1",
                    eventDate = today,
                    serviceType = "Boda",
                    numPeople = 80,
                    status = EventStatus.QUOTED,
                    totalAmount = 1000.0,
                    taxRate = 0.16
                ),
                Event(
                    id = "event-2",
                    clientId = "client-2",
                    eventDate = today,
                    serviceType = "XV",
                    numPeople = 120,
                    status = EventStatus.CONFIRMED,
                    totalAmount = 2000.0,
                    taxRate = 0.16
                )
            )
        )
        every { clientRepository.getClients() } returns flowOf(
            listOf(
                Client(id = "client-1", name = "Ana", phone = "111"),
                Client(id = "client-2", name = "Bruno", phone = "222")
            )
        )
        every { paymentRepository.getPayments() } returns flowOf(
            listOf(
                Payment(
                    id = "pay-1",
                    eventId = "event-2",
                    userId = "user-1",
                    amount = 500.0,
                    paymentDate = today,
                    paymentMethod = "Efectivo"
                )
            )
        )
        every { productRepository.getProducts() } returns flowOf(
            listOf(
                Product(id = "prod-1", name = "Mesa", category = "Mobiliario", basePrice = 300.0)
            )
        )
        every { authManager.currentUser } returns MutableStateFlow(
            User(id = "user-1", email = "a@b.com", name = "Juan Perez", plan = Plan.BASIC)
        )

        coEvery { eventRepository.syncEvents() } returns Unit
        coEvery { inventoryRepository.syncInventory() } returns Unit
        coEvery { clientRepository.syncClients() } returns Unit
        coEvery { paymentRepository.syncPayments() } returns Unit
        coEvery { productRepository.syncProducts() } returns Unit

        val viewModel = DashboardViewModel(
            eventRepository,
            inventoryRepository,
            clientRepository,
            paymentRepository,
            productRepository,
            authManager
        )

        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertEquals(2, state.eventsThisMonth)
        assertEquals(2, state.totalClients)
        assertEquals(1, state.pendingQuotes)
        assertEquals(500.0, state.cashCollected)
        assertEquals("Juan", state.userName)
        assertTrue(state.isBasicPlan)
        assertTrue(state.hasClients)
        assertTrue(state.hasProducts)
        assertTrue(state.hasEvents)
        assertFalse(state.isRefreshing)
    }

    @Test
    fun `refresh triggers all sync operations`() = runTest {
        every { eventRepository.getUpcomingEvents(5) } returns flowOf(emptyList())
        every { inventoryRepository.getLowStockItems() } returns flowOf(emptyList())
        every { eventRepository.getEvents() } returns flowOf(emptyList())
        every { clientRepository.getClients() } returns flowOf(emptyList())
        every { paymentRepository.getPayments() } returns flowOf(emptyList())
        every { productRepository.getProducts() } returns flowOf(emptyList())
        every { authManager.currentUser } returns MutableStateFlow(
            User(id = "user-1", email = "a@b.com", name = "Juan", plan = Plan.BASIC)
        )

        coEvery { eventRepository.syncEvents() } returns Unit
        coEvery { inventoryRepository.syncInventory() } returns Unit
        coEvery { clientRepository.syncClients() } returns Unit
        coEvery { paymentRepository.syncPayments() } returns Unit
        coEvery { productRepository.syncProducts() } returns Unit

        val viewModel = DashboardViewModel(
            eventRepository,
            inventoryRepository,
            clientRepository,
            paymentRepository,
            productRepository,
            authManager
        )

        advanceUntilIdle()
        viewModel.refresh()
        advanceUntilIdle()

        coVerify(atLeast = 1) { eventRepository.syncEvents() }
        coVerify(atLeast = 1) { inventoryRepository.syncInventory() }
        coVerify(atLeast = 1) { clientRepository.syncClients() }
        coVerify(atLeast = 1) { paymentRepository.syncPayments() }
        coVerify(atLeast = 1) { productRepository.syncProducts() }
    }
}
