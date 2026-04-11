package com.creapolis.solennix.core.model

sealed class ApiError : Exception() {
    data object Unauthorized : ApiError()
    data object Forbidden : ApiError()
    data object NotFound : ApiError()
    data object Conflict : ApiError()
    data class ValidationError(val errors: Map<String, String>) : ApiError()
    data class ServerError(val code: Int) : ApiError()
    data class NetworkError(override val cause: Throwable) : ApiError()
    data class DecodingError(override val cause: Throwable) : ApiError()

    /**
     * TLS certificate did not match the pinned fingerprints. Possible man-in-the-middle
     * attack, corporate proxy with TLS inspection, or backend certificate rotated without
     * updating the app. The app should refuse to continue the request and surface a clear
     * security warning to the user.
     */
    data class SecurityError(override val cause: Throwable) : ApiError()

    data class Unknown(override val cause: Throwable) : ApiError()
}
