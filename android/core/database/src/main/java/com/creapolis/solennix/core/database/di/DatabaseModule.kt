package com.creapolis.solennix.core.database.di

import android.content.Context
import androidx.room.Room
import com.creapolis.solennix.core.database.DATABASE_NAME
import com.creapolis.solennix.core.database.SolennixDatabase
import com.creapolis.solennix.core.database.dao.ClientDao
import com.creapolis.solennix.core.database.dao.EventDao
import com.creapolis.solennix.core.database.dao.EventItemDao
import com.creapolis.solennix.core.database.dao.InventoryDao
import com.creapolis.solennix.core.database.dao.PaymentDao
import com.creapolis.solennix.core.database.dao.ProductDao
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {
    @Provides
    @Singleton
    fun provideSolennixDatabase(
        @ApplicationContext context: Context
    ): SolennixDatabase {
        return Room.databaseBuilder(
            context,
            SolennixDatabase::class.java,
            DATABASE_NAME
        )
            .addMigrations(SolennixDatabase.MIGRATION_4_5, SolennixDatabase.MIGRATION_5_6)
            .build()
    }

    @Provides
    fun provideClientDao(database: SolennixDatabase): ClientDao = database.clientDao()

    @Provides
    fun provideEventDao(database: SolennixDatabase): EventDao = database.eventDao()

    @Provides
    fun provideProductDao(database: SolennixDatabase): ProductDao = database.productDao()

    @Provides
    fun provideInventoryDao(database: SolennixDatabase): InventoryDao = database.inventoryDao()

    @Provides
    fun providePaymentDao(database: SolennixDatabase): PaymentDao = database.paymentDao()

    @Provides
    fun provideEventItemDao(database: SolennixDatabase): EventItemDao = database.eventItemDao()
}
