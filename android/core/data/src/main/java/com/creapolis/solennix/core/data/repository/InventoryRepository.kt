package com.creapolis.solennix.core.data.repository

import androidx.paging.Pager
import androidx.paging.PagingConfig
import androidx.paging.PagingData
import com.creapolis.solennix.core.data.paging.RemotePagingSource
import com.creapolis.solennix.core.database.dao.InventoryDao
import com.creapolis.solennix.core.database.entity.asEntity
import com.creapolis.solennix.core.database.entity.asExternalModel
import com.creapolis.solennix.core.model.InventoryItem
import com.creapolis.solennix.core.model.PaginatedResponse
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.get
import com.creapolis.solennix.core.network.post
import com.creapolis.solennix.core.network.put
import com.creapolis.solennix.core.network.Endpoints
import io.ktor.util.reflect.typeInfo
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

    /**
     * Returns a [PagingData] stream that loads inventory pages directly from
     * the remote API using server-side pagination.
     */
    fun getInventoryRemotePaging(
        sort: String = "name",
        order: String = "asc",
        query: String = "",
        type: String? = null
    ): Flow<PagingData<InventoryItem>>
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

    override fun getInventoryRemotePaging(
        sort: String,
        order: String,
        query: String,
        type: String?
    ): Flow<PagingData<InventoryItem>> {
        val params = buildMap {
            put("sort", sort)
            put("order", order)
            if (query.isNotBlank()) put("q", query)
            if (!type.isNullOrBlank()) put("type", type)
        }
        return Pager(
            config = PagingConfig(
                pageSize = 20,
                enablePlaceholders = true
            ),
            pagingSourceFactory = {
                RemotePagingSource<InventoryItem>(
                    apiService = apiService,
                    endpoint = Endpoints.INVENTORY,
                    params = params,
                    typeInfo = typeInfo<PaginatedResponse<InventoryItem>>(),
                    pageSize = 20
                )
            }
        ).flow
    }
}
