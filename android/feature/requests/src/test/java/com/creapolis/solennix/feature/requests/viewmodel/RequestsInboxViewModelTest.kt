package com.creapolis.solennix.feature.requests.viewmodel

import com.creapolis.solennix.core.model.CursorPaginatedPublicRequests
import com.creapolis.solennix.core.model.PublicRequest
import com.creapolis.solennix.core.model.UnreadCountData
import com.creapolis.solennix.core.model.UnreadCountEnvelope
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.get
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
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

@OptIn(ExperimentalCoroutinesApi::class)
class RequestsInboxViewModelTest {

    private val dispatcher = StandardTestDispatcher()
    private val apiService = mockk<ApiService>()

    @BeforeEach
    fun setUp() {
        Dispatchers.setMain(dispatcher)
    }

    @AfterEach
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private fun sampleRequest(id: String = "r1", status: String = "pending") = PublicRequest(
        id = id,
        contactEmail = "a@b.com",
        contactName = "Ana",
        eventType = "boda",
        status = status,
        isRead = false
    )

    @Test
    fun `loads cursor page and unread count on init`() = runTest {
        coEvery {
            apiService.get<CursorPaginatedPublicRequests>(
                "organizers/me/requests",
                any()
            )
        } returns CursorPaginatedPublicRequests(
            data = listOf(sampleRequest("a"), sampleRequest("b")),
            nextCursor = null,
            hasMore = false,
            limit = 20
        )
        coEvery {
            apiService.get<UnreadCountEnvelope>("organizers/me/requests/unread-count")
        } returns UnreadCountEnvelope(UnreadCountData(count = 2))

        val viewModel = RequestsInboxViewModel(apiService)
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertFalse(state.isLoading)
        assertEquals(2, state.items.size)
        assertEquals(2, state.unreadCount)
        assertNull(state.error)
        assertFalse(state.hasMore)
        coVerify(exactly = 1) {
            apiService.get<CursorPaginatedPublicRequests>("organizers/me/requests", any())
        }
    }

    @Test
    fun `network error surfaces error message`() = runTest {
        coEvery {
            apiService.get<CursorPaginatedPublicRequests>("organizers/me/requests", any())
        } throws IllegalStateException("boom")
        coEvery {
            apiService.get<UnreadCountEnvelope>("organizers/me/requests/unread-count")
        } throws IllegalStateException("boom")

        val viewModel = RequestsInboxViewModel(apiService)
        advanceUntilIdle()

        val state = viewModel.uiState.value
        assertTrue(state.items.isEmpty())
        assertEquals("boom", state.error)
    }

    @Test
    fun `displayName falls back to email local part`() {
        val req = PublicRequest(id = "1", contactEmail = "ana@example.com", contactName = null)
        assertEquals("ana", req.displayName)
    }
}
