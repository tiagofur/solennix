package com.creapolis.solennix.feature.dashboard.viewmodel

import android.content.Context
import android.util.Log
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.creapolis.solennix.feature.dashboard.R
import com.creapolis.solennix.core.data.plan.LimitCheckResult
import com.creapolis.solennix.core.data.plan.PlanLimitsManager
import com.creapolis.solennix.core.data.repository.ClientRepository
import com.creapolis.solennix.core.data.repository.DashboardRepository
import com.creapolis.solennix.core.data.repository.EventRepository
import com.creapolis.solennix.core.data.repository.InventoryRepository
import com.creapolis.solennix.core.data.repository.PaymentRepository
import com.creapolis.solennix.core.data.repository.ProductRepository
import com.creapolis.solennix.core.model.Client
import com.creapolis.solennix.core.model.DashboardEventStatusCount
import com.creapolis.solennix.core.model.DashboardKPIs
import com.creapolis.solennix.core.model.DashboardRevenuePoint
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.EventStatus
import com.creapolis.solennix.core.model.extensions.parseFlexibleDate
import com.creapolis.solennix.core.model.InventoryItem
import com.creapolis.solennix.core.model.Payment
import com.creapolis.solennix.core.model.Plan
import com.creapolis.solennix.core.model.Product
import com.creapolis.solennix.core.model.TopClient
import com.creapolis.solennix.core.model.ProductDemandItem
import com.creapolis.solennix.core.model.ForecastDataPoint
import com.creapolis.solennix.core.network.AuthManager
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

private const val TAG = "DashboardViewModel"

// Cutoff used to decide whether an event still has a pending payment balance.
// Centralized so detection logic and any UI threshold checks stay in sync.
internal const val MIN_PENDING_AMOUNT: Double = 0.01

private data class DataSnapshot(
    val upcoming: List<Event>,
    val lowStock: List<InventoryItem>,
    val allEvents: List<Event>,
    val allClients: List<Client>,
    val allPayments: List<Payment>,
    val allProducts: List<Product>
)

data class StatusCount(
    val status: EventStatus,
    val count: Int,
    val percentage: Float
)

enum class PendingEventReason {
    PAYMENT_DUE,        // confirmed in next 7 days, balance > 0
    OVERDUE_EVENT,      // past event still quoted/confirmed
    QUOTE_URGENT        // quoted in next 14 days
}

data class PendingEvent(
    val event: Event,
    val reason: PendingEventReason,
    val reasonLabel: String,
    val pendingAmount: Double = 0.0
)

data class DashboardUiState(
    val upcomingEvents: List<Event> = emptyList(),
    val lowStockItems: List<InventoryItem> = emptyList(),
    val isLoading: Boolean = false,
    val isRefreshing: Boolean = false,
    val revenueThisMonth: Double = 0.0,
    val eventsThisMonth: Int = 0,
    val totalClients: Int = 0,
    val cashCollected: Double = 0.0,
    val vatCollected: Double = 0.0,
    val vatOutstanding: Double = 0.0,
    val pendingQuotes: Int = 0,
    val lowStockCount: Int = 0,
    val isBasicPlan: Boolean = true,
    val pendingEvents: List<PendingEvent> = emptyList(),
    val statusDistribution: List<StatusCount> = emptyList(),
    val userName: String = "",
    val clientMap: Map<String, String> = emptyMap(),
    val hasClients: Boolean = false,
    val hasProducts: Boolean = false,
    val hasEvents: Boolean = false,
    val updatingEventId: String? = null,
    val paymentModalEvent: PendingEvent? = null,
    val transientMessage: String? = null,
    /** Last 6 months of revenue — populated from /dashboard/revenue-chart?period=year. Premium users only. */
    val monthlyRevenueTrend: List<DashboardRevenuePoint> = emptyList(),
    /** Top clients by total spent from /dashboard/top-clients */
    val topClients: List<com.creapolis.solennix.core.model.TopClient> = emptyList(),
    /** Products by demand from /dashboard/product-demand */
    val productDemand: List<com.creapolis.solennix.core.model.ProductDemandItem> = emptyList(),
    /** Revenue forecast from /dashboard/forecast */
    val forecast: List<com.creapolis.solennix.core.model.ForecastDataPoint> = emptyList(),
    val defaultCurrency: String = "MXN"
)

@HiltViewModel
class DashboardViewModel @Inject constructor(
    @ApplicationContext internal val appContext: Context,
    internal val eventRepository: EventRepository,
    internal val inventoryRepository: InventoryRepository,
    internal val clientRepository: ClientRepository,
    internal val paymentRepository: PaymentRepository,
    internal val productRepository: ProductRepository,
    internal val dashboardRepository: DashboardRepository,
    internal val authManager: AuthManager,
    internal val planLimitsManager: PlanLimitsManager
) : ViewModel() {

    internal fun tr(id: Int, vararg args: Any): String = appContext.getString(id, *args)

    // Plan limit check — drives the proactive near-limit banner on the
    // dashboard (parity with iOS DashboardView planLimitsBanner). The hard
    // block on "Nuevo evento" is handled centrally by EventPlanGateViewModel.
    var limitCheckResult by mutableStateOf<LimitCheckResult?>(null)
        internal set
    val nearLimitMessage: String?
        get() = (limitCheckResult as? LimitCheckResult.NearLimit)?.let {
            appContext.getString(com.creapolis.solennix.core.designsystem.R.string.plan_limit_events_near, it.remaining)
        }

    internal val _isRefreshing = MutableStateFlow(false)
    internal val _updatingEventId = MutableStateFlow<String?>(null)
    internal val _paymentModalEvent = MutableStateFlow<PendingEvent?>(null)
    internal val _transientMessage = MutableStateFlow<String?>(null)

    // Backend-aggregated KPIs (monetary, counts). Refreshed alongside
    // `refresh()`. Null while the first fetch is in flight.
    internal val _kpis = MutableStateFlow<DashboardKPIs?>(null)
    internal val _monthlyRevenueTrend = MutableStateFlow<List<DashboardRevenuePoint>>(emptyList())
    internal val _statusCountsFromBackend = MutableStateFlow<List<DashboardEventStatusCount>?>(null)
    internal val _topClients = MutableStateFlow<List<TopClient>>(emptyList())
    internal val _productDemand = MutableStateFlow<List<ProductDemandItem>>(emptyList())
    internal val _forecast = MutableStateFlow<List<ForecastDataPoint>>(emptyList())

    private val dataFlow = combine(
        eventRepository.getUpcomingEvents(5),
        inventoryRepository.getLowStockItems(),
        eventRepository.getEvents(),
        clientRepository.getClients(),
        paymentRepository.getPayments()
    ) { upcoming, lowStock, allEvents, allClients, allPayments ->
        DataSnapshot(upcoming, lowStock, allEvents, allClients, allPayments, emptyList())
    }

    private val enrichedDataFlow = combine(
        dataFlow,
        productRepository.getProducts()
    ) { data, allProducts ->
        data.copy(allProducts = allProducts)
    }

    // Bundle the three backend aggregates into one flow so the main combine
    // stays under the 5-arg overload ceiling.
    private data class DashboardAggregates(
        val kpis: DashboardKPIs?,
        val revenueTrend: List<DashboardRevenuePoint>,
        val statusRows: List<DashboardEventStatusCount>?,
        val topClients: List<TopClient>,
        val productDemand: List<ProductDemandItem>,
        val forecast: List<ForecastDataPoint>
    )

    // Combine first 3 flows into aggregate
    private val dashboardAggregatesFlow: Flow<DashboardAggregates> =
        combine(
            _kpis,
            _monthlyRevenueTrend,
            _statusCountsFromBackend
        ) { kpis, trend, status ->
            DashboardAggregates(kpis, trend, status, emptyList(), emptyList(), emptyList())
        }
    
    // Combine with analytics flows
    private val dashboardWithAnalyticsFlow: Flow<DashboardAggregates> =
        combine(
            dashboardAggregatesFlow,
            _topClients,
            _productDemand,
            _forecast
        ) { agg, topClients, productDemand, forecast ->
            agg.copy(
                topClients = topClients,
                productDemand = productDemand,
                forecast = forecast
            )
        }

    val uiState: StateFlow<DashboardUiState> = combine(
        enrichedDataFlow,
        dashboardWithAnalyticsFlow,
        _isRefreshing,
        _updatingEventId,
        combine(_paymentModalEvent, _transientMessage) { modal, msg -> modal to msg }
    ) { data, aggregates, isRefreshing, updatingEventId, modalAndMsg ->
        val kpis = aggregates.kpis
        val revenueTrend = aggregates.revenueTrend
        val statusRows = aggregates.statusRows
        val topClients = aggregates.topClients
        val productDemand = aggregates.productDemand
        val forecast = aggregates.forecast
        val (paymentModalEvent, transientMessage) = modalAndMsg

        val now = java.time.LocalDate.now()

        // Precompute paid-per-event once: O(payments) instead of O(events × payments).
        // Still needed here to build the `pendingEvents` alert cards below —
        // monetary KPIs themselves now come from the backend.
        val paidByEvent: Map<String, Double> = data.allPayments
            .groupingBy { it.eventId }
            .fold(0.0) { acc, payment -> acc + payment.amount }

        // Pending events — three categories aligned with web Dashboard:
        //   PAYMENT_DUE: confirmed in next 7 days with pending balance
        //   OVERDUE_EVENT: past date, still quoted/confirmed
        //   QUOTE_URGENT: quoted in next 14 days
        val sevenDaysFromNow = now.plusDays(7)
        val fourteenDaysFromNow = now.plusDays(14)
        val pendingEvents = mutableListOf<PendingEvent>()

        data.allEvents.forEach { event ->
            try {
                val eventDate = parseFlexibleDate(event.eventDate) ?: return@forEach
                val totalPaid = paidByEvent[event.id] ?: 0.0
                val pendingAmount = (event.totalAmount - totalPaid).coerceAtLeast(0.0)
                val hasPending = pendingAmount > MIN_PENDING_AMOUNT

                if (event.status == EventStatus.CONFIRMED &&
                    !eventDate.isBefore(now) && !eventDate.isAfter(sevenDaysFromNow) &&
                    hasPending
                ) {
                    pendingEvents.add(
                        PendingEvent(event, PendingEventReason.PAYMENT_DUE, tr(R.string.dashboard_attention_confirmed_payment_title), pendingAmount)
                    )
                } else if (eventDate.isBefore(now) &&
                    (event.status == EventStatus.QUOTED || event.status == EventStatus.CONFIRMED)
                ) {
                    pendingEvents.add(
                        PendingEvent(event, PendingEventReason.OVERDUE_EVENT, tr(R.string.dashboard_attention_overdue_event_kind), pendingAmount)
                    )
                } else if (event.status == EventStatus.QUOTED &&
                    !eventDate.isBefore(now) && !eventDate.isAfter(fourteenDaysFromNow)
                ) {
                    pendingEvents.add(
                        PendingEvent(event, PendingEventReason.QUOTE_URGENT, tr(R.string.dashboard_attention_quote_urgent_kind), pendingAmount)
                    )
                }
            } catch (_: Exception) { }
        }

        // Event status distribution — backend-sourced (scope=month) so it
        // matches iOS and Web. Iterate `EventStatus.entries` (declaration
        // order: QUOTED, CONFIRMED, COMPLETED, CANCELLED) instead of the
        // backend's count-DESC ordering so the legend lines up with iOS /
        // Web. Fall back to a client-side count over the month's events
        // while the first backend fetch is in flight so the card isn't
        // empty at first paint.
        val statusDistribution: List<StatusCount> = if (statusRows != null) {
            val byStatus: Map<EventStatus, Int> = statusRows.mapNotNull { row ->
                runCatching { EventStatus.valueOf(row.status.uppercase()) }.getOrNull()
                    ?.let { it to row.count }
            }.toMap()
            val total = byStatus.values.sum()
            EventStatus.entries.mapNotNull { status ->
                val count = byStatus[status] ?: 0
                if (count == 0) null else StatusCount(
                    status = status,
                    count = count,
                    percentage = if (total > 0) count.toFloat() / total else 0f
                )
            }
        } else {
            val monthEvents = data.allEvents.filter {
                val date = parseFlexibleDate(it.eventDate)
                date != null && date.month == now.month && date.year == now.year
            }
            val totalMonth = monthEvents.size
            EventStatus.entries.mapNotNull { status ->
                val count = monthEvents.count { it.status == status }
                if (count == 0) null else StatusCount(
                    status = status,
                    count = count,
                    percentage = if (totalMonth > 0) count.toFloat() / totalMonth else 0f
                )
            }
        }

        val currentPlan = authManager.currentUser.value?.plan ?: Plan.BASIC

        val currentUser = authManager.currentUser.value
        val firstName = currentUser?.name?.split(" ")?.firstOrNull() ?: ""
        val clientMap = data.allClients.associate { it.id to it.name }
        val defaultCurrency = currentUser?.defaultCurrencyCode ?: "MXN"

        DashboardUiState(
            upcomingEvents = data.upcoming,
            lowStockItems = data.lowStock,
            // Prefer backend count once the kpis call lands. Fall back to the
            // local low-stock list size while it's still in flight so the
            // card isn't empty at first paint.
            lowStockCount = kpis?.lowStockItems ?: data.lowStock.size,
            // isLoading is hardcoded false here; the skeleton guard in DashboardScreen
            // relies on the cold-start initialValue (isLoading=true) emitted before
            // the first combine result arrives. It is a one-shot signal only.
            isLoading = false,
            isRefreshing = isRefreshing,
            // Monetary + count KPIs: single source of truth is the backend.
            revenueThisMonth = kpis?.netSalesThisMonth ?: 0.0,
            eventsThisMonth = kpis?.eventsThisMonth ?: 0,
            totalClients = kpis?.totalClients ?: data.allClients.size,
            cashCollected = kpis?.cashCollectedThisMonth ?: 0.0,
            vatCollected = kpis?.vatCollectedThisMonth ?: 0.0,
            vatOutstanding = kpis?.vatOutstandingThisMonth ?: 0.0,
            pendingQuotes = kpis?.pendingQuotes ?: 0,
            isBasicPlan = currentPlan == Plan.BASIC,
            pendingEvents = pendingEvents,
            statusDistribution = statusDistribution,
            userName = firstName,
            clientMap = clientMap,
            hasClients = data.allClients.isNotEmpty(),
            hasProducts = data.allProducts.isNotEmpty(),
            hasEvents = data.allEvents.isNotEmpty(),
            updatingEventId = updatingEventId,
            paymentModalEvent = paymentModalEvent,
            transientMessage = transientMessage,
            // Backend returns up to 12 months (period=year) but only the
            // months with data. We zero-pad the trailing 6 so the chart
            // always shows 6 bars (parity with iOS / Web). Without padding,
            // new accounts or gap months make the chart collapse and look
            // broken.
            monthlyRevenueTrend = buildTrailingSixMonthTrend(revenueTrend, now),
            topClients = topClients,
            productDemand = productDemand,
            forecast = forecast,
            defaultCurrency = defaultCurrency
        )
    }.stateIn(
        scope = viewModelScope,
        started = SharingStarted.WhileSubscribed(5000),
        initialValue = DashboardUiState(isLoading = true)
    )

    init {
        refresh()
    }
}
