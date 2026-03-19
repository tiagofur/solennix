package com.creapolis.solennix.core.database

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.creapolis.solennix.core.database.converter.JsonConverters
import com.creapolis.solennix.core.database.dao.ClientDao
import com.creapolis.solennix.core.database.dao.EventDao
import com.creapolis.solennix.core.database.dao.InventoryDao
import com.creapolis.solennix.core.database.dao.PaymentDao
import com.creapolis.solennix.core.database.dao.ProductDao
import com.creapolis.solennix.core.database.entity.CachedClient
import com.creapolis.solennix.core.database.entity.CachedEvent
import com.creapolis.solennix.core.database.entity.CachedInventoryItem
import com.creapolis.solennix.core.database.entity.CachedPayment
import com.creapolis.solennix.core.database.entity.CachedProduct

import com.creapolis.solennix.core.database.dao.EventItemDao
import com.creapolis.solennix.core.database.entity.CachedEventExtra
import com.creapolis.solennix.core.database.entity.CachedEventProduct

@Database(
    entities = [
        CachedClient::class,
        CachedEvent::class,
        CachedProduct::class,
        CachedInventoryItem::class,
        CachedPayment::class,
        CachedEventProduct::class,
        CachedEventExtra::class
    ],
    version = 3,
    exportSchema = false
)
@TypeConverters(JsonConverters::class)
abstract class SolennixDatabase : RoomDatabase() {
    abstract fun clientDao(): ClientDao
    abstract fun eventDao(): EventDao
    abstract fun productDao(): ProductDao
    abstract fun inventoryDao(): InventoryDao
    abstract fun paymentDao(): PaymentDao
    abstract fun eventItemDao(): EventItemDao

    companion object {
        @Volatile
        private var INSTANCE: SolennixDatabase? = null

        fun getInstance(context: Context): SolennixDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    SolennixDatabase::class.java,
                    "solennix_database"
                )
                    .fallbackToDestructiveMigrationOnDowngrade()
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
