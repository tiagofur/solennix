package com.creapolis.solennix.core.network

import com.creapolis.solennix.core.model.PaginatedResponse
import io.ktor.client.call.*
import io.ktor.client.plugins.*
import io.ktor.client.request.*
import io.ktor.client.request.forms.*
import io.ktor.http.*
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import java.io.IOException
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
    val code: String? = null
)

sealed class SolennixException(message: String, cause: Throwable? = null) : Exception(message, cause) {
    class Network(cause: Throwable) : SolennixException("Error de conexión. Verificá tu internet.", cause)
    class Server(val code: Int, message: String) : SolennixException(message)
    class Auth(message: String) : SolennixException(message)
    class Unknown(message: String, cause: Throwable? = null) : SolennixException(message, cause)
}

@Singleton
class ApiService @Inject constructor(
    private val client: KtorClient
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
            val message = errorBody?.message ?: "Error del servidor (${e.response.status.value})"
            if (e.response.status == HttpStatusCode.Unauthorized) {
                throw SolennixException.Auth(message)
            }
            throw SolennixException.Server(e.response.status.value, message)
        } catch (e: IOException) {
            throw SolennixException.Network(e)
        } catch (e: SolennixException) {
            throw e
        } catch (e: Exception) {
            throw SolennixException.Unknown(e.message ?: "Ocurrió un error inesperado", e)
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

suspend inline fun <reified T> ApiService.getPaginated(
    endpoint: String,
    params: Map<String, String> = emptyMap()
): com.creapolis.solennix.core.model.PaginatedResponse<T> =
    getPaginated(endpoint, params, io.ktor.util.reflect.typeInfo<com.creapolis.solennix.core.model.PaginatedResponse<T>>())
