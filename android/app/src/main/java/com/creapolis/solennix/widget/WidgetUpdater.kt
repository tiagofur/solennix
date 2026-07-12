package com.creapolis.solennix.widget

import android.content.Context
import androidx.glance.appwidget.updateAll
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Abstraction over Glance's [updateAll] so [WidgetSyncCoordinator] can be unit-tested
 * without the Android framework. Mirrors the iOS `WidgetSyncing` protocol used by
 * `WidgetSyncCoordinator`.
 *
 * Android widgets read Room directly inside `provideGlance` (unlike iOS, where the app
 * derives payloads and writes them to an App Group container). So "syncing" here is
 * simply asking Glance to re-run `provideGlance` for every placed widget of every kind.
 */
interface WidgetUpdater {
    /**
     * Asks the Glance subsystem to refresh all placed widgets. Best-effort: callers must
     * wrap this in their own try/catch if they need to swallow framework errors.
     */
    suspend fun updateAll()
}

/**
 * Production [WidgetUpdater] that refreshes every placed instance of the three Glance
 * widget kinds registered in the `:widget` module.
 *
 * [androidx.glance.appwidget.updateAll] is a top-level suspend extension on
 * [androidx.glance.appwidget.GlanceAppWidget]; it triggers `provideGlance` for each
 * placed instance of that widget kind.
 */
@Singleton
class GlanceWidgetUpdater @Inject constructor(
    @ApplicationContext private val context: Context
) : WidgetUpdater {

    override suspend fun updateAll() {
        KpiWidget().updateAll(context)
        UpcomingEventsWidget().updateAll(context)
        QuickActionsWidget().updateAll(context)
    }
}
