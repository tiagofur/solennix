package com.creapolis.solennix.feature.events.viewmodel

import android.content.Context
import androidx.lifecycle.SavedStateHandle
import com.creapolis.solennix.core.data.repository.ClientRepository
import com.creapolis.solennix.core.data.repository.EventRepository
import com.creapolis.solennix.core.data.repository.PaymentRepository
import com.creapolis.solennix.core.data.repository.StaffRepository
import com.creapolis.solennix.core.model.Client
import com.creapolis.solennix.core.model.DiscountType
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.EventStatus
import com.creapolis.solennix.core.model.Payment
import com.creapolis.solennix.core.model.User
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.AuthManager
import com.creapolis.solennix.core.network.EventDayNotificationManager
import com.creapolis.solennix.core.designsystem.R as DesignSystemR
import com.creapolis.solennix.feature.events.R
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

    private val appContext = mockk<Context>(relaxed = true)
    private val eventRepository = mockk<EventRepository>(relaxed = true)
    private val clientRepository = mockk<ClientRepository>(relaxed = true)
    private val paymentRepository = mockk<PaymentRepository>(relaxed = true)
    private val staffRepository = mockk<StaffRepository>(relaxed = true)
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
        every { appContext.getString(any()) } answers {
            when (firstArg<Int>()) {
                R.string.events_list_error_change_status -> "No se pudo cambiar el estado"
                else -> ""
            }
        }
        every { appContext.getString(any(), *anyVararg()) } answers {
            val resId = firstArg<Int>()
            // The vararg arrives packed as a single Array argument; unwrap it to read values.
            val firstFmtArg = args.drop(1).firstOrNull()?.let { arg ->
                when (arg) {
                    is Array<*> -> arg.firstOrNull()
                    else -> arg
                }
            }
            when (resId) {
                R.string.events_detail_error_positive_amount -> "El monto debe ser mayor a 0"
                R.string.events_list_error_change_status -> "No se pudo cambiar el estado"
                DesignSystemR.string.events_error_balance_pending ->
                    "El evento tiene un saldo pendiente de \$$firstFmtArg para completar"
                else -> ""
            }
        }

        every { eventRepository.observeEvent("event-1") } returns flowOf(baseEvent)
        coEvery { eventRepository.getEvent("event-1") } returns baseEvent
        every { eventRepository.getEventProducts("event-1") } returns flowOf(emptyList())
        every { eventRepository.getEventExtras("event-1") } returns flowOf(emptyList())
        every { staffRepository.getEventStaff("event-1") } returns flowOf(emptyList())

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
            appContext = appContext,
            eventRepository = eventRepository,
            clientRepository = clientRepository,
            paymentRepository = paymentRepository,
            staffRepository = staffRepository,
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
        coVerify(exactly = 0) { eventRepository.updateEvent(any()) }
        assertNull(vm.uiState.value.errorMessage)
        collectJob.cancel()
    }

    @Test
    fun `updateEventStatus translates backend balance error to localized message`() = runTest {
        // Backend rejects "completed" with "Cannot complete: $X remaining".
        coEvery { eventRepository.updateEvent(any()) } throws
            RuntimeException("Cannot complete: \$1500.00 remaining")

        val vm = buildViewModel()
        val collectJob = backgroundScope.launch { vm.uiState.collect {} }
        advanceUntilIdle()

        vm.updateEventStatus(EventStatus.COMPLETED)
        advanceUntilIdle()

        assertEquals(
            "El evento tiene un saldo pendiente de \$1500.00 para completar",
            vm.uiState.value.errorMessage
        )
        collectJob.cancel()
    }

    @Test
    fun `updateEventStatus generic error uses localized fallback`() = runTest {
        coEvery { eventRepository.updateEvent(any()) } throws
            RuntimeException("some unexpected failure")

        val vm = buildViewModel()
        val collectJob = backgroundScope.launch { vm.uiState.collect {} }
        advanceUntilIdle()

        vm.updateEventStatus(EventStatus.CANCELLED)
        advanceUntilIdle()

        assertEquals("No se pudo cambiar el estado", vm.uiState.value.errorMessage)
        collectJob.cancel()
    }
}
