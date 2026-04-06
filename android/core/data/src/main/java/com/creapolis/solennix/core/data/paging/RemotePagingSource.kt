package com.creapolis.solennix.core.data.paging

import androidx.paging.PagingSource
import androidx.paging.PagingState
import com.creapolis.solennix.core.model.PaginatedResponse
import com.creapolis.solennix.core.network.ApiService
import io.ktor.util.reflect.TypeInfo

/**
 * A reusable [PagingSource] that loads pages from the remote API using the
 * server-side pagination envelope ([PaginatedResponse]).
 *
 * @param apiService The Ktor-backed API service.
 * @param endpoint The API endpoint path (e.g. "events", "clients").
 * @param params Additional query parameters forwarded to the endpoint
 *               (e.g. sort, order, filters). Pagination params (page, limit)
 *               are added automatically.
 * @param typeInfo Ktor [TypeInfo] for the concrete [PaginatedResponse] type
 *                 (needed because of JVM type-erasure).
 * @param pageSize Number of items per page (must match the PagingConfig.pageSize).
 */
class RemotePagingSource<T : Any>(
    private val apiService: ApiService,
    private val endpoint: String,
    private val params: Map<String, String> = emptyMap(),
    private val typeInfo: TypeInfo,
    private val pageSize: Int = 20
) : PagingSource<Int, T>() {

    override suspend fun load(loadParams: LoadParams<Int>): LoadResult<Int, T> {
        val page = loadParams.key ?: 1
        return try {
            val queryParams = buildMap {
                putAll(params)
                put("page", page.toString())
                put("limit", pageSize.toString())
            }

            val response: PaginatedResponse<T> =
                apiService.getPaginated(endpoint, queryParams, typeInfo)

            LoadResult.Page(
                data = response.data,
                prevKey = if (page > 1) page - 1 else null,
                nextKey = if (page < response.totalPages) page + 1 else null,
                itemsBefore = (page - 1) * response.limit,
                itemsAfter = maxOf(0, response.total - page * response.limit)
            )
        } catch (e: Exception) {
            LoadResult.Error(e)
        }
    }

    override fun getRefreshKey(state: PagingState<Int, T>): Int? {
        return state.anchorPosition?.let { anchorPosition ->
            val anchorPage = state.closestPageToPosition(anchorPosition)
            anchorPage?.prevKey?.plus(1) ?: anchorPage?.nextKey?.minus(1)
        }
    }
}
