package com.creapolis.solennix.core.data.repository

import com.creapolis.solennix.core.database.dao.InventoryDao
import com.creapolis.solennix.core.database.entity.asEntity
import com.creapolis.solennix.core.database.entity.asExternalModel
import com.creapolis.solennix.core.model.InventoryItem
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.Endpoints
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

interface InventoryRepository {
    fun getInventoryItems(): Flow<List<InventoryItem>>
    fun getLowStockItems(): Flow<List<InventoryItem>>
    suspend fun getInventoryItem(id: String): InventoryItem?
    suspend fun syncInventory()
    suspend fun createInventoryItem(item: InventoryItem): InventoryItem
    suspend fun updateInventoryItem(item: InventoryItem): InventoryItem
    suspend fun deleteInventoryItem(id: String)
}

@Singleton
class OfflineFirstInventoryRepository @Inject constructor(
    private val inventoryDao: InventoryDao,
    private val apiService: ApiService
) : InventoryRepository {

    override fun getInventoryItems(): Flow<List<InventoryItem>> =
        inventoryDao.getInventoryItems().map { it.map { entity -> entity.asExternalModel() } }

    override fun getLowStockItems(): Flow<List<InventoryItem>> =
        inventoryDao.getLowStockItems().map { it.map { entity -> entity.asExternalModel() } }

    override suspend fun getInventoryItem(id: String): InventoryItem? =
        inventoryDao.getInventoryItem(id)?.asExternalModel()

    override suspend fun syncInventory() {
        val networkItems: List<InventoryItem> = apiService.get(Endpoints.INVENTORY)
        inventoryDao.insertInventoryItems(networkItems.map { it.asEntity() })
    }

    override suspend fun createInventoryItem(item: InventoryItem): InventoryItem {
        val networkItem: InventoryItem = apiService.post(Endpoints.INVENTORY, item)
        inventoryDao.insertInventoryItems(listOf(networkItem.asEntity()))
        return networkItem
    }

    override suspend fun updateInventoryItem(item: InventoryItem): InventoryItem {
        val networkItem: InventoryItem = apiService.put(Endpoints.inventoryItem(item.id), item)
        inventoryDao.insertInventoryItems(listOf(networkItem.asEntity()))
        return networkItem
    }

    override suspend fun deleteInventoryItem(id: String) {
        apiService.delete(Endpoints.inventoryItem(id))
        inventoryDao.deleteInventoryItemById(id)
    }
}
