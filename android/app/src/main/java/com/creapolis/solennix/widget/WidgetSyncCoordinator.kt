package com.creapolis.solennix.widget

import android.util.Log
import com.creapolis.solennix.core.data.widget.WidgetSyncTrigger
import com.creapolis.solennix.core.network.AuthManager
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import javax.inject.Inject
import javax.inject.Singleton

private const val TAG = "WidgetSyncCoordinator"

/**
 * Production [WidgetSyncTrigger] that keeps home-screen Glance widgets fresh after data
 * mutations. Mirrors iOS `WidgetSyncCoordinator` (PRs #921/#927/#928).
 *
 * On Android, widgets read Room directly inside `provideGlance`, so refreshing them is
 * just asking Glance to re-run `provideGlance` for every placed widget — no payload
 * derivation or App Group write is needed (unlike iOS). All work is delegated to
 * [WidgetUpdater].
 *
 * Hooks (parity with iOS `WidgetCenter.reloadAllTimelines()` triggers):
 *  - [SyncWorker][com.creapolis.solennix.sync.SyncWorker] post-sync
 *  - Feature ViewModels after local mutations (payment register, event status change, …)
 *  - Logout after [LocalCacheManager.clearAll][com.creapolis.solennix.core.data.LocalCacheManager.clearAll]
 *  - Login after `storeUser` succeeds
 *  - App foreground (`ProcessLifecycleOwner` ON_START), auth-gated
 *
 * All refresh attempts are best-effort: a Glance/RemoteView failure is logged and never
 * propagated to the caller (parity with iOS REQ-WDS-06).
 *
 * Threading: each public method is safe to call from any thread; it launches onto an
 * application-scoped [SupervisorJob] backed by [backgroundDispatcher] (default
 * [Dispatchers.Default]).
 */
@Singleton
class WidgetSyncCoordinator @Inject constructor(
    private val widgetUpdater: WidgetUpdater,
    private val authManager: AuthManager,
    private val backgroundDispatcher: CoroutineDispatcher = Dispatchers.Default
) : WidgetSyncTrigger {

    private val scope = CoroutineScope(SupervisorJob() + backgroundDispatcher)

    override fun refreshAll() {
        // Auth-gate: never refresh widgets when signed out, so a logged-out process
        // doesn't re-render widgets that would surface another tenant's rows.
        if (!isAuthenticated()) return
        launchRefresh()
    }

    override fun refreshAllUnconditional() {
        launchRefresh()
    }

    private fun launchRefresh() {
        scope.launch {
            try {
                widgetUpdater.updateAll()
            } catch (e: Exception) {
                Log.w(TAG, "widget refresh failed", e)
            }
        }
    }

    private fun isAuthenticated(): Boolean =
        authManager.authState.value == AuthManager.AuthState.Authenticated
}
