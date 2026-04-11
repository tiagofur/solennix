package com.creapolis.solennix.core.data.paging

import androidx.paging.PagingSource
import com.creapolis.solennix.core.model.Client
import com.creapolis.solennix.core.model.PaginatedResponse
import com.creapolis.solennix.core.network.ApiService
import io.ktor.util.reflect.typeInfo
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test

class RemotePagingSourceTest {

	private val apiService = mockk<ApiService>()

	@Test
	fun `load requests paginated envelope and maps paging keys`() = runTest {
		val paginatedType = typeInfo<PaginatedResponse<Client>>()
		val response = PaginatedResponse(
			data = listOf(
				Client(
					id = "client-1",
					userId = "user-1",
					name = "Client 1",
					phone = "1234567890",
					createdAt = "2026-01-01",
					updatedAt = "2026-01-01"
				)
			),
			total = 21,
			page = 2,
			limit = 10,
			totalPages = 3
		)

		coEvery {
			apiService.getPaginated<Client>(
				endpoint = "clients",
				params = mapOf("sort" to "name", "page" to "2", "limit" to "10"),
				type = paginatedType
			)
		} returns response

		val source = RemotePagingSource<Client>(
			apiService = apiService,
			endpoint = "clients",
			params = mapOf("sort" to "name"),
			typeInfo = paginatedType,
			pageSize = 10
		)

		val result = source.load(
			PagingSource.LoadParams.Refresh(
				key = 2,
				loadSize = 10,
				placeholdersEnabled = true
			)
		)

		val page = result as PagingSource.LoadResult.Page
		assertEquals(1, page.data.size)
		assertEquals("client-1", page.data.first().id)
		assertEquals(1, page.prevKey)
		assertEquals(3, page.nextKey)
		assertEquals(10, page.itemsBefore)
		assertEquals(1, page.itemsAfter)

		coVerify(exactly = 1) {
			apiService.getPaginated<Client>(
				endpoint = "clients",
				params = mapOf("sort" to "name", "page" to "2", "limit" to "10"),
				type = paginatedType
			)
		}
	}

	@Test
	fun `load on first page has null prevKey and advances when more pages remain`() = runTest {
		val paginatedType = typeInfo<PaginatedResponse<Client>>()
		val response = PaginatedResponse(
			data = emptyList<Client>(),
			total = 25,
			page = 1,
			limit = 20,
			totalPages = 2
		)

		coEvery {
			apiService.getPaginated<Client>(
				endpoint = "clients",
				params = mapOf("page" to "1", "limit" to "20"),
				type = paginatedType
			)
		} returns response

		val source = RemotePagingSource<Client>(
			apiService = apiService,
			endpoint = "clients",
			typeInfo = paginatedType
		)

		val result = source.load(
			PagingSource.LoadParams.Refresh(
				key = null,
				loadSize = 20,
				placeholdersEnabled = false
			)
		)

		val page = result as PagingSource.LoadResult.Page
		assertNull(page.prevKey)
		assertEquals(2, page.nextKey)
	}
}