package com.creapolis.solennix.core.data

import com.creapolis.solennix.core.database.dao.ClientDao
import com.creapolis.solennix.core.database.dao.EventDao
import com.creapolis.solennix.core.database.dao.EventItemDao
import com.creapolis.solennix.core.database.dao.InventoryDao
import com.creapolis.solennix.core.database.dao.PaymentDao
import com.creapolis.solennix.core.database.dao.ProductDao
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class LocalCacheManager @Inject constructor(
    private val eventDao: EventDao,
    private val clientDao: ClientDao,
    private val productDao: ProductDao,
    private val inventoryDao: InventoryDao,
    private val paymentDao: PaymentDao,
    private val eventItemDao: EventItemDao
) {
    suspend fun clearAll() {
        eventItemDao.deleteAllProducts()
        eventItemDao.deleteAllExtras()
        paymentDao.deleteAll()
        eventDao.deleteAll()
        clientDao.deleteAll()
        productDao.deleteAll()
        inventoryDao.deleteAll()
    }
}
