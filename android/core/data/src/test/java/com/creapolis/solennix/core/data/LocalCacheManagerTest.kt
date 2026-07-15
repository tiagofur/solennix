package com.creapolis.solennix.core.data

import com.creapolis.solennix.core.database.dao.ClientDao
import com.creapolis.solennix.core.database.dao.EventDao
import com.creapolis.solennix.core.database.dao.EventItemDao
import com.creapolis.solennix.core.database.dao.InventoryDao
import com.creapolis.solennix.core.database.dao.PaymentDao
import com.creapolis.solennix.core.database.dao.ProductDao
import com.creapolis.solennix.core.database.dao.StaffDao
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test

/**
 * Unit tests for [LocalCacheManager.clearAll].
 *
 * `clearAll` is the logout purge: it wipes every cached Room table so the
 * next tenant logging in on the same device cannot read the previous user's
 * data. It must touch all 7 DAOs (events, clients, products, inventory,
 * payments, event items, staff) and call each delete method exactly once.
 * A missed table is a cross-tenant data leak.
 */
class LocalCacheManagerTest {

    private lateinit var cacheManager: LocalCacheManager

    private val eventDao = mockk<EventDao>(relaxed = true)
    private val clientDao = mockk<ClientDao>(relaxed = true)
    private val productDao = mockk<ProductDao>(relaxed = true)
    private val inventoryDao = mockk<InventoryDao>(relaxed = true)
    private val paymentDao = mockk<PaymentDao>(relaxed = true)
    private val eventItemDao = mockk<EventItemDao>(relaxed = true)
    private val staffDao = mockk<StaffDao>(relaxed = true)

    @BeforeEach
    fun setUp() {
        cacheManager = LocalCacheManager(
            eventDao = eventDao,
            clientDao = clientDao,
            productDao = productDao,
            inventoryDao = inventoryDao,
            paymentDao = paymentDao,
            eventItemDao = eventItemDao,
            staffDao = staffDao
        )
    }

    @Test
    fun `clearAll wipes every cached table exactly once`() = runTest {
        cacheManager.clearAll()

        coVerify(exactly = 1) { eventItemDao.deleteAllProducts() }
        coVerify(exactly = 1) { eventItemDao.deleteAllExtras() }
        coVerify(exactly = 1) { paymentDao.deleteAll() }
        coVerify(exactly = 1) { eventDao.deleteAll() }
        coVerify(exactly = 1) { clientDao.deleteAll() }
        coVerify(exactly = 1) { productDao.deleteAll() }
        coVerify(exactly = 1) { inventoryDao.deleteAll() }
    }

    @Test
    fun `clearAll purges the staff catalog tables`() = runTest {
        cacheManager.clearAll()

        coVerify(exactly = 1) { staffDao.deleteAllStaff() }
        coVerify(exactly = 1) { staffDao.deleteAllEventStaff() }
    }
}
