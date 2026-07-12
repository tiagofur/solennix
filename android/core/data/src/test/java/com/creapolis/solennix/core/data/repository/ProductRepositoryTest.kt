package com.creapolis.solennix.core.data.repository

import com.creapolis.solennix.core.database.dao.ProductDao
import com.creapolis.solennix.core.model.Product
import com.creapolis.solennix.core.network.ApiService
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

class ProductRepositoryTest {

    private lateinit var repository: OfflineFirstProductRepository
    private val mockProductDao = mockk<ProductDao>(relaxed = true)
    private val mockApiService = mockk<ApiService>(relaxed = true)

    @BeforeEach
    fun setUp() {
        repository = OfflineFirstProductRepository(mockProductDao, mockApiService)
    }

    @Test
    fun `syncProducts fetches from network and reconciles via dao syncProducts`() = runTest {
        val networkProducts = listOf(
            createProduct(id = "1"),
            createProduct(id = "2")
        )
        coEvery { mockApiService.get<List<Product>>(any(), any(), any()) } returns networkProducts

        repository.syncProducts()

        // Must call the transactional syncProducts (upsert + orphan cleanup), not the bare
        // insertProducts — otherwise deleted-on-server products persist locally (#832).
        coVerify {
            mockProductDao.syncProducts(withArg { entities ->
                assertEquals(2, entities.size)
                assertEquals("1", entities[0].id)
                assertEquals("2", entities[1].id)
            })
        }
        coVerify(exactly = 0) { mockProductDao.insertProducts(any()) }
    }

    private fun createProduct(id: String) = Product(
        id = id,
        userId = "user1",
        name = "Product $id",
        category = "category",
        basePrice = 100.0
    )
}
