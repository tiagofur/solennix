package com.creapolis.solennix.core.data.di

import com.creapolis.solennix.core.data.repository.*
import com.creapolis.solennix.core.data.locale.LanguageReportStoring
import com.creapolis.solennix.core.data.locale.SharedPreferencesLanguageStore
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent

@Module
@InstallIn(SingletonComponent::class)
interface DataModule {
    @Binds
    fun bindsClientRepository(
        repository: OfflineFirstClientRepository
    ): ClientRepository

    @Binds
    fun bindsEventRepository(
        repository: OfflineFirstEventRepository
    ): EventRepository

    @Binds
    fun bindsProductRepository(
        repository: OfflineFirstProductRepository
    ): ProductRepository

    @Binds
    fun bindsInventoryRepository(
        repository: OfflineFirstInventoryRepository
    ): InventoryRepository

    @Binds
    fun bindsPaymentRepository(
        repository: OfflineFirstPaymentRepository
    ): PaymentRepository

    @Binds
    fun bindsSettingsRepository(
        repository: SettingsRepositoryImpl
    ): SettingsRepository

    @Binds
    fun bindsStaffRepository(
        repository: OfflineFirstStaffRepository
    ): StaffRepository

    @Binds
    fun bindsStaffTeamRepository(
        repository: DefaultStaffTeamRepository
    ): StaffTeamRepository

    @Binds
    fun bindsEventPublicLinkRepository(
        repository: DefaultEventPublicLinkRepository
    ): EventPublicLinkRepository

    @Binds
    fun bindsPublicProfileRepository(
        repository: DefaultPublicProfileRepository
    ): PublicProfileRepository

    @Binds
    fun bindsDashboardRepository(
        repository: DashboardRepositoryImpl
    ): DashboardRepository

    @Binds
    fun bindsLanguageReportStoring(
        store: SharedPreferencesLanguageStore
    ): LanguageReportStoring
}
