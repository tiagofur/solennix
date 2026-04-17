package com.creapolis.solennix.feature.settings.viewmodel

import android.app.Activity
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.revenuecat.purchases.Package
import com.creapolis.solennix.core.designsystem.event.UiEvent
import com.creapolis.solennix.core.model.SubscriptionInfo
import com.creapolis.solennix.core.model.SubscriptionProvider
import com.creapolis.solennix.core.model.SubscriptionStatusResponse
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.AuthManager
import com.creapolis.solennix.core.network.Endpoints
import com.creapolis.solennix.core.network.get
import com.creapolis.solennix.feature.settings.billing.BillingManager
import com.creapolis.solennix.feature.settings.billing.BillingState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SubscriptionUiState(
    val billingState: BillingState = BillingState.NotReady,
    val proPackages: List<Package> = emptyList(),
    val currentPlanName: String = "Básico",
    val hasActiveSubscription: Boolean = false,
    val purchasingPackageId: String? = null,
    val provider: SubscriptionProvider? = null,
    val subscription: SubscriptionInfo? = null,
)

@HiltViewModel
class SubscriptionViewModel @Inject constructor(
    private val billingManager: BillingManager,
    private val authManager: AuthManager,
    private val apiService: ApiService,
) : ViewModel() {

    private val _subscription = MutableStateFlow<SubscriptionInfo?>(null)

    private val _uiEvents = MutableSharedFlow<UiEvent>(extraBufferCapacity = 1)
    val uiEvents: SharedFlow<UiEvent> = _uiEvents.asSharedFlow()

    // Track last error message so we only emit Snackbar once per transition into Error.
    private var lastErrorShown: String? = null

    val uiState: StateFlow<SubscriptionUiState> = combine(
        billingManager.billingState,
        billingManager.packages,
        billingManager.customerInfo,
        billingManager.purchaseInProgress,
        authManager.currentUser,
        _subscription,
    ) { values ->
        val billingState = values[0] as BillingState
        @Suppress("UNCHECKED_CAST")
        val packages = values[1] as List<Package>
        val purchasingId = values[3] as? String
        val user = values[4] as? com.creapolis.solennix.core.model.User
        val subscription = values[5] as? SubscriptionInfo
        val provider = subscription?.provider

        // Surface error snackbars as a side effect of state observation.
        if (billingState is BillingState.Error && lastErrorShown != billingState.message) {
            lastErrorShown = billingState.message
            _uiEvents.tryEmit(
                UiEvent.Error(
                    message = billingState.message,
                    retryActionId = RETRY_FETCH_OFFERINGS,
                )
            )
        } else if (billingState !is BillingState.Error) {
            lastErrorShown = null
        }

        // Basic is free (no RC package). All packages from the current offering
        // are the Pro tier — no filter needed. RC standard identifiers are
        // $rc_monthly, $rc_annual, etc.
        val proPackages = packages

        val hasSubscription = billingManager.hasProAccess()

        // Label strategy (mirrors iOS and the backend/Stripe/RevenueCat contract):
        // show the literal plan the user is on. `PREMIUM` is a legacy DB value
        // that predates the Pro/Business split and is rendered as "Pro".
        val currentPlan = when {
            user?.plan == com.creapolis.solennix.core.model.Plan.BUSINESS -> "Business"
            hasSubscription -> "Pro"
            user?.plan == com.creapolis.solennix.core.model.Plan.PRO -> "Pro"
            user?.plan == com.creapolis.solennix.core.model.Plan.PREMIUM -> "Pro"
            else -> "Básico"
        }

        SubscriptionUiState(
            billingState = billingState,
            proPackages = proPackages,
            currentPlanName = currentPlan,
            hasActiveSubscription = hasSubscription,
            purchasingPackageId = purchasingId,
            provider = provider,
            subscription = subscription,
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = SubscriptionUiState(),
    )

    fun initBilling() {
        billingManager.initialize()
        fetchBackendStatus()
    }

    private fun fetchBackendStatus() {
        viewModelScope.launch {
            try {
                val response: SubscriptionStatusResponse =
                    apiService.get(Endpoints.SUBSCRIPTION_STATUS)
                _subscription.value = response.subscription
            } catch (_: Exception) {
                // Non-fatal: subscription info is informational
            }
        }
    }

    fun launchPurchase(activity: Activity, rcPackage: Package) {
        billingManager.purchase(activity, rcPackage)
    }

    fun restorePurchases() {
        billingManager.restorePurchases()
    }

    /**
     * Handle Snackbar retry actions emitted by [UiEvent.Error.retryActionId].
     * Currently only [RETRY_FETCH_OFFERINGS] is supported.
     */
    fun onRetry(actionId: String) {
        when (actionId) {
            RETRY_FETCH_OFFERINGS -> billingManager.retryFetchOfferings()
        }
    }

    override fun onCleared() {
        super.onCleared()
        billingManager.cleanup()
    }

    private companion object {
        const val RETRY_FETCH_OFFERINGS = "billing:fetchOfferings"
    }
}
