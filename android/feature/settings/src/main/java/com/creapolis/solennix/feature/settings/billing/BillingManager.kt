package com.creapolis.solennix.feature.settings.billing

import android.app.Activity
import com.revenuecat.purchases.CustomerInfo
import com.revenuecat.purchases.Offerings
import com.revenuecat.purchases.Package
import com.revenuecat.purchases.Purchases
import com.revenuecat.purchases.getCustomerInfoWith
import com.revenuecat.purchases.getOfferingsWith
import com.revenuecat.purchases.logInWith
import com.revenuecat.purchases.logOutWith
import com.revenuecat.purchases.purchaseWith
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manages in-app purchases and subscriptions using RevenueCat.
 */
@Singleton
class BillingManager @Inject constructor() {

    companion object {
        // RevenueCat entitlement identifier
        const val ENTITLEMENT_PRO = "pro_access"
        const val ENTITLEMENT_PREMIUM = "premium_access"
    }

    private val _billingState = MutableStateFlow<BillingState>(BillingState.NotReady)
    val billingState: StateFlow<BillingState> = _billingState.asStateFlow()

    private val _packages = MutableStateFlow<List<Package>>(emptyList())
    val packages: StateFlow<List<Package>> = _packages.asStateFlow()

    private val _customerInfo = MutableStateFlow<CustomerInfo?>(null)
    val customerInfo: StateFlow<CustomerInfo?> = _customerInfo.asStateFlow()

    /**
     * Initialize by fetching offerings and customer info from RevenueCat.
     */
    fun initialize() {
        fetchOfferings()
        fetchCustomerInfo()
    }

    /**
     * Fetch available offerings (products/packages) from RevenueCat.
     */
    private fun fetchOfferings() {
        Purchases.sharedInstance.getOfferingsWith(
            onError = { error ->
                _billingState.value = BillingState.Error(
                    "Error al cargar planes: ${error.message}"
                )
            },
            onSuccess = { offerings ->
                val allPackages = offerings.current?.availablePackages ?: emptyList()
                _packages.value = allPackages
                _billingState.value = BillingState.Ready
            }
        )
    }

    /**
     * Fetch the current customer info (entitlements, active subscriptions).
     */
    private fun fetchCustomerInfo() {
        Purchases.sharedInstance.getCustomerInfoWith(
            onError = { error ->
                // Don't override billing state if offerings already loaded
                if (_billingState.value is BillingState.NotReady) {
                    _billingState.value = BillingState.Error(
                        "Error al verificar suscripcion: ${error.message}"
                    )
                }
            },
            onSuccess = { info ->
                _customerInfo.value = info
            }
        )
    }

    /**
     * Launch the purchase flow for a RevenueCat package.
     */
    fun purchase(activity: Activity, rcPackage: Package) {
        Purchases.sharedInstance.purchaseWith(
            purchaseParams = com.revenuecat.purchases.PurchaseParams.Builder(activity, rcPackage).build(),
            onError = { error, userCancelled ->
                if (!userCancelled) {
                    _billingState.value = BillingState.Error(
                        "Error en la compra: ${error.message}"
                    )
                }
            },
            onSuccess = { _, info ->
                _customerInfo.value = info
            }
        )
    }

    /**
     * Restore previous purchases from the store.
     */
    fun restorePurchases() {
        _billingState.value = BillingState.NotReady // Use as loading state
        Purchases.sharedInstance.restorePurchases(object : com.revenuecat.purchases.interfaces.ReceiveCustomerInfoCallback {
            override fun onError(error: com.revenuecat.purchases.PurchasesError) {
                _billingState.value = BillingState.Error(
                    "Error al restaurar compras: ${error.message}"
                )
            }

            override fun onReceived(customerInfo: CustomerInfo) {
                _customerInfo.value = customerInfo
                _billingState.value = BillingState.Ready
            }
        })
    }

    /**
     * Identify the user in RevenueCat after login.
     */
    fun login(userId: String) {
        Purchases.sharedInstance.logInWith(
            appUserID = userId,
            onError = { error ->
                // Log but don't block — purchases still work with anonymous ID
                android.util.Log.w("BillingManager", "RevenueCat login failed: ${error.message}")
            },
            onSuccess = { info, _ ->
                _customerInfo.value = info
            }
        )
    }

    /**
     * Reset RevenueCat user on logout (creates anonymous user).
     */
    fun logout() {
        Purchases.sharedInstance.logOutWith(
            onError = { error ->
                android.util.Log.w("BillingManager", "RevenueCat logout failed: ${error.message}")
            },
            onSuccess = { info ->
                _customerInfo.value = info
            }
        )
    }

    /**
     * Check if user has an active "pro_access" entitlement.
     */
    fun hasProAccess(): Boolean {
        return _customerInfo.value
            ?.entitlements
            ?.get(ENTITLEMENT_PRO)
            ?.isActive == true
    }

    /**
     * Check if user has an active "premium_access" entitlement.
     */
    fun hasPremiumAccess(): Boolean {
        return _customerInfo.value
            ?.entitlements
            ?.get(ENTITLEMENT_PREMIUM)
            ?.isActive == true
    }

    /**
     * Check if user has any active paid subscription (Pro or Premium).
     */
    fun hasProOrPremium(): Boolean {
        return hasProAccess() || hasPremiumAccess()
    }

    /**
     * Clean up — no-op for RevenueCat (SDK manages its own lifecycle).
     */
    fun cleanup() {
        // RevenueCat manages its own connection lifecycle.
    }
}

/**
 * State of the billing system.
 */
sealed class BillingState {
    data object NotReady : BillingState()
    data object Ready : BillingState()
    data class Error(val message: String) : BillingState()
}
