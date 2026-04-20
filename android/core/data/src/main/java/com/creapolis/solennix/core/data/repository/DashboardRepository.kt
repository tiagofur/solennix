package com.creapolis.solennix.core.data.repository

import com.creapolis.solennix.core.model.DashboardEventStatusCount
import com.creapolis.solennix.core.model.DashboardKPIs
import com.creapolis.solennix.core.model.DashboardRevenuePoint

/**
 * Thin wrapper around the backend's dashboard endpoints. No local caching —
 * these aggregates are cheap on the server and we always want the latest
 * numbers on screen.
 */
interface DashboardRepository {
    suspend fun getKPIs(): DashboardKPIs
    suspend fun getRevenueChart(period: String = "year"): List<DashboardRevenuePoint>
    suspend fun getEventsByStatus(scope: String = "month"): List<DashboardEventStatusCount>
}
