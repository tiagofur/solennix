package com.creapolis.solennix

import android.app.Application
import com.revenuecat.purchases.Purchases
import com.revenuecat.purchases.PurchasesConfiguration
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class SolennixApp : Application() {

    override fun onCreate() {
        super.onCreate()

        // Configure RevenueCat SDK
        Purchases.configure(
            PurchasesConfiguration.Builder(this, "goog_YOUR_API_KEY").build()
        )
    }
}
