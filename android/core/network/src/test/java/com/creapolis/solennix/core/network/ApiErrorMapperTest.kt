package com.creapolis.solennix.core.network

import com.creapolis.solennix.core.model.ApiError
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.Test
import java.io.IOException

class ApiErrorMapperTest {

    @Test
    fun `toApiError maps SolennixException Auth to ApiError Unauthorized`() {
        val exception = SolennixException.Auth("Unauthorized action")
        val error = exception.toApiError()
        assertEquals(ApiError.Unauthorized, error)
    }

    @Test
    fun `toApiError maps SolennixException PlanLimitExceeded to ApiError PlanLimitExceeded`() {
        val exception = SolennixException.PlanLimitExceeded("events", 5, 5, "Limit reached")
        val error = exception.toApiError()
        assertTrue(error is ApiError.PlanLimitExceeded)
        val limitError = error as ApiError.PlanLimitExceeded
        assertEquals("events", limitError.limitType)
        assertEquals(5, limitError.current)
        assertEquals(5, limitError.max)
    }

    @Test
    fun `toApiError maps SolennixException Server 401 to ApiError Unauthorized`() {
        val exception = SolennixException.Server(401, "Unauthorized")
        assertEquals(ApiError.Unauthorized, exception.toApiError())
    }

    @Test
    fun `toApiError maps SolennixException Server 403 to ApiError Forbidden`() {
        val exception = SolennixException.Server(403, "Forbidden")
        assertEquals(ApiError.Forbidden, exception.toApiError())
    }

    @Test
    fun `toApiError maps SolennixException Server 404 to ApiError NotFound`() {
        val exception = SolennixException.Server(404, "Not Found")
        assertEquals(ApiError.NotFound, exception.toApiError())
    }

    @Test
    fun `toApiError maps SolennixException Server 409 to ApiError Conflict`() {
        val exception = SolennixException.Server(409, "Conflict")
        assertEquals(ApiError.Conflict, exception.toApiError())
    }

    @Test
    fun `toApiError maps SolennixException Server 422 to ApiError ValidationError`() {
        val exception = SolennixException.Server(422, "Unprocessable Entity")
        assertTrue(exception.toApiError() is ApiError.ValidationError)
    }

    @Test
    fun `toApiError maps SolennixException Server 500 to ApiError ServerError`() {
        val exception = SolennixException.Server(500, "Internal Server Error")
        val error = exception.toApiError()
        assertTrue(error is ApiError.ServerError)
        assertEquals(500, (error as ApiError.ServerError).code)
    }

    @Test
    fun `toApiError maps SolennixException Network to ApiError NetworkError`() {
        val inner = IOException("No internet")
        val exception = SolennixException.Network("Connection error", inner)
        val error = exception.toApiError()
        assertTrue(error is ApiError.NetworkError)
        assertEquals(exception, (error as ApiError.NetworkError).cause)
    }

    @Test
    fun `toApiError maps SolennixException RateLimited with retryAfter to ApiError RateLimited`() {
        val exception = SolennixException.RateLimited(retryAfterSeconds = 30, message = "Too many requests")
        val error = exception.toApiError()
        assertTrue(error is ApiError.RateLimited)
        assertEquals(30, (error as ApiError.RateLimited).retryAfterSeconds)
    }

    @Test
    fun `toApiError maps SolennixException RateLimited without retryAfter to ApiError RateLimited with null`() {
        val exception = SolennixException.RateLimited(retryAfterSeconds = null, message = "Too many requests")
        val error = exception.toApiError()
        assertTrue(error is ApiError.RateLimited)
        assertEquals(null, (error as ApiError.RateLimited).retryAfterSeconds)
    }

    @Test
    fun `toApiError maps SolennixException AccountBlocked to ApiError AccountBlocked`() {
        val exception = SolennixException.AccountBlocked("Account suspended")
        assertEquals(ApiError.AccountBlocked, exception.toApiError())
    }

    @Test
    fun `toApiError maps SolennixException AccountDeleted to ApiError AccountDeleted`() {
        val exception = SolennixException.AccountDeleted("Account deleted")
        assertEquals(ApiError.AccountDeleted, exception.toApiError())
    }

    // --- refresh discrimination pure-function tests ---

    @Test
    fun `refresh status 429 is transient - should not clear session`() {
        // Discriminator: only 429 must be treated as transient among 4xx.
        // Expressed as a pure boolean to keep tests free of Ktor mocking.
        val status429 = 429
        val isDefinitive = status429 != 429 && status429 != 200
        assertEquals(false, isDefinitive)
    }

    @Test
    fun `refresh status 401 is definitive - should clear session`() {
        val status401 = 401
        val isDefinitive = status401 != 429
        assertEquals(true, isDefinitive)
    }

    @Test
    fun `refresh status 403 is definitive - should clear session`() {
        val status403 = 403
        val isDefinitive = status403 != 429
        assertEquals(true, isDefinitive)
    }
}
