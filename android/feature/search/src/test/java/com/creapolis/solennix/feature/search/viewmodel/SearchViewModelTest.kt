package com.creapolis.solennix.feature.search.viewmodel

import androidx.lifecycle.SavedStateHandle
import com.creapolis.solennix.core.model.Client
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.EventStatus
import com.creapolis.solennix.core.model.InventoryItem
import com.creapolis.solennix.core.model.InventoryType
import com.creapolis.solennix.core.model.Product
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.get
import com.creapolis.solennix.core.data.repository.RecentSearchRepository
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceTimeBy
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

import io.mockk.mockkStatic
import io.mockk.unmockkStatic
import io.mockk.every
import android.util.Log

@OptIn(ExperimentalCoroutinesApi::class)
class SearchViewModelTest {

    private val testDispatcher = StandardTestDispatcher()
    private val apiService = mockk<ApiService>()
    private val recentSearchRepository = mockk<RecentSearchRepository>(relaxed = true)
    private val logger = com.creapolis.solennix.core.network.log.AndroidSolennixLogger()

    @BeforeEach
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
        mockkStatic(Log::class)
        every { Log.d(any(), any()) } returns 0
        every { Log.e(any(), any()) } returns 0
        every { Log.e(any(), any(), any()) } returns 0
    }

    @AfterEach
    fun tearDown() {
        Dispatchers.resetMain()
        unmockkStatic(Log::class)
    }

    @Test
    fun `blank query resets state without calling api`() = runTest {
        val viewModel = SearchViewModel(apiService, recentSearchRepository, logger, SavedStateHandle())

        viewModel.onQueryChange("   ")
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertEquals("   ", state.query)
        assertFalse(state.isLoading)
        assertTrue(state.clients.isEmpty())
        assertTrue(state.events.isEmpty())
        assertTrue(state.products.isEmpty())
        assertTrue(state.inventory.isEmpty())
        assertEquals(null, state.error)
        coVerify(exactly = 0) { apiService.get<Any>(any(), any()) }
    }

    @Test
    fun `query shorter than 2 characters does not call api`() = runTest {
        val viewModel = SearchViewModel(apiService, recentSearchRepository, logger, SavedStateHandle())

        viewModel.onQueryChange("a")
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertEquals("a", state.query)
        assertFalse(state.isLoading)
        assertTrue(state.clients.isEmpty())
        assertTrue(state.events.isEmpty())
        assertTrue(state.products.isEmpty())
        assertTrue(state.inventory.isEmpty())
        assertEquals(null, state.error)
        coVerify(exactly = 0) { apiService.get<Any>(any(), any()) }
    }

    @Test
    fun `search query populates all result buckets`() = runTest {
        coEvery {
            apiService.get<SearchResponse>("search", mapOf("q" to "boda"))
        } returns SearchResponse(
            clients = listOf(Client(id = "c1", name = "Ana", phone = "111")),
            products = listOf(
                Product(
                    id = "p1",
                    name = "Mesa premium",
                    category = "Mobiliario",
                    basePrice = 900.0
                )
            ),
            inventory = listOf(
                InventoryItem(
                    id = "i1",
                    ingredientName = "Sillas",
                    currentStock = 4.0,
                    minimumStock = 10.0,
                    unit = "pzs",
                    type = InventoryType.EQUIPMENT
                )
            ),
            events = listOf(
                Event(
                    id = "e1",
                    clientId = "c1",
                    eventDate = "2026-05-13",
                    serviceType = "Boda",
                    numPeople = 100,
                    status = EventStatus.QUOTED,
                    totalAmount = 2500.0,
                    taxRate = 0.16
                )
            )
        )

        val viewModel = SearchViewModel(apiService, recentSearchRepository, logger, SavedStateHandle())

        viewModel.onQueryChange("boda")
        advanceTimeBy(300)
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertEquals("boda", state.query)
        assertFalse(state.isLoading)
        assertEquals("Ana", state.clients.first().name)
        assertEquals("Mesa premium", state.products.first().name)
        assertEquals("Sillas", state.inventory.first().ingredientName)
        assertEquals("e1", state.events.first().id)
        assertEquals(null, state.error)
        coVerify(exactly = 1) {
            apiService.get<SearchResponse>("search", mapOf("q" to "boda"))
        }
    }

    @Test
    fun `search failure surfaces a localized error message`() = runTest {
        coEvery {
            apiService.get<SearchResponse>("search", mapOf("q" to "fallo"))
        } throws IllegalStateException("boom")

        val viewModel = SearchViewModel(apiService, recentSearchRepository, logger, SavedStateHandle())

        viewModel.onQueryChange("fallo")
        advanceTimeBy(300)
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertEquals("fallo", state.query)
        assertFalse(state.isLoading)
        // Error message is localized and generic — backend detail (e.message)
        // is intentionally NOT surfaced to the user (PII / info leak prevention).
        assertTrue(state.error?.isNotBlank() == true)
        coVerify(exactly = 1) {
            apiService.get<SearchResponse>("search", mapOf("q" to "fallo"))
        }
    }
}
