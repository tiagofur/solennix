package com.creapolis.solennix.feature.dashboard.viewmodel

import android.util.Log
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.model.DashboardRevenuePoint
import com.creapolis.solennix.core.model.Plan
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.YearMonth

private const val TAG = "DashboardViewModelSync"

fun DashboardViewModel.refresh() {
    viewModelScope.launch {
        _isRefreshing.value = true
        try {
            eventRepository.syncEvents()
            inventoryRepository.syncInventory()
            clientRepository.syncClients()
            paymentRepository.syncPayments()
            productRepository.syncProducts()
        } catch (e: Exception) {
            // Network sync errors are non-fatal
        } finally {
            _isRefreshing.value = false
        }
    }

    // Re-evaluate the event plan limit after the sync so the near-limit
    // banner reflects events created/deleted since the last refresh.
    viewModelScope.launch {
        limitCheckResult = planLimitsManager.canCreateEvent(
            authManager.currentUser.value?.plan ?: Plan.BASIC
        )
    }

    // Single bundled round-trip: KPIs + the 5 chart/widget datasets
    // (revenue-chart, events-by-status, top-clients, product-demand, forecast)
    // collapse into one GET /dashboard/summary (issue #807 / #931). Replaces
    // the 6 parallel launches that each fetched one endpoint.
    viewModelScope.launch {
        try {
            val summary = dashboardRepository.getSummary()
            _kpis.value = summary.kpis
            _monthlyRevenueTrend.value = summary.revenueChart
            _statusCountsFromBackend.value = summary.eventsByStatus
            _topClients.value = summary.topClients
            _productDemand.value = summary.productDemand
            _forecast.value = summary.forecast
            // Persist server-authoritative KPIs for the widget so it renders
            // netSalesThisMonth instead of a divergent client-side sum (#828).
            widgetSyncTrigger.saveKpiSnapshot(summary.kpis)
        } catch (e: Exception) {
            Log.w(TAG, "dashboard summary fetch failed", e)
        }
    }
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
