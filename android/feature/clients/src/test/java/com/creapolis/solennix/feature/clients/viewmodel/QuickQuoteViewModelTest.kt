package com.creapolis.solennix.feature.clients.viewmodel

import android.content.Context
import com.creapolis.solennix.core.data.repository.ClientRepository
import com.creapolis.solennix.core.data.repository.ProductRepository
import com.creapolis.solennix.core.model.Product
import com.creapolis.solennix.core.network.ApiService
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
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

@OptIn(ExperimentalCoroutinesApi::class)
class QuickQuoteViewModelTest {

    private val testDispatcher = StandardTestDispatcher()

    @BeforeEach
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
    }

    @AfterEach
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun createViewModel(): QuickQuoteViewModel {
        val productRepository = mockk<ProductRepository>()
        val clientRepository = mockk<ClientRepository>()
        val apiService = mockk<ApiService>(relaxed = true)
        val authManager = mockk<com.creapolis.solennix.core.network.AuthManager>()
        val context = mockk<Context>(relaxed = true)

        every { productRepository.getProducts() } returns MutableStateFlow(
            listOf(Product(id = "p1", name = "Torta", category = "Postres", basePrice = 100.0, isActive = true))
        )
        coEvery { productRepository.syncProducts() } returns Unit
        coEvery { clientRepository.getClient(any()) } returns null
        every { authManager.currentUser } returns MutableStateFlow(null)

        return QuickQuoteViewModel(
            productRepository = productRepository,
            clientRepository = clientRepository,
            apiService = apiService,
            authManager = authManager,
            appContext = context,
            savedStateHandle = androidx.lifecycle.SavedStateHandle()
        )
    }

    @Test
    fun `removeItem keeps at least one row`() = runTest {
        val vm = createViewModel()
        val collector = backgroundScope.launch { vm.uiState.collect { } }
        advanceUntilIdle()

        val onlyItemId = vm.uiState.value.selectedItems.first().id
        vm.removeItem(onlyItemId)

        assertEquals(1, vm.uiState.value.selectedItems.size)
        collector.cancel()
    }

    @Test
    fun `updateItemQuantity ignores invalid values and accepts positive`() = runTest {
        val vm = createViewModel()
        val collector = backgroundScope.launch { vm.uiState.collect { } }
        advanceUntilIdle()

        val itemId = vm.uiState.value.selectedItems.first().id

        vm.updateItemQuantity(itemId, "0")
        assertEquals(1, vm.uiState.value.selectedItems.first().quantity)

        vm.updateItemQuantity(itemId, "x")
        assertEquals(1, vm.uiState.value.selectedItems.first().quantity)

        vm.updateItemQuantity(itemId, "3")
        assertEquals(3, vm.uiState.value.selectedItems.first().quantity)

        collector.cancel()
    }

    @Test
    fun `excludeUtility enforces pass-through price equals cost`() = runTest {
        val vm = createViewModel()
        val collector = backgroundScope.launch { vm.uiState.collect { } }
        advanceUntilIdle()

        vm.addExtra()
        val extraId = vm.uiState.value.extras.first().id

        vm.updateExtraCost(extraId, "250")
        vm.updateExtraExcludeUtility(extraId, true)

        val updated = vm.uiState.value.extras.first()
        assertTrue(updated.excludeUtility)
        assertEquals(250.0, updated.cost)
        assertEquals(250.0, updated.price)

        vm.updateExtraExcludeUtility(extraId, false)
        assertFalse(vm.uiState.value.extras.first().excludeUtility)

        collector.cancel()
    }
}
