package com.creapolis.solennix.ui.plan

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.data.plan.LimitCheckResult
import com.creapolis.solennix.core.data.plan.PlanLimitsManager
import com.creapolis.solennix.core.model.Plan
import com.creapolis.solennix.core.network.AuthManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Centralized gate for creating new events from any top-level entrypoint
 * (FAB, Dashboard quick-action, Events calendar, QuickQuote→Convert,
 * EventDetail→Duplicate). Mirrors iOS's `planLimitsManager.canCreateEvent`
 * check performed at the navigation call-site instead of deep inside the
 * form, so users hit the paywall *before* filling data.
 *
 * See #830 — Android was the only platform without list-level gating.
 */
@HiltViewModel
class EventPlanGateViewModel @Inject constructor(
    private val planLimitsManager: PlanLimitsManager,
    private val authManager: AuthManager
) : ViewModel() {

    var limitCheckResult by mutableStateOf<LimitCheckResult?>(null)
        private set

    val isLimitReached: Boolean
        get() = limitCheckResult is LimitCheckResult.LimitReached

    val limitReachedMessage: String?
        get() = (limitCheckResult as? LimitCheckResult.LimitReached)?.message

    init {
        checkLimit()
    }

    /**
     * Re-query the server-backed event count for the current month so the
     * gate reflects deletions/creations made since the last check. Safe to
     * call on every screen resume.
     */
    fun checkLimit() {
        viewModelScope.launch {
            val plan = authManager.currentUser.value?.plan ?: Plan.BASIC
            limitCheckResult = planLimitsManager.canCreateEvent(plan)
        }
    }
}
