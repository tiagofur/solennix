package com.creapolis.solennix.core.network

import com.creapolis.solennix.core.model.ApiError
import io.ktor.client.plugins.*
import io.ktor.http.*
import io.ktor.serialization.*
import java.io.IOException
import java.net.ConnectException
import java.net.SocketTimeoutException
import javax.net.ssl.SSLPeerUnverifiedException
import javax.net.ssl.SSLHandshakeException

/**
 * Maps raw exceptions from Ktor HTTP calls into typed [ApiError] instances.
 *
 * Usage:
 * ```
 * try {
 *     apiService.post<AuthResponse>(...)
 * } catch (e: ApiError) {
 *     // already typed
 * } catch (e: Exception) {
 *     throw e.toApiError()
 * }
 * ```
 *
 * Or wrap an entire block with [runCatchingApi].
 */
fun Throwable.toApiError(): ApiError = when (this) {
    is ApiError -> this
    is ClientRequestException -> when (response.status) {
        HttpStatusCode.Unauthorized -> ApiError.Unauthorized
        HttpStatusCode.Forbidden -> ApiError.Forbidden
        HttpStatusCode.NotFound -> ApiError.NotFound
        HttpStatusCode.Conflict -> ApiError.Conflict
        HttpStatusCode.UnprocessableEntity -> ApiError.ValidationError(emptyMap())
        else -> if (response.status.value in 500..599) {
            ApiError.ServerError(response.status.value)
        } else {
            ApiError.Unknown(this)
        }
    }
    is ServerResponseException -> ApiError.ServerError(response.status.value)
    is SSLPeerUnverifiedException, is SSLHandshakeException ->
        ApiError.SecurityError(this)
    is IOException, is ConnectException, is SocketTimeoutException ->
        ApiError.NetworkError(this)
    is JsonConvertException, is kotlinx.serialization.SerializationException ->
        ApiError.DecodingError(this)
    else -> ApiError.Unknown(this)
}

/**
 * Executes [block] and maps any thrown exception to [ApiError].
 *
 * ```
 * val result = runCatchingApi { apiService.post<AuthResponse>(...) }
 * ```
 */
suspend inline fun <T> runCatchingApi(block: () -> T): T = try {
    block()
} catch (e: ApiError) {
    throw e
} catch (e: Exception) {
    throw e.toApiError()
}
