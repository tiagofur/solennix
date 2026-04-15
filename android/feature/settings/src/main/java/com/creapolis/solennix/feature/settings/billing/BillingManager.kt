package com.creapolis.solennix.feature.settings.billing

import android.app.Activity
import android.util.Log
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
        // RevenueCat entitlement identifier — must match the entitlement ID
        // configured in RevenueCat Dashboard → Project → Entitlements.
        // Aligned with iOS which already uses "pro_access" in production.
        // UI displays "Premium" — the internal ID is independent of the display name.
        const val ENTITLEMENT_ID = "pro_access"
    }

    private val _billingState = MutableStateFlow<BillingState>(BillingState.NotReady)
    val billingState: StateFlow<BillingState> = _billingState.asStateFlow()

    private val _packages = MutableStateFlow<List<Package>>(emptyList())
    val packages: StateFlow<List<Package>> = _packages.asStateFlow()

    private val _customerInfo = MutableStateFlow<CustomerInfo?>(null)
    val customerInfo: StateFlow<CustomerInfo?> = _customerInfo.asStateFlow()

    /**
     * Identifier of the package currently being purchased, or `null` if no purchase
     * is in flight. Used by UI to disable plan cards during the purchase flow and
     * prevent double-tap submissions.
     */
    private val _purchaseInProgress = MutableStateFlow<String?>(null)
    val purchaseInProgress: StateFlow<String?> = _purchaseInProgress.asStateFlow()

    /**
     * Initialize by fetching offerings and customer info from RevenueCat.
     *
     * If `REVENUECAT_API_KEY` is blank (debug builds), `Purchases.sharedInstance` is never
     * configured and any access throws `UninitializedPropertyAccessException`. We surface
     * this as a regular [BillingState.Error] so the UI shows an informative card instead
     * of crashing the app.
     */
    fun initialize() {
        if (!isRevenueCatAvailable()) {
            _billingState.value = BillingState.Error(
                "Suscripciones no disponibles: RevenueCat no está configurado."
            )
            return
        }
        fetchOfferings()
        fetchCustomerInfo()
    }

    private fun isRevenueCatAvailable(): Boolean = try {
        Purchases.sharedInstance
        true
    } catch (_: UninitializedPropertyAccessException) {
        false
    }

    /**
     * Fetch available offerings (products/packages) from RevenueCat.
     */
    /**
     * Retry fetching offerings — callable from UI after a fetch failure.
     * Resets state to NotReady to show a loading indicator while the retry runs.
     */
    fun retryFetchOfferings() {
        if (!isRevenueCatAvailable()) return
        _billingState.value = BillingState.NotReady
        fetchOfferings()
    }

    private fun fetchOfferings() {
        Purchases.sharedInstance.getOfferingsWith(
            onError = { error ->
                _billingState.value = BillingState.Error(
                    "No se pudieron cargar los planes: ${error.message}"
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
                        "No se pudo verificar tu suscripción: ${error.message}"
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
     *
     * Sets [purchaseInProgress] to the package identifier for the duration of the flow
     * so the UI can disable interactions and show a per-card loading indicator. The flag
     * is cleared in both success and error callbacks (including user cancellation).
     */
    fun purchase(activity: Activity, rcPackage: Package) {
        if (_purchaseInProgress.value != null) return // defensive: ignore double-tap
        if (!isRevenueCatAvailable()) return
        _purchaseInProgress.value = rcPackage.identifier
        Purchases.sharedInstance.purchaseWith(
            purchaseParams = com.revenuecat.purchases.PurchaseParams.Builder(activity, rcPackage).build(),
            onError = { error, userCancelled ->
                _purchaseInProgress.value = null
                if (!userCancelled) {
                    _billingState.value = BillingState.Error(
                        "No se pudo completar la compra: ${error.message}"
                    )
                }
            },
            onSuccess = { _, info ->
                _purchaseInProgress.value = null
                _customerInfo.value = info
            }
        )
    }

    /**
     * Restore previous purchases from the store.
     */
    fun restorePurchases() {
        if (!isRevenueCatAvailable()) return
        _billingState.value = BillingState.NotReady // Use as loading state
        Purchases.sharedInstance.restorePurchases(object : com.revenuecat.purchases.interfaces.ReceiveCustomerInfoCallback {
            override fun onError(error: com.revenuecat.purchases.PurchasesError) {
                _billingState.value = BillingState.Error(
                    "No se pudieron restaurar tus compras: ${error.message}"
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
        if (!isRevenueCatAvailable()) return
        Purchases.sharedInstance.logInWith(
            appUserID = userId,
            onError = { error ->
                // Log but don't block — purchases still work with anonymous ID
                Log.w("BillingManager", "RevenueCat login failed: ${error.message}")
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
        if (!isRevenueCatAvailable()) return
        Purchases.sharedInstance.logOutWith(
            onError = { error ->
                Log.w("BillingManager", "RevenueCat logout failed: ${error.message}")
            },
            onSuccess = { info ->
                _customerInfo.value = info
            }
        )
    }

    /**
     * Check if user has an active "premium" entitlement.
     */
    fun hasPremiumAccess(): Boolean {
        return _customerInfo.value
            ?.entitlements
            ?.get(ENTITLEMENT_ID)
            ?.isActive == true
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
