package com.creapolis.solennix.widget

import com.creapolis.solennix.core.data.widget.WidgetSyncTrigger
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers

/**
 * Binds the Glance-backed [WidgetSyncCoordinator] as the app-wide
 * [WidgetSyncTrigger] implementation. The interface lives in `:core:data` (visible to
 * every feature module); the implementation lives here in `:app` where the Glance
 * dependency is available.
 */
@Module
@InstallIn(SingletonComponent::class)
interface WidgetModule {

    @Binds
    fun bindsWidgetSyncTrigger(
        coordinator: WidgetSyncCoordinator
    ): WidgetSyncTrigger

    @Binds
    fun bindsWidgetUpdater(
        updater: GlanceWidgetUpdater
    ): WidgetUpdater

    companion object {
        /**
         * Background dispatcher used by [WidgetSyncCoordinator]. Provided explicitly so it
         * can be swapped in tests.
         */
        @Provides
        fun provideWidgetDispatcher(): CoroutineDispatcher = Dispatchers.Default
    }
}

