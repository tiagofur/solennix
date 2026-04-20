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
import com.creapolis.solennix.core.database.dao.StaffDao
import com.creapolis.solennix.core.database.entity.CachedClient
import com.creapolis.solennix.core.database.entity.CachedEvent
import com.creapolis.solennix.core.database.entity.CachedEventExtra
import com.creapolis.solennix.core.database.entity.CachedEventProduct
import com.creapolis.solennix.core.database.entity.CachedEventStaff
import com.creapolis.solennix.core.database.entity.CachedInventoryItem
import com.creapolis.solennix.core.database.entity.CachedPayment
import com.creapolis.solennix.core.database.entity.CachedProduct
import com.creapolis.solennix.core.database.entity.CachedStaff

const val DATABASE_NAME = "solennix-database"

@Database(
    entities = [
        CachedClient::class,
        CachedEvent::class,
        CachedProduct::class,
        CachedInventoryItem::class,
        CachedPayment::class,
        CachedEventProduct::class,
        CachedEventExtra::class,
        CachedStaff::class,
        CachedEventStaff::class
    ],
    version = 10,
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
    abstract fun staffDao(): StaffDao

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

        /**
         * v7 — Personal / Colaboradores (Phase 1).
         *
         * Crea dos tablas:
         *   - `cached_staff`: catálogo de colaboradores del organizador.
         *   - `cached_event_staff`: asignaciones por evento. Incluye columnas
         *     denormalizadas (`staff_name`, `staff_role_label`, etc.) para
         *     pintar la lista sin un join extra en el cliente — replica el
         *     shape que devuelve el backend en `GET /events/{id}/staff`.
         */
        val MIGRATION_6_7 = object : Migration(6, 7) {
            override fun migrate(db: SupportSQLiteDatabase) {
                Log.d(TAG, "Running migration 6 -> 7: create cached_staff + cached_event_staff")
                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS `cached_staff` (
                        `id` TEXT NOT NULL,
                        `user_id` TEXT NOT NULL,
                        `name` TEXT NOT NULL,
                        `role_label` TEXT,
                        `phone` TEXT,
                        `email` TEXT,
                        `notes` TEXT,
                        `notification_email_opt_in` INTEGER NOT NULL,
                        `invited_user_id` TEXT,
                        `created_at` TEXT NOT NULL,
                        `updated_at` TEXT NOT NULL,
                        `sync_status` TEXT NOT NULL,
                        PRIMARY KEY(`id`)
                    )
                    """.trimIndent()
                )
                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS `cached_event_staff` (
                        `id` TEXT NOT NULL,
                        `event_id` TEXT NOT NULL,
                        `staff_id` TEXT NOT NULL,
                        `fee_amount` REAL,
                        `role_override` TEXT,
                        `notes` TEXT,
                        `notification_sent_at` TEXT,
                        `notification_last_result` TEXT,
                        `created_at` TEXT NOT NULL,
                        `staff_name` TEXT,
                        `staff_role_label` TEXT,
                        `staff_phone` TEXT,
                        `staff_email` TEXT,
                        PRIMARY KEY(`id`)
                    )
                    """.trimIndent()
                )
            }
        }

        /**
         * v8 — Mirror backend migration 028: add `include_in_checklist` to
         * `event_extras`. Controla si el extra aparece en el PDF de checklist
         * de carga. Default TRUE para match con Web + backend (opt-out model).
         */
        val MIGRATION_7_8 = object : Migration(7, 8) {
            override fun migrate(db: SupportSQLiteDatabase) {
                Log.d(TAG, "Running migration 7 -> 8: add include_in_checklist to event_extras")
                db.execSQL("ALTER TABLE event_extras ADD COLUMN include_in_checklist INTEGER NOT NULL DEFAULT 1")
            }
        }

        /**
         * v9 — Ola 1 (operational layer) del módulo Personal.
         *
         * Agrega `shift_start`, `shift_end` y `status` a `cached_event_staff`
         * para espejar el backend. Nullable — filas existentes quedan sin turno
         * y sin status (la UI asume `confirmed` cuando `status` es null).
         */
        val MIGRATION_8_9 = object : Migration(8, 9) {
            override fun migrate(db: SupportSQLiteDatabase) {
                Log.d(TAG, "Running migration 8 -> 9: add shift_start/shift_end/status to cached_event_staff")
                db.execSQL("ALTER TABLE cached_event_staff ADD COLUMN shift_start TEXT")
                db.execSQL("ALTER TABLE cached_event_staff ADD COLUMN shift_end TEXT")
                db.execSQL("ALTER TABLE cached_event_staff ADD COLUMN status TEXT")
            }
        }

        /**
         * v10 — Ola 3 del módulo Personal: `products.staff_team_id`. Permite
         * asociar un equipo opcional al producto; el cliente expande los
         * miembros en asignaciones de staff cuando se agrega al evento.
         */
        val MIGRATION_9_10 = object : Migration(9, 10) {
            override fun migrate(db: SupportSQLiteDatabase) {
                Log.d(TAG, "Running migration 9 -> 10: add staff_team_id to products")
                db.execSQL("ALTER TABLE products ADD COLUMN staff_team_id TEXT")
            }
        }

        val ALL_MIGRATIONS = arrayOf(MIGRATION_4_5, MIGRATION_5_6, MIGRATION_6_7, MIGRATION_7_8, MIGRATION_8_9, MIGRATION_9_10)

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
