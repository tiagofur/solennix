package com.creapolis.solennix.feature.dashboard.viewmodel

import android.util.Log
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.core.model.DashboardRevenuePoint
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

    // Pull the backend-aggregated KPIs + revenue trend independently so a
    // slow list sync doesn't block the header cards from painting, and a
    // single failed aggregate doesn't wipe the whole dashboard.
    viewModelScope.launch {
        try {
            _kpis.value = dashboardRepository.getKPIs()
        } catch (e: Exception) {
            Log.w(TAG, "dashboard KPIs fetch failed", e)
        }
    }
    viewModelScope.launch {
        try {
            _monthlyRevenueTrend.value = dashboardRepository.getRevenueChart("year")
        } catch (e: Exception) {
            Log.w(TAG, "revenue-chart fetch failed", e)
        }
    }
    viewModelScope.launch {
        try {
            _statusCountsFromBackend.value = dashboardRepository.getEventsByStatus("month")
        } catch (e: Exception) {
            Log.w(TAG, "events-by-status fetch failed", e)
        }
    }
    viewModelScope.launch {
        try {
            _topClients.value = dashboardRepository.getTopClients(5)
        } catch (e: Exception) {
            Log.w(TAG, "top-clients fetch failed", e)
        }
    }
    viewModelScope.launch {
        try {
            _productDemand.value = dashboardRepository.getProductDemand()
        } catch (e: Exception) {
            Log.w(TAG, "product-demand fetch failed", e)
        }
    }
    viewModelScope.launch {
        try {
            _forecast.value = dashboardRepository.getForecast()
        } catch (e: Exception) {
            Log.w(TAG, "forecast fetch failed", e)
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
