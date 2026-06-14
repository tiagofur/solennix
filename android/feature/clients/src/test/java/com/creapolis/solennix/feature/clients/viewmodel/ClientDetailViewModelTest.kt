package com.creapolis.solennix.feature.clients.viewmodel

import android.content.Context
import androidx.lifecycle.SavedStateHandle
import com.creapolis.solennix.core.data.repository.ClientRepository
import com.creapolis.solennix.core.data.repository.EventRepository
import com.creapolis.solennix.core.model.Client
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
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

@OptIn(ExperimentalCoroutinesApi::class)
class ClientDetailViewModelTest {

    private val testDispatcher = StandardTestDispatcher()

    @BeforeEach
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
    }

    @AfterEach
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun createViewModel(client: Client): ClientDetailViewModel {
        val clientRepository = mockk<ClientRepository>()
        val eventRepository = mockk<EventRepository>()
        val context = mockk<Context>(relaxed = true)
        val savedStateHandle = SavedStateHandle(mapOf("clientId" to client.id))

        coEvery { clientRepository.getClient(client.id) } returns client
        every { eventRepository.getEvents() } returns MutableStateFlow(emptyList())

        return ClientDetailViewModel(
            clientRepository = clientRepository,
            eventRepository = eventRepository,
            context = context,
            savedStateHandle = savedStateHandle
        )
    }

    private fun baseClient(pendingBalance: Double?) = Client(
        id = "c1",
        userId = "u1",
        name = "Test Client",
        phone = "5500000000",
        pendingBalance = pendingBalance
    )

    @Test
    fun `pendingBalance positive — owed — is surfaced in uiState`() = runTest {
        val vm = createViewModel(baseClient(pendingBalance = 12_500.0))
        advanceUntilIdle()
        assertEquals(12_500.0, vm.uiState.value.pendingBalance)
    }

    @Test
    fun `pendingBalance zero — settled — is surfaced in uiState`() = runTest {
        val vm = createViewModel(baseClient(pendingBalance = 0.0))
        advanceUntilIdle()
        assertEquals(0.0, vm.uiState.value.pendingBalance)
    }

    @Test
    fun `pendingBalance negative — credit — is surfaced as-is in uiState`() = runTest {
        val vm = createViewModel(baseClient(pendingBalance = -500.0))
        advanceUntilIdle()
        assertEquals(-500.0, vm.uiState.value.pendingBalance)
    }

    @Test
    fun `pendingBalance null — absent from payload — uiState keeps null`() = runTest {
        val vm = createViewModel(baseClient(pendingBalance = null))
        advanceUntilIdle()
        assertNull(vm.uiState.value.pendingBalance)
    }
}
