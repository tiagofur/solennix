package com.creapolis.solennix.feature.events.viewmodel

import androidx.lifecycle.SavedStateHandle
import com.creapolis.solennix.core.data.repository.ClientRepository
import com.creapolis.solennix.core.data.repository.EventRepository
import com.creapolis.solennix.core.data.repository.PaymentRepository
import com.creapolis.solennix.core.data.repository.ProductRepository
import com.creapolis.solennix.core.model.Client
import com.creapolis.solennix.core.model.DiscountType
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.EventStatus
import com.creapolis.solennix.core.model.Payment
import com.creapolis.solennix.core.model.User
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.AuthManager
import com.creapolis.solennix.core.network.EventDayNotificationManager
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

@OptIn(ExperimentalCoroutinesApi::class)
class EventDetailViewModelTest {

    private val eventRepository = mockk<EventRepository>(relaxed = true)
    private val clientRepository = mockk<ClientRepository>(relaxed = true)
    private val paymentRepository = mockk<PaymentRepository>(relaxed = true)
    private val productRepository = mockk<ProductRepository>(relaxed = true)
    private val apiService = mockk<ApiService>(relaxed = true)
    private val authManager = mockk<AuthManager>(relaxed = true)
    private val eventDayNotificationManager = mockk<EventDayNotificationManager>(relaxed = true)

    private val dispatcher = StandardTestDispatcher()

    private val baseEvent = Event(
        id = "event-1",
        userId = "user-1",
        clientId = "client-1",
        eventDate = "2026-04-20",
        serviceType = "Boda",
        numPeople = 120,
        status = EventStatus.QUOTED,
        discount = 0.0,
        discountType = DiscountType.PERCENT,
        totalAmount = 2000.0,
        createdAt = "2026-01-01T00:00:00Z",
        updatedAt = "2026-01-01T00:00:00Z"
    )

    @BeforeEach
    fun setUp() {
        Dispatchers.setMain(dispatcher)

        every { eventRepository.observeEvent("event-1") } returns flowOf(baseEvent)
        coEvery { eventRepository.getEvent("event-1") } returns baseEvent
        every { eventRepository.getEventProducts("event-1") } returns flowOf(emptyList())
        every { eventRepository.getEventExtras("event-1") } returns flowOf(emptyList())

        every { paymentRepository.getPaymentsByEventId("event-1") } returns flowOf(
            listOf(
                Payment(
                    id = "pay-1",
                    eventId = "event-1",
                    userId = "user-1",
                    amount = 500.0,
                    paymentDate = "2026-04-01",
                    paymentMethod = "Transferencia",
                    notes = null,
                    createdAt = "2026-04-01T00:00:00Z"
                )
            )
        )

        coEvery { clientRepository.getClient("client-1") } returns Client(
            id = "client-1",
            name = "Cliente Demo",
            email = "cliente@demo.com",
            phone = "5551234567"
        )

        coEvery { paymentRepository.syncPaymentsByEventId(any()) } returns Unit
        coEvery { eventRepository.syncEventItems(any()) } returns Unit

        every { authManager.currentUser } returns MutableStateFlow(
            User(id = "user-1", email = "owner@demo.com", name = "Owner")
        )
    }

    @AfterEach
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun buildViewModel(): EventDetailViewModel {
        return EventDetailViewModel(
            eventRepository = eventRepository,
            clientRepository = clientRepository,
            paymentRepository = paymentRepository,
            productRepository = productRepository,
            apiService = apiService,
            authManager = authManager,
            eventDayNotificationManager = eventDayNotificationManager,
            savedStateHandle = SavedStateHandle(mapOf("eventId" to "event-1"))
        )
    }

    @Test
    fun `uiState includes loaded event and total paid`() = runTest {
        val vm = buildViewModel()
        val collectJob = backgroundScope.launch { vm.uiState.collect {} }

        advanceUntilIdle()

        assertEquals("event-1", vm.uiState.value.event?.id)
        assertEquals(500.0, vm.uiState.value.totalPaid)
        assertEquals("Cliente Demo", vm.uiState.value.client?.name)
        collectJob.cancel()
    }

    @Test
    fun `addPayment rejects non positive amount`() = runTest {
        val vm = buildViewModel()
        val collectJob = backgroundScope.launch { vm.uiState.collect {} }

        advanceUntilIdle()
        vm.addPayment(amount = 0.0, method = "Transferencia", notes = null)
        advanceUntilIdle()

        assertEquals("El monto debe ser mayor a 0", vm.uiState.value.errorMessage)
        coVerify(exactly = 0) { paymentRepository.createPayment(any()) }
        collectJob.cancel()
    }

    @Test
    fun `addPayment confirms quoted event after first payment`() = runTest {
        coEvery { paymentRepository.createPayment(any()) } answers { firstArg() }
        coEvery { eventRepository.updateEvent(any()) } answers { firstArg() }
        val vm = buildViewModel()
        val collectJob = backgroundScope.launch { vm.uiState.collect {} }

        advanceUntilIdle()
        vm.addPayment(amount = 300.0, method = "Efectivo", notes = "Anticipo")
        advanceUntilIdle()

        coVerify(exactly = 1) {
            paymentRepository.createPayment(match {
                it.eventId == "event-1" && it.amount == 300.0 && it.paymentMethod == "Efectivo"
            })
        }
        coVerify(exactly = 1) { eventRepository.updateEvent(match { it.status == EventStatus.CONFIRMED }) }
        assertNull(vm.uiState.value.errorMessage)
        collectJob.cancel()
    }
}
