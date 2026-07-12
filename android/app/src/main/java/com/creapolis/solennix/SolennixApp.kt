package com.creapolis.solennix

import android.app.Application
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.ProcessLifecycleOwner
import coil3.ImageLoader
import coil3.ImageLoader.Builder
import coil3.SingletonImageLoader
import coil3.network.ktor3.KtorNetworkFetcherFactory
import coil3.request.crossfade
import com.revenuecat.purchases.Purchases
import com.revenuecat.purchases.PurchasesConfiguration
import com.creapolis.solennix.feature.inventory.InventoryStrings
import com.creapolis.solennix.feature.products.ProductStrings
import com.creapolis.solennix.core.network.AuthManager
import com.creapolis.solennix.core.data.widget.WidgetSyncTrigger
import dagger.hilt.android.HiltAndroidApp
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltAndroidApp
class SolennixApp : Application(), SingletonImageLoader.Factory {

    @Inject
    lateinit var authManager: AuthManager

    @Inject
    lateinit var widgetSyncTrigger: WidgetSyncTrigger

    private val appScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    override fun onCreate() {
        super.onCreate()

        InventoryStrings.init(this)
        ProductStrings.init(this)

        val revenueCatKey = BuildConfig.REVENUECAT_API_KEY.takeIf { it.isNotBlank() }
        if (revenueCatKey != null) {
            Purchases.configure(
                PurchasesConfiguration.Builder(this, revenueCatKey).build()
            )
        }

        observeAuthForWidgetSync()
        observeProcessForegroundForWidgetSync()
    }

    /**
     * Refresh home-screen widgets whenever the process comes to the foreground, so KPIs /
     * upcoming events reflect Room state after the user returns from another app. Mirrors
     * iOS `.solennixSceneActivated` (scenePhase == .active). Auth-gated inside the trigger.
     */
    private fun observeProcessForegroundForWidgetSync() {
        ProcessLifecycleOwner.get().lifecycle.addObserver(object : DefaultLifecycleObserver {
            override fun onStart(owner: LifecycleOwner) {
                widgetSyncTrigger.refreshAll()
            }
        })
    }

    /**
     * Refresh widgets on transition into `Authenticated`, covering every login path
     * (email, Google, Apple, team-invite accept) plus cold-launch session restore with one
     * observer instead of instrumenting each `AuthViewModel` entry point. Mirrors iOS
     * `SolennixApp.onChange(of: authManager.authState)` → `reloadAllWidgets()`.
     */
    private fun observeAuthForWidgetSync() {
        appScope.launch {
            authManager.authState
                .map { it == AuthManager.AuthState.Authenticated }
                .distinctUntilChanged()
                .collect { authenticated ->
                    if (authenticated) widgetSyncTrigger.refreshAll()
                }
        }
    }

    override fun newImageLoader(context: android.content.Context): ImageLoader {
        return ImageLoader.Builder(context)
            .components {
                add(KtorNetworkFetcherFactory())
            }
            .crossfade(true)
            .build()
    }
}
