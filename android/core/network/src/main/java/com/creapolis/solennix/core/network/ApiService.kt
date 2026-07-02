package com.creapolis.solennix.core.network

import android.content.Context
import com.creapolis.solennix.core.model.PaginatedResponse
import io.ktor.client.call.*
import io.ktor.client.plugins.*
import io.ktor.client.request.*
import io.ktor.client.request.forms.*
import io.ktor.http.*
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import java.io.IOException
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

@Serializable
data class UploadResponse(
    val url: String,
    @SerialName("thumbnail_url") val thumbnailUrl: String? = null
)

@Serializable
data class ApiErrorResponse(
    val message: String,
    val error: String? = null,
    val code: String? = null,
    val limit: ApiLimitInfo? = null
)

@Serializable
data class ApiLimitInfo(
    val type: String = "unknown",
    val current: Int = 0,
    val max: Int = 0
)

sealed class SolennixException(message: String, cause: Throwable? = null) : Exception(message, cause) {
    class Network(message: String, cause: Throwable) : SolennixException(message, cause)
    class Server(val code: Int, message: String) : SolennixException(message)
    class Auth(message: String) : SolennixException(message)
    class PlanLimitExceeded(
        val limitType: String,
        val current: Int,
        val max: Int,
        message: String
    ) : SolennixException(message)
    /** Server returned 429 Too Many Requests. [retryAfterSeconds] from the `Retry-After` header. */
    class RateLimited(val retryAfterSeconds: Int?, message: String) : SolennixException(message)
    /** The account was suspended by an administrator (`auth.account_blocked`). */
    class AccountBlocked(message: String) : SolennixException(message)
    /** The account was deleted (`auth.account_deleted`). */
    class AccountDeleted(message: String) : SolennixException(message)
    class Unknown(message: String, cause: Throwable? = null) : SolennixException(message, cause)
}

@Singleton
class ApiService @Inject constructor(
    private val client: KtorClient,
    @ApplicationContext private val context: Context
) {
    private suspend fun <T> wrapError(block: suspend () -> T): T {
        return try {
            block()
        } catch (e: ResponseException) {
            val errorBody = try {
                e.response.body<ApiErrorResponse>()
            } catch (_: Exception) {
                null
            }
            val message = errorBody?.message ?: errorBody?.error
                ?: context.getString(R.string.core_network_error_server, e.response.status.value)
            when {
                e.response.status == HttpStatusCode.Unauthorized -> {
                    throw SolennixException.Auth(message)
                }
                e.response.status == HttpStatusCode.TooManyRequests -> {
                    val retryAfter = e.response.headers["Retry-After"]?.toIntOrNull()
                    throw SolennixException.RateLimited(retryAfter, message)
                }
                e.response.status == HttpStatusCode.Forbidden -> when (errorBody?.code) {
                    "auth.account_blocked" -> throw SolennixException.AccountBlocked(message)
                    "auth.account_deleted" -> throw SolennixException.AccountDeleted(message)
                    "plan_limit_exceeded", null -> {
                        // Detect structured plan_limit_exceeded response from backend
                        if (errorBody?.error == "plan_limit_exceeded") {
                            throw SolennixException.PlanLimitExceeded(
                                limitType = errorBody.limit?.type ?: "unknown",
                                current = errorBody.limit?.current ?: 0,
                                max = errorBody.limit?.max ?: 0,
                                message = message
                            )
                        }
                        throw SolennixException.Server(e.response.status.value, message)
                    }
                    else -> throw SolennixException.Server(e.response.status.value, message)
                }
                else -> throw SolennixException.Server(e.response.status.value, message)
            }
        } catch (e: IOException) {
            throw SolennixException.Network(context.getString(R.string.core_network_error_connection), e)
        } catch (e: SolennixException) {
            throw e
        } catch (e: Exception) {
            throw SolennixException.Unknown(e.message ?: context.getString(R.string.core_network_error_unknown), e)
        }
    }

    suspend fun <T> get(
        endpoint: String,
        params: Map<String, String> = emptyMap(),
        type: io.ktor.util.reflect.TypeInfo
    ): T = wrapError {
        client.httpClient.get(endpoint) {
            params.forEach { (key, value) -> parameter(key, value) }
        }.body(type)
    }

    suspend fun <T> post(
        endpoint: String,
        body: Any,
        type: io.ktor.util.reflect.TypeInfo
    ): T = wrapError {
        client.httpClient.post(endpoint) {
            setBody(body)
        }.body(type)
    }

    suspend fun <T> put(
        endpoint: String,
        body: Any,
        type: io.ktor.util.reflect.TypeInfo
    ): T = wrapError {
        client.httpClient.put(endpoint) {
            setBody(body)
        }.body(type)
    }

    suspend fun <T> patch(
        endpoint: String,
        body: Any,
        type: io.ktor.util.reflect.TypeInfo
    ): T = wrapError {
        client.httpClient.patch(endpoint) {
            setBody(body)
        }.body(type)
    }

    suspend fun delete(endpoint: String) = wrapError {
        client.httpClient.delete(endpoint)
    }

    /**
     * GET request that returns a [PaginatedResponse] envelope.
     * The caller must supply pagination params (page, limit, sort, order) in [params].
     */
    suspend fun <T> getPaginated(
        endpoint: String,
        params: Map<String, String> = emptyMap(),
        type: io.ktor.util.reflect.TypeInfo
    ): PaginatedResponse<T> = wrapError {
        client.httpClient.get(endpoint) {
            params.forEach { (key, value) -> parameter(key, value) }
        }.body(type)
    }

    suspend fun getRawText(
        endpoint: String,
        params: Map<String, String> = emptyMap()
    ): String = wrapError {
        client.httpClient.get(endpoint) {
            params.forEach { (key, value) -> parameter(key, value) }
        }.body()
    }

    /** GET request that returns raw bytes (e.g. PDF downloads). */
    suspend fun getBytes(endpoint: String): ByteArray = wrapError {
        client.httpClient.get(endpoint).body()
    }

    /** POST request that returns raw bytes (e.g. PDF downloads with JSON payload). */
    suspend fun postBytes(endpoint: String, body: Any): ByteArray = wrapError {
        client.httpClient.post(endpoint) {
            setBody(body)
        }.body()
    }

    suspend fun upload(
        endpoint: String,
        fileBytes: ByteArray,
        fileName: String,
        mimeType: String
    ): UploadResponse = wrapError {
        client.httpClient.post(endpoint) {
            setBody(MultiPartFormDataContent(formData {
                append("file", fileBytes, Headers.build {
                    append(HttpHeaders.ContentDisposition, "filename=\"$fileName\"")
                    append(HttpHeaders.ContentType, mimeType)
                })
            }))
        }.body()
    }
}

// Extension functions to keep the convenience of reified types
suspend inline fun <reified T> ApiService.get(
    endpoint: String,
    params: Map<String, String> = emptyMap()
): T = get(endpoint, params, io.ktor.util.reflect.typeInfo<T>())

suspend inline fun <reified T> ApiService.post(
    endpoint: String,
    body: Any
): T = post(endpoint, body, io.ktor.util.reflect.typeInfo<T>())

suspend inline fun <reified T> ApiService.put(
    endpoint: String,
    body: Any
): T = put(endpoint, body, io.ktor.util.reflect.typeInfo<T>())

suspend inline fun <reified T> ApiService.patch(
    endpoint: String,
    body: Any
): T = patch(endpoint, body, io.ktor.util.reflect.typeInfo<T>())

suspend inline fun <reified T> ApiService.getPaginated(
    endpoint: String,
    params: Map<String, String> = emptyMap()
): com.creapolis.solennix.core.model.PaginatedResponse<T> =
    getPaginated(endpoint, params, io.ktor.util.reflect.typeInfo<com.creapolis.solennix.core.model.PaginatedResponse<T>>())
