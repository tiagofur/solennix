package com.creapolis.solennix.widget

import com.creapolis.solennix.core.database.entity.CachedEvent
import com.creapolis.solennix.core.database.entity.CachedPayment
import com.creapolis.solennix.core.model.EventStatus
import com.creapolis.solennix.core.model.extensions.parseFlexibleDate
import java.time.LocalDate

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
