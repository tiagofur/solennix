package com.creapolis.solennix.core.data.repository

import com.creapolis.solennix.core.database.dao.InventoryDao
import com.creapolis.solennix.core.model.InventoryItem
import com.creapolis.solennix.core.model.InventoryType
import com.creapolis.solennix.core.network.ApiService
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

class InventoryRepositoryTest {

    private lateinit var repository: OfflineFirstInventoryRepository
    private val mockInventoryDao = mockk<InventoryDao>(relaxed = true)
    private val mockApiService = mockk<ApiService>(relaxed = true)

    @BeforeEach
    fun setUp() {
        repository = OfflineFirstInventoryRepository(mockInventoryDao, mockApiService)
    }

    @Test
    fun `full syncInventory (no typeParam) reconciles via dao syncInventory`() = runTest {
        val networkItems = listOf(
            createItem(id = "1", type = InventoryType.INGREDIENT),
            createItem(id = "2", type = InventoryType.EQUIPMENT)
        )
        coEvery { mockApiService.get<List<InventoryItem>>(any(), any(), any()) } returns networkItems

        repository.syncInventory(typeParam = null)

        // Full sync must use the transactional syncInventory (upsert + orphan cleanup),
        // not the bare insertInventoryItems — otherwise deleted items persist (#832).
        coVerify {
            mockInventoryDao.syncInventory(withArg { entities ->
                assertEquals(2, entities.size)
                assertEquals("1", entities[0].id)
                assertEquals("2", entities[1].id)
            })
        }
        coVerify(exactly = 0) { mockInventoryDao.insertInventoryItems(any()) }
    }

    @Test
    fun `partial syncInventory (with typeParam) stays upsert-only to preserve other types`() = runTest {
        val networkItems = listOf(
            createItem(id = "1", type = InventoryType.INGREDIENT)
        )
        coEvery { mockApiService.get<List<InventoryItem>>(any(), any(), any()) } returns networkItems

        repository.syncInventory(typeParam = "ingredient")

        // Partial sync by type must NOT orphan-clean — it would delete equipment/supply
        // rows not present in this ingredient-only response.
        coVerify { mockInventoryDao.insertInventoryItems(any()) }
        coVerify(exactly = 0) { mockInventoryDao.syncInventory(any()) }
    }

    private fun createItem(id: String, type: InventoryType) = InventoryItem(
        id = id,
        userId = "user1",
        ingredientName = "Item $id",
        currentStock = 10.0,
        minimumStock = 5.0,
        unit = "kg",
        type = type
    )
}
