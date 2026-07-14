package com.creapolis.solennix.core.data.plan

import android.content.Context
import com.creapolis.solennix.core.data.repository.ClientRepository
import com.creapolis.solennix.core.data.repository.EventRepository
import com.creapolis.solennix.core.data.repository.InventoryRepository
import com.creapolis.solennix.core.data.repository.ProductRepository
import com.creapolis.solennix.core.designsystem.R as DesignSystemR
import com.creapolis.solennix.core.model.Plan
import com.creapolis.solennix.core.network.AuthManager
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.first
import java.time.YearMonth
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manages plan-based feature limits for the application.
 */
@Singleton
class PlanLimitsManager @Inject constructor(
    @ApplicationContext private val appContext: Context,
    private val eventRepository: EventRepository,
    private val clientRepository: ClientRepository,
    private val productRepository: ProductRepository,
    private val inventoryRepository: InventoryRepository,
    private val authManager: AuthManager
) {
    companion object {
        // Basic plan limits (free tier)
        const val BASIC_EVENTS_PER_MONTH = 4
        const val BASIC_CLIENTS_TOTAL = 20
        const val BASIC_PRODUCTS_TOTAL = 15
        const val BASIC_INVENTORY_TOTAL = 30
        const val BASIC_CATALOG_TOTAL = 20

        // Pro and Business are unlimited. The difference between them lives at
        // the feature level (team seats, multi-business, advanced analytics),
        // not in usage caps.
    }

    /**
     * Get the limits for a specific plan.
     */
    fun getLimits(plan: Plan): PlanLimits {
        return when (plan) {
            Plan.BASIC -> PlanLimits(
                eventsPerMonth = BASIC_EVENTS_PER_MONTH,
                totalClients = BASIC_CLIENTS_TOTAL,
                totalProducts = BASIC_PRODUCTS_TOTAL,
                totalInventory = BASIC_INVENTORY_TOTAL,
                totalCatalog = BASIC_CATALOG_TOTAL,
                hasAdvancedReports = false,
                hasCustomBranding = false,
                hasPrioritySupport = false
            )
            Plan.PRO, Plan.PREMIUM -> PlanLimits(
                eventsPerMonth = Int.MAX_VALUE,
                totalClients = Int.MAX_VALUE,
                totalProducts = Int.MAX_VALUE,
                totalInventory = Int.MAX_VALUE,
                totalCatalog = Int.MAX_VALUE,
                hasAdvancedReports = true,
                hasCustomBranding = true,
                hasPrioritySupport = false
            )
            Plan.BUSINESS -> PlanLimits(
                eventsPerMonth = Int.MAX_VALUE,
                totalClients = Int.MAX_VALUE,
                totalProducts = Int.MAX_VALUE,
                totalInventory = Int.MAX_VALUE,
                totalCatalog = Int.MAX_VALUE,
                hasAdvancedReports = true,
                hasCustomBranding = true,
                hasPrioritySupport = true
            )
        }
    }

    /**
     * Get current usage counts (catalog counts from local cache; events use API in checks).
     */
    fun getUsage(): Flow<PlanUsage> {
        return combine(
            clientRepository.getClientCount(),
            productRepository.getActiveProductCount(),
            inventoryRepository.getInventoryItems()
        ) { totalClients, totalProducts, inventoryList ->
            PlanUsage(
                eventsThisMonth = 0,
                totalClients = totalClients,
                totalProducts = totalProducts,
                totalInventory = inventoryList.size
            )
        }
    }

    private suspend fun countEventsThisMonth(): Int {
        val currentMonth = YearMonth.now()
        val monthStart = currentMonth.atDay(1).toString()
        val monthEnd = currentMonth.plusMonths(1).atDay(1).toString()

        return try {
            eventRepository.getEventsByDateRangeFromApi(monthStart, monthEnd).size
        } catch (_: Exception) {
            val userId = authManager.currentUser.value?.id ?: return 0
            eventRepository.getEventCountForMonth(userId, monthStart, monthEnd).first()
        }
    }

    /**
     * Check if a specific action is allowed under the current plan.
     */
    suspend fun canCreateEvent(plan: Plan): LimitCheckResult {
        if (plan != Plan.BASIC) return LimitCheckResult.Allowed

        val limits = getLimits(plan)
        val eventsThisMonth = countEventsThisMonth()

        return if (eventsThisMonth >= limits.eventsPerMonth) {
            LimitCheckResult.LimitReached(
                feature = "events",
                current = eventsThisMonth,
                limit = limits.eventsPerMonth,
                message = appContext.getString(
                    DesignSystemR.string.plan_limit_events_reached, limits.eventsPerMonth
                )
            )
        } else if (eventsThisMonth >= limits.eventsPerMonth - 1) {
            LimitCheckResult.NearLimit(
                feature = "events",
                current = eventsThisMonth,
                limit = limits.eventsPerMonth,
                remaining = limits.eventsPerMonth - eventsThisMonth
            )
        } else {
            LimitCheckResult.Allowed
        }
    }

    suspend fun canCreateClient(plan: Plan): LimitCheckResult {
        val limits = getLimits(plan)
        val usage = getUsage().first()

        return if (usage.totalClients >= limits.totalClients) {
            LimitCheckResult.LimitReached(
                feature = "clients",
                current = usage.totalClients,
                limit = limits.totalClients,
                message = appContext.getString(
                    DesignSystemR.string.plan_limit_clients_reached, limits.totalClients
                )
            )
        } else if (usage.totalClients >= limits.totalClients - 5) {
            LimitCheckResult.NearLimit(
                feature = "clients",
                current = usage.totalClients,
                limit = limits.totalClients,
                remaining = limits.totalClients - usage.totalClients
            )
        } else {
            LimitCheckResult.Allowed
        }
    }

    suspend fun canCreateProduct(plan: Plan): LimitCheckResult {
        if (plan != Plan.BASIC) return LimitCheckResult.Allowed

        val limits = getLimits(plan)
        val usage = getUsage().first()
        val catalogTotal = usage.totalProducts + usage.totalInventory

        return if (usage.totalProducts >= limits.totalProducts) {
            LimitCheckResult.LimitReached(
                feature = "products",
                current = usage.totalProducts,
                limit = limits.totalProducts,
                message = appContext.getString(
                    DesignSystemR.string.plan_limit_products_reached, limits.totalProducts
                )
            )
        } else if (catalogTotal >= limits.totalCatalog) {
            LimitCheckResult.LimitReached(
                feature = "catalog",
                current = catalogTotal,
                limit = limits.totalCatalog,
                message = appContext.getString(
                    DesignSystemR.string.plan_limit_catalog_reached, limits.totalCatalog
                )
            )
        } else if (usage.totalProducts >= limits.totalProducts - 3) {
            LimitCheckResult.NearLimit(
                feature = "products",
                current = usage.totalProducts,
                limit = limits.totalProducts,
                remaining = limits.totalProducts - usage.totalProducts
            )
        } else {
            LimitCheckResult.Allowed
        }
    }

    suspend fun canCreateInventoryItem(plan: Plan): LimitCheckResult {
        if (plan != Plan.BASIC) return LimitCheckResult.Allowed

        val limits = getLimits(plan)
        val usage = getUsage().first()
        val catalogTotal = usage.totalProducts + usage.totalInventory

        return if (usage.totalInventory >= limits.totalInventory) {
            LimitCheckResult.LimitReached(
                feature = "inventory",
                current = usage.totalInventory,
                limit = limits.totalInventory,
                message = appContext.getString(
                    DesignSystemR.string.plan_limit_inventory_reached, limits.totalInventory
                )
            )
        } else if (catalogTotal >= limits.totalCatalog) {
            LimitCheckResult.LimitReached(
                feature = "catalog",
                current = catalogTotal,
                limit = limits.totalCatalog,
                message = appContext.getString(
                    DesignSystemR.string.plan_limit_catalog_reached, limits.totalCatalog
                )
            )
        } else if (usage.totalInventory >= limits.totalInventory - 3) {
            LimitCheckResult.NearLimit(
                feature = "inventory",
                current = usage.totalInventory,
                limit = limits.totalInventory,
                remaining = limits.totalInventory - usage.totalInventory
            )
        } else {
            LimitCheckResult.Allowed
        }
    }
}

/**
 * Limits for a specific plan.
 */
data class PlanLimits(
    val eventsPerMonth: Int,
    val totalClients: Int,
    val totalProducts: Int,
    val totalInventory: Int,
    val totalCatalog: Int,
    val hasAdvancedReports: Boolean,
    val hasCustomBranding: Boolean,
    val hasPrioritySupport: Boolean
)

/**
 * Current usage statistics.
 */
data class PlanUsage(
    val eventsThisMonth: Int,
    val totalClients: Int,
    val totalProducts: Int,
    val totalInventory: Int
)

/**
 * Result of checking whether an action is allowed.
 */
sealed class LimitCheckResult {
    data object Allowed : LimitCheckResult()

    data class NearLimit(
        val feature: String,
        val current: Int,
        val limit: Int,
        val remaining: Int
    ) : LimitCheckResult()

    data class LimitReached(
        val feature: String,
        val current: Int,
        val limit: Int,
        val message: String
    ) : LimitCheckResult()

    /**
     * Limit check failed (network/DB error). Used to fail-closed: callers should block
     * creation until the check succeeds, rather than silently allowing it (issue #849).
     */
    data object Error : LimitCheckResult()
}