package com.creapolis.solennix.core.database

import android.content.Context
import android.util.Log
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import com.creapolis.solennix.core.database.converter.JsonConverters
import com.creapolis.solennix.core.database.dao.ClientDao
import com.creapolis.solennix.core.database.dao.EventDao
import com.creapolis.solennix.core.database.dao.EventItemDao
import com.creapolis.solennix.core.database.dao.InventoryDao
import com.creapolis.solennix.core.database.dao.PaymentDao
import com.creapolis.solennix.core.database.dao.ProductDao
import com.creapolis.solennix.core.database.entity.CachedClient
import com.creapolis.solennix.core.database.entity.CachedEvent
import com.creapolis.solennix.core.database.entity.CachedEventExtra
import com.creapolis.solennix.core.database.entity.CachedEventProduct
import com.creapolis.solennix.core.database.entity.CachedInventoryItem
import com.creapolis.solennix.core.database.entity.CachedPayment
import com.creapolis.solennix.core.database.entity.CachedProduct

const val DATABASE_NAME = "solennix-database"

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
    version = 6,
    exportSchema = true
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
        private const val TAG = "SolennixDatabase"

        // Intentional no-op: v5 was a version bump without schema changes.
        // Historical schemas for v4 were never exported (the schemas/ folder
        // starts at v6), so we cannot retroactively verify. If a crash report
        // shows a v4→v5 upgrade failing on a field addition we overlooked,
        // add the DDL here. Devices upgrading through this migration today
        // just tick the version counter.
        val MIGRATION_4_5 = object : Migration(4, 5) {
            override fun migrate(db: SupportSQLiteDatabase) {
                Log.d(TAG, "Running migration 4 -> 5 (no schema change)")
            }
        }

        val MIGRATION_5_6 = object : Migration(5, 6) {
            override fun migrate(db: SupportSQLiteDatabase) {
                Log.d(TAG, "Running migration 5 -> 6: add product_name to event_products")
                db.execSQL("ALTER TABLE event_products ADD COLUMN product_name TEXT")
            }
        }

        private val ALL_MIGRATIONS = arrayOf(MIGRATION_4_5, MIGRATION_5_6)

        /**
         * Manual singleton for use in contexts without Hilt (e.g., Glance widgets).
         * Hilt-injected code should use the DatabaseModule-provided instance instead.
         */
        @Volatile
        private var INSTANCE: SolennixDatabase? = null

        fun getInstance(context: Context): SolennixDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    SolennixDatabase::class.java,
                    DATABASE_NAME
                )
                    .addMigrations(*ALL_MIGRATIONS)
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
