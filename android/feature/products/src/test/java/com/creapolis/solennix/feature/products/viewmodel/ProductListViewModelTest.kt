package com.creapolis.solennix.feature.products.viewmodel

import com.creapolis.solennix.core.data.plan.LimitCheckResult
import com.creapolis.solennix.core.data.plan.PlanLimitsManager
import com.creapolis.solennix.core.data.repository.ProductRepository
import com.creapolis.solennix.core.model.Product
import com.creapolis.solennix.core.network.AuthManager
import io.mockk.coEvery
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
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

@OptIn(ExperimentalCoroutinesApi::class)
class ProductListViewModelTest {

    private val testDispatcher = StandardTestDispatcher()

    @BeforeEach
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
    }

    @AfterEach
    fun tearDown() {
        Dispatchers.resetMain()
    }

    @Test
    fun `search and category filter update visible products`() = runTest {
        val productsFlow = MutableStateFlow(
            listOf(
                Product(id = "p1", name = "Cake Deluxe", category = "Postres", basePrice = 120.0),
                Product(id = "p2", name = "Coffee Bar", category = "Bebidas", basePrice = 80.0),
                Product(id = "p3", name = "Cake Basic", category = "Postres", basePrice = 60.0)
            )
        )

        val productRepository = mockk<ProductRepository>()
        val planLimitsManager = mockk<PlanLimitsManager>()
        val authManager = mockk<AuthManager>(relaxed = true)

        every { productRepository.getProducts() } returns productsFlow
        coEvery { productRepository.syncProducts() } returns Unit
        coEvery { planLimitsManager.canCreateProduct(any()) } returns LimitCheckResult.Allowed
        every { authManager.currentUser } returns MutableStateFlow(null)

        val vm = ProductListViewModel(productRepository, planLimitsManager, authManager)
        val collector = backgroundScope.launch { vm.uiState.collect { } }

        vm.onSearchQueryChange("cake")
        advanceUntilIdle()
        assertEquals(listOf("Cake Basic", "Cake Deluxe"), vm.uiState.value.products.map { it.name })

        vm.onCategoryFilterChange("Postres")
        advanceUntilIdle()
        assertEquals(listOf("Cake Basic", "Cake Deluxe"), vm.uiState.value.products.map { it.name })

        collector.cancel()
    }

    @Test
    fun `sort by price toggles ascending then descending`() = runTest {
        val productsFlow = MutableStateFlow(
            listOf(
                Product(id = "p1", name = "A", category = "Cat", basePrice = 120.0),
                Product(id = "p2", name = "B", category = "Cat", basePrice = 80.0),
                Product(id = "p3", name = "C", category = "Cat", basePrice = 60.0)
            )
        )

        val productRepository = mockk<ProductRepository>()
        val planLimitsManager = mockk<PlanLimitsManager>()
        val authManager = mockk<AuthManager>(relaxed = true)

        every { productRepository.getProducts() } returns productsFlow
        coEvery { productRepository.syncProducts() } returns Unit
        coEvery { planLimitsManager.canCreateProduct(any()) } returns LimitCheckResult.Allowed
        every { authManager.currentUser } returns MutableStateFlow(null)

        val vm = ProductListViewModel(productRepository, planLimitsManager, authManager)
        val collector = backgroundScope.launch { vm.uiState.collect { } }

        vm.onSortChange(ProductSortKey.PRICE)
        advanceUntilIdle()
        assertEquals(listOf(60.0, 80.0, 120.0), vm.uiState.value.products.map { it.basePrice })

        vm.onSortChange(ProductSortKey.PRICE)
        advanceUntilIdle()
        assertEquals(listOf(120.0, 80.0, 60.0), vm.uiState.value.products.map { it.basePrice })

        collector.cancel()
    }

    @Test
    fun `onSortAscendingChange sets sort order direction directly`() = runTest {
        val productsFlow = MutableStateFlow(
            listOf(
                Product(id = "p1", name = "A", category = "Cat", basePrice = 120.0),
                Product(id = "p2", name = "B", category = "Cat", basePrice = 80.0),
                Product(id = "p3", name = "C", category = "Cat", basePrice = 60.0)
            )
        )

        val productRepository = mockk<ProductRepository>()
        val planLimitsManager = mockk<PlanLimitsManager>()
        val authManager = mockk<AuthManager>(relaxed = true)

        every { productRepository.getProducts() } returns productsFlow
        coEvery { productRepository.syncProducts() } returns Unit
        coEvery { planLimitsManager.canCreateProduct(any()) } returns LimitCheckResult.Allowed
        every { authManager.currentUser } returns MutableStateFlow(null)

        val vm = ProductListViewModel(productRepository, planLimitsManager, authManager)
        val collector = backgroundScope.launch { vm.uiState.collect { } }

        vm.onSortChange(ProductSortKey.PRICE)
        advanceUntilIdle()
        assertEquals(listOf(60.0, 80.0, 120.0), vm.uiState.value.products.map { it.basePrice })

        vm.onSortAscendingChange(false)
        advanceUntilIdle()
        assertEquals(listOf(120.0, 80.0, 60.0), vm.uiState.value.products.map { it.basePrice })

        vm.onSortAscendingChange(true)
        advanceUntilIdle()
        assertEquals(listOf(60.0, 80.0, 120.0), vm.uiState.value.products.map { it.basePrice })

        collector.cancel()
    }
}
