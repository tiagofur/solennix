package com.creapolis.solennix.feature.settings.viewmodel

import android.app.Activity
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.revenuecat.purchases.Package
import com.creapolis.solennix.core.network.AuthManager
import com.creapolis.solennix.feature.settings.billing.BillingManager
import com.creapolis.solennix.feature.settings.billing.BillingState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import javax.inject.Inject

data class SubscriptionUiState(
    val billingState: BillingState = BillingState.NotReady,
    val proPackages: List<Package> = emptyList(),
    val premiumPackages: List<Package> = emptyList(),
    val currentPlanName: String = "Basico",
    val hasActiveSubscription: Boolean = false,
    val isLoading: Boolean = false
)

@HiltViewModel
class SubscriptionViewModel @Inject constructor(
    private val billingManager: BillingManager,
    private val authManager: AuthManager
) : ViewModel() {

    val uiState: StateFlow<SubscriptionUiState> = combine(
        billingManager.billingState,
        billingManager.packages,
        billingManager.customerInfo,
        authManager.currentUser
    ) { billingState, packages, customerInfo, user ->
        val proPackages = packages.filter {
            it.identifier.contains("pro", ignoreCase = true)
        }
        val premiumPackages = packages.filter {
            it.identifier.contains("premium", ignoreCase = true)
        }

        val hasPremium = billingManager.hasPremiumAccess()
        val hasPro = billingManager.hasProAccess()
        val hasSubscription = hasPro || hasPremium

        val currentPlan = when {
            hasPremium -> "Premium"
            hasPro -> "Pro"
            else -> user?.plan?.name?.replaceFirstChar { it.uppercase() } ?: "Basico"
        }

        SubscriptionUiState(
            billingState = billingState,
            proPackages = proPackages,
            premiumPackages = premiumPackages,
            currentPlanName = currentPlan,
            hasActiveSubscription = hasSubscription
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = SubscriptionUiState()
    )

    fun initBilling() {
        billingManager.initialize()
    }

    fun launchPurchase(activity: Activity, rcPackage: Package) {
        billingManager.purchase(activity, rcPackage)
    }

    fun restorePurchases() {
        billingManager.restorePurchases()
    }

    override fun onCleared() {
        super.onCleared()
        billingManager.cleanup()
    }
}
