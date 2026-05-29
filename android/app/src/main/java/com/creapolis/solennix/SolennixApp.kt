package com.creapolis.solennix

import android.app.Application
import coil3.ImageLoader
import coil3.ImageLoader.Builder
import coil3.SingletonImageLoader
import coil3.network.ktor3.KtorNetworkFetcherFactory
import coil3.request.crossfade
import com.revenuecat.purchases.Purchases
import com.revenuecat.purchases.PurchasesConfiguration
import com.creapolis.solennix.feature.inventory.InventoryStrings
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class SolennixApp : Application(), SingletonImageLoader.Factory {

    override fun onCreate() {
        super.onCreate()

        InventoryStrings.init(this)

        val revenueCatKey = BuildConfig.REVENUECAT_API_KEY.takeIf { it.isNotBlank() }
        if (revenueCatKey != null) {
            Purchases.configure(
                PurchasesConfiguration.Builder(this, revenueCatKey).build()
            )
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
