package com.creapolis.solennix.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Generic paginated response from the backend API.
 *
 * When the backend receives `?page=N&limit=M` it returns this envelope.
 * When no `page` param is provided, it returns a flat array (backward compatible).
 */
@Serializable
data class PaginatedResponse<T>(
    val data: List<T>,
    val total: Int,
    val page: Int,
    val limit: Int,
    @SerialName("total_pages") val totalPages: Int
)
