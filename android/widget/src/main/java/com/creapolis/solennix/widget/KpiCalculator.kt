package com.creapolis.solennix.widget

import com.creapolis.solennix.core.database.entity.CachedEvent
import com.creapolis.solennix.core.database.entity.CachedPayment
import com.creapolis.solennix.core.model.EventStatus
import com.creapolis.solennix.core.model.extensions.parseFlexibleDate
import java.time.LocalDate
import java.time.YearMonth

/**
 * Derives the outstanding payment balance for the widget, mirroring iOS
 * `WidgetSyncCoordinator.deriveKPIs(pendingPayments:)`.
 *
 * Scope: [EventStatus.CONFIRMED] events whose [CachedEvent.eventDate] falls in
 * the 7-day window `[today, today + 7 days]` (both inclusive). For each event,
 * its cached payments are subtracted from its [CachedEvent.totalAmount],
 * floored at 0 (an overpaid event never contributes a negative balance).
 *
 * Payments are matched by [CachedPayment.eventId]; events with no cached
 * payments degrade to their full [CachedEvent.totalAmount] (never crash).
 */
internal fun derivePendingPaymentBalance(
    events: List<CachedEvent>,
    payments: List<CachedPayment>,
    today: LocalDate = LocalDate.now()
): Double {
    val windowEnd = today.plusDays(7)

    val paidByEvent: Map<String, Double> = payments
        .groupingBy { it.eventId }
        .fold(0.0) { acc, payment -> acc + payment.amount }

    return events
        .asSequence()
        .filter { it.status == EventStatus.CONFIRMED }
        .filter { event ->
            val date = parseFlexibleDate(event.eventDate) ?: return@filter false
            !date.isBefore(today) && !date.isAfter(windowEnd)
        }
        .sumOf { event ->
            val totalPaid = paidByEvent[event.id] ?: 0.0
            (event.totalAmount - totalPaid).coerceAtLeast(0.0)
        }
}

/**
 * Counts upcoming (today and future) events for the widget, mirroring the
 * inline derivation previously embedded in [KpiWidget.provideGlance].
 *
 * Scope: events whose [CachedEvent.eventDate] is today or later
 * (`!date.isBefore(today)`) and whose [CachedEvent.status] is anything other
 * than [EventStatus.CANCELLED]. Events with unparseable dates are discarded.
 *
 * Note: this is intentionally broader than the dedicated
 * [UpcomingEventsWidget] SQL query (which filters to `CONFIRMED` only) and
 * than the iOS `confirmedEvents` KPI. It preserves the existing KpiWidget
 * "Próximos" counter, which treats quoted/completed future events as upcoming.
 */
internal fun deriveUpcomingEventsCount(
    events: List<CachedEvent>,
    today: LocalDate = LocalDate.now()
): Int = events.count { event ->
    val date = parseFlexibleDate(event.eventDate) ?: return@count false
    !date.isBefore(today) && event.status != EventStatus.CANCELLED
}

/**
 * Fallback monthly revenue derivation used when no server KPI snapshot is available yet
 * (cold launch before the dashboard's first `/dashboard/summary` fetch). Mirrors iOS
 * `WidgetSyncCoordinator.deriveKPIs` cache-fallback and the backend's
 * `net_sales_this_month` scope: [EventStatus.CONFIRMED] + [EventStatus.COMPLETED] events
 * whose [CachedEvent.eventDate] falls in the current calendar month.
 *
 * `totalAmount` is already the post-discount final amount stored by the backend, so no
 * extra discount subtraction is needed. This matches the backend's
 * `SUM(total_amount) WHERE status IN ('confirmed','completed')` definition.
 *
 * Note: this is a best-effort fallback. The server snapshot (when available via
 * [WidgetKpiStore]) is always preferred for exact parity with tax/discount handling.
 */
internal fun deriveMonthlyRevenue(
    events: List<CachedEvent>,
    today: LocalDate = LocalDate.now()
): Double {
    val currentMonth = YearMonth.from(today)
    return events
        .asSequence()
        .filter {
            it.status == EventStatus.CONFIRMED || it.status == EventStatus.COMPLETED
        }
        .filter { event ->
            val date = parseFlexibleDate(event.eventDate) ?: return@filter false
            YearMonth.from(date) == currentMonth
        }
        .sumOf { it.totalAmount }
}

