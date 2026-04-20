package com.creapolis.solennix.core.data.repository

import com.creapolis.solennix.core.model.DashboardEventStatusCount
import com.creapolis.solennix.core.model.DashboardKPIs
import com.creapolis.solennix.core.model.DashboardRevenuePoint
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.Endpoints
import com.creapolis.solennix.core.network.get
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DashboardRepositoryImpl @Inject constructor(
    private val apiService: ApiService
) : DashboardRepository {

    override suspend fun getKPIs(): DashboardKPIs =
        apiService.get(Endpoints.DASHBOARD_KPIS)

    override suspend fun getRevenueChart(period: String): List<DashboardRevenuePoint> =
        apiService.get(
            Endpoints.DASHBOARD_REVENUE_CHART,
            mapOf("period" to period)
        )

    override suspend fun getEventsByStatus(scope: String): List<DashboardEventStatusCount> =
        apiService.get(
            Endpoints.DASHBOARD_EVENTS_BY_STATUS,
            mapOf("scope" to scope)
        )
}
