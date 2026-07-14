package com.creapolis.solennix.feature.dashboard.viewmodel

import android.util.Log
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.model.DashboardRevenuePoint
import com.creapolis.solennix.core.model.Plan
import com.creapolis.solennix.feature.dashboard.R
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.YearMonth

private const val TAG = "DashboardViewModelSync"

/**
 * Minimum time between automatic (resume-triggered) refreshes.
 * Rapid app foregrounding should not hammer the backend with 7+ API calls
 * per resume (#847). Pull-to-refresh and the toolbar icon bypass this gate
 * via [forceRefresh].
 */
private const val RESUME_DEBOUNCE_MS = 30_000L

fun DashboardViewModel.refresh() {
    // Skip resume-triggered refresh if data is fresh within the debounce
    // window, or if a refresh is already in flight (#847).
    val now = System.currentTimeMillis()
    val isFresh = _lastRefreshTime.value != null &&
        now - _lastRefreshTime.value!! < RESUME_DEBOUNCE_MS
    if (isFresh || _isRefreshing.value) return

    doRefresh(isAutomatic = true)
}

/**
 * Unconditional refresh — bypasses the debounce gate. Used by pull-to-refresh
 * and the toolbar refresh icon, where the user explicitly requested fresh data.
 */
fun DashboardViewModel.forceRefresh() {
    // Cancel any in-flight refresh to avoid stacking duplicate network calls (#847).
    _refreshJob.value?.cancel()
    doRefresh(isAutomatic = false)
}

private fun DashboardViewModel.doRefresh(isAutomatic: Boolean) {
    val now = System.currentTimeMillis()

    // Launch 1: entity syncs (5 sequential GETs). Track partial failure
    // so the user knows some data may be stale (#840).
    val syncJob = viewModelScope.launch {
        _isRefreshing.value = true
        var syncFailed = false
        try {
            eventRepository.syncEvents()
            inventoryRepository.syncInventory()
            clientRepository.syncClients()
            paymentRepository.syncPayments()
            productRepository.syncProducts()
        } catch (e: Exception) {
            syncFailed = true
            Log.w(TAG, "entity sync failed", e)
        } finally {
            _isRefreshing.value = false
        }
        if (syncFailed) {
            _transientMessage.value = tr(R.string.dashboard_error_sync_failed)
        }
    }
    _refreshJob.value = syncJob

    // Re-evaluate the event plan limit after the sync so the near-limit
    // banner reflects events created/deleted since the last refresh.
    viewModelScope.launch {
        limitCheckResult = planLimitsManager.canCreateEvent(
            authManager.currentUser.value?.plan ?: Plan.BASIC
        )
    }

    // Single bundled round-trip: KPIs + the 5 chart/widget datasets
    // (revenue-chart, events-by-status, top-clients, product-demand, forecast)
    // collapse into one GET /dashboard/summary (issue #807 / #931).
    viewModelScope.launch {
        try {
            val summary = dashboardRepository.getSummary()
            _kpis.value = summary.kpis
            widgetSyncTrigger.saveKpiSnapshot(summary.kpis)

            val isBasicPlan = authManager.currentUser.value?.plan == Plan.BASIC
            if (!isBasicPlan) {
                _monthlyRevenueTrend.value = summary.revenueChart
                _topClients.value = summary.topClients
                _productDemand.value = summary.productDemand
                _forecast.value = summary.forecast
            } else {
                _monthlyRevenueTrend.value = emptyList()
                _topClients.value = emptyList()
                _productDemand.value = emptyList()
                _forecast.value = emptyList()
            }
            _statusCountsFromBackend.value = summary.eventsByStatus
        } catch (e: Exception) {
            Log.w(TAG, "dashboard summary fetch failed", e)
            // Only show a toast for summary failures — the entity sync toast
            // above already covers the common "no network" case. A redundant
            // second toast would be noisy.
            if (!isAutomatic) {
                _transientMessage.value = tr(R.string.dashboard_error_sync_failed)
            }
        }
    }

    _lastRefreshTime.value = now
}

/**
 * Build 6 ordered `DashboardRevenuePoint`s ending at the current month.
 * Missing months get `revenue=0`, `eventCount=0`. The chart Composable
 * maps the YYYY-MM string to a localized month label.
 */
internal fun DashboardViewModel.buildTrailingSixMonthTrend(
    serverPoints: List<DashboardRevenuePoint>,
    today: LocalDate
): List<DashboardRevenuePoint> {
    val byMonth = serverPoints.associateBy { it.month }
    val current = YearMonth.from(today)
    return (5 downTo 0).map { offset ->
        val ym = current.minusMonths(offset.toLong())
        val key = ym.toString() // "YYYY-MM"
        byMonth[key] ?: DashboardRevenuePoint(month = key, revenue = 0.0, eventCount = 0)
    }
}
