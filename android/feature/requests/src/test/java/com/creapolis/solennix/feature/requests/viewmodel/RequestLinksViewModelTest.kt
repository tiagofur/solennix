package com.creapolis.solennix.feature.requests.viewmodel

import com.creapolis.solennix.core.model.GeneratePublicRequestLinkRequest
import com.creapolis.solennix.core.model.PublicRequestLink
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.Endpoints
import com.creapolis.solennix.core.network.get
import com.creapolis.solennix.core.network.post
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

@OptIn(ExperimentalCoroutinesApi::class)
class RequestLinksViewModelTest {

    private val dispatcher = StandardTestDispatcher()
    private val apiService = mockk<ApiService>(relaxed = true)

    @BeforeEach
    fun setUp() {
        Dispatchers.setMain(dispatcher)
    }

    @AfterEach
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun sampleLink(id: String = "l1") = PublicRequestLink(
        id = id,
        token = "tok-$id",
        label = "Boda",
        status = "active",
        submitMode = "auto_event",
        maxUses = 1,
        useCount = 0,
        url = "https://solennix.com/s/tok-$id",
        createdAt = "2026-01-02T00:00:00Z",
        updatedAt = "2026-01-02T00:00:00Z"
    )

    @Test
    fun `loads links on init`() = runTest {
        coEvery {
            apiService.get<List<PublicRequestLink>>(Endpoints.PUBLIC_REQUEST_LINKS)
        } returns listOf(sampleLink("b"), sampleLink("a"))

        val viewModel = RequestLinksViewModel(apiService)
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertTrue(state is RequestLinksUiState.Success)
        assertEquals(2, (state as RequestLinksUiState.Success).links.size)
        coVerify(exactly = 1) {
            apiService.get<List<PublicRequestLink>>(Endpoints.PUBLIC_REQUEST_LINKS)
        }
    }

    @Test
    fun `generateLink posts body and prepends result`() = runTest {
        coEvery {
            apiService.get<List<PublicRequestLink>>(Endpoints.PUBLIC_REQUEST_LINKS)
        } returns emptyList()
        val created = sampleLink("new")
        coEvery {
            apiService.post<PublicRequestLink>(Endpoints.PUBLIC_REQUEST_LINKS, any())
        } returns created

        val viewModel = RequestLinksViewModel(apiService)
        advanceUntilIdle()

        viewModel.generateLink(label = "Fiesta", ttlDays = 7, maxUses = 2, submitMode = "auto_event")
        advanceUntilIdle()

        val state = viewModel.uiState.value as RequestLinksUiState.Success
        assertEquals(1, state.links.size)
        assertEquals("new", state.links.first().id)
        coVerify {
            apiService.post<PublicRequestLink>(
                Endpoints.PUBLIC_REQUEST_LINKS,
                match<GeneratePublicRequestLinkRequest> {
                    it.label == "Fiesta" &&
                        it.ttlDays == 7 &&
                        it.maxUses == 2 &&
                        it.submitMode == "auto_event"
                }
            )
        }
    }

    @Test
    fun `deleteLink removes item after DELETE`() = runTest {
        coEvery {
            apiService.get<List<PublicRequestLink>>(Endpoints.PUBLIC_REQUEST_LINKS)
        } returns listOf(sampleLink("keep"), sampleLink("drop"))
        coEvery {
            apiService.delete(Endpoints.publicRequestLink("drop"))
        } returns mockk(relaxed = true)

        val viewModel = RequestLinksViewModel(apiService)
        advanceUntilIdle()

        viewModel.deleteLink("drop")
        advanceUntilIdle()

        val state = viewModel.uiState.value as RequestLinksUiState.Success
        assertEquals(listOf("keep"), state.links.map { it.id })
    }

    @Test
    fun `network error surfaces Error state`() = runTest {
        coEvery {
            apiService.get<List<PublicRequestLink>>(Endpoints.PUBLIC_REQUEST_LINKS)
        } throws IllegalStateException("boom")

        val viewModel = RequestLinksViewModel(apiService)
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertTrue(state is RequestLinksUiState.Error)
        assertEquals("boom", (state as RequestLinksUiState.Error).message)
    }
}
