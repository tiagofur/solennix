package com.creapolis.solennix.feature.events.viewmodel

import androidx.lifecycle.SavedStateHandle
import com.creapolis.solennix.core.data.plan.LimitCheckResult
import com.creapolis.solennix.core.data.plan.PlanLimitsManager
import com.creapolis.solennix.core.data.repository.ClientRepository
import com.creapolis.solennix.core.data.repository.EventRepository
import com.creapolis.solennix.core.data.repository.InventoryRepository
import com.creapolis.solennix.core.data.repository.ProductRepository
import com.creapolis.solennix.core.model.DiscountType
import com.creapolis.solennix.core.model.InventoryItem
import com.creapolis.solennix.core.model.InventoryType
import com.creapolis.solennix.core.model.Plan
import com.creapolis.solennix.core.model.Product
import com.creapolis.solennix.core.model.UnavailableDate
import com.creapolis.solennix.core.model.User
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.AuthManager
import com.creapolis.solennix.core.network.Endpoints
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
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

@OptIn(ExperimentalCoroutinesApi::class)
class EventFormViewModelTest {

    private val eventRepository = mockk<EventRepository>(relaxed = true)
    private val clientRepository = mockk<ClientRepository>(relaxed = true)
    private val productRepository = mockk<ProductRepository>(relaxed = true)
    private val inventoryRepository = mockk<InventoryRepository>(relaxed = true)
    private val apiService = mockk<ApiService>(relaxed = true)
    private val planLimitsManager = mockk<PlanLimitsManager>(relaxed = true)
    private val authManager = mockk<AuthManager>(relaxed = true)

    private val dispatcher = StandardTestDispatcher()

    @BeforeEach
    fun setUp() {
        Dispatchers.setMain(dispatcher)

        every { productRepository.getProducts() } returns flowOf(emptyList())
        every { inventoryRepository.getInventoryItems() } returns flowOf(
            listOf(
                InventoryItem(
                    id = "eq-1",
                    ingredientName = "Silla",
                    currentStock = 10.0,
                    minimumStock = 2.0,
                    unit = "pzs",
                    type = InventoryType.EQUIPMENT
                )
            )
        )
        coEvery { apiService.get<List<UnavailableDate>>(Endpoints.UNAVAILABLE_DATES, any(), any()) } returns emptyList()
        coEvery { planLimitsManager.canCreateEvent(any()) } returns LimitCheckResult.Allowed
        every { authManager.currentUser } returns MutableStateFlow(
            User(id = "user-1", email = "a@b.com", name = "Juan Perez", plan = Plan.BASIC)
        )
    }

    @AfterEach
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `validateStep returns error when client is missing`() = runTest {
        val vm = EventFormViewModel(
            eventRepository,
            clientRepository,
            productRepository,
            inventoryRepository,
            apiService,
            planLimitsManager,
            authManager,
            SavedStateHandle()
        )

        vm.serviceType = "Boda"
        vm.numPeople = "50"

        advanceUntilIdle()

        assertEquals("Seleccioná un cliente", vm.validateStep(0))
    }

    @Test
    fun `addProduct merges quantity for same product`() = runTest {
        val vm = EventFormViewModel(
            eventRepository,
            clientRepository,
            productRepository,
            inventoryRepository,
            apiService,
            planLimitsManager,
            authManager,
            SavedStateHandle()
        )

        val product = Product(
            id = "prod-1",
            name = "Mesa",
            category = "Mobiliario",
            basePrice = 100.0
        )

        vm.addProduct(product, 1.0)
        vm.addProduct(product, 2.0)

        assertEquals(1, vm.selectedProducts.size)
        assertEquals(3.0, vm.selectedProducts.first().quantity)
        assertEquals(300.0, vm.selectedProducts.first().totalPrice)
    }

    @Test
    fun `discount and total calculations honor fixed discount cap`() = runTest {
        val vm = EventFormViewModel(
            eventRepository,
            clientRepository,
            productRepository,
            inventoryRepository,
            apiService,
            planLimitsManager,
            authManager,
            SavedStateHandle()
        )

        val product = Product(
            id = "prod-1",
            name = "Mesa",
            category = "Mobiliario",
            basePrice = 120.0
        )
        vm.addProduct(product, 2.0) // subtotal 240
        vm.discountType = DiscountType.FIXED
        vm.discount = "400"

        val discountAmount = vm.discountAmount
        val total = vm.total

        assertEquals(240.0, discountAmount)
        assertEquals(0.0, total)
        assertNull(vm.saveError)
        assertNotNull(vm.selectedProducts.first().totalPrice)
    }
}
