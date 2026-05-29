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
}
