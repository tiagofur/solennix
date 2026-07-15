package com.creapolis.solennix.widget

import com.creapolis.solennix.core.database.entity.CachedEvent
import com.creapolis.solennix.core.database.entity.CachedPayment
import com.creapolis.solennix.core.database.entity.SyncStatus
import com.creapolis.solennix.core.model.DiscountType
import com.creapolis.solennix.core.model.EventStatus
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import java.time.LocalDate

class KpiCalculatorTest {

    private val today = LocalDate.of(2026, 7, 10)

    @Test
    fun `confirmed event minus partial payment yields outstanding balance`() {
        val events = listOf(
            event("e1", totalAmount = 1000.0, status = EventStatus.CONFIRMED, date = today)
        )
        val payments = listOf(payment("p1", eventId = "e1", amount = 300.0))

        assertEquals(700.0, derivePendingPaymentBalance(events, payments, today))
    }

    @Test
    fun `fully paid event contributes zero`() {
        val events = listOf(
            event("e1", totalAmount = 1000.0, status = EventStatus.CONFIRMED, date = today)
        )
        val payments = listOf(payment("p1", eventId = "e1", amount = 1000.0))

        assertEquals(0.0, derivePendingPaymentBalance(events, payments, today))
    }

    @Test
    fun `event with no cached payments degrades to full amount`() {
        val events = listOf(
            event("e1", totalAmount = 1500.0, status = EventStatus.CONFIRMED, date = today)
        )

        assertEquals(1500.0, derivePendingPaymentBalance(events, emptyList(), today))
    }

    @Test
    fun `quoted events are excluded from pending balance`() {
        val events = listOf(
            event("e1", totalAmount = 1000.0, status = EventStatus.QUOTED, date = today),
            event("e2", totalAmount = 500.0, status = EventStatus.CONFIRMED, date = today)
        )

        assertEquals(500.0, derivePendingPaymentBalance(events, emptyList(), today))
    }

    @Test
    fun `completed events are excluded from pending balance`() {
        val events = listOf(
            event("e1", totalAmount = 1000.0, status = EventStatus.COMPLETED, date = today),
            event("e2", totalAmount = 500.0, status = EventStatus.CONFIRMED, date = today)
        )

        assertEquals(500.0, derivePendingPaymentBalance(events, emptyList(), today))
    }

    @Test
    fun `cancelled events are excluded from pending balance`() {
        val events = listOf(
            event("e1", totalAmount = 1000.0, status = EventStatus.CANCELLED, date = today)
        )

        assertEquals(0.0, derivePendingPaymentBalance(events, emptyList(), today))
    }

    @Test
    fun `events outside the 7-day window are excluded`() {
        val events = listOf(
            event("e1", totalAmount = 1000.0, status = EventStatus.CONFIRMED, date = today.minusDays(1)),
            event("e2", totalAmount = 1000.0, status = EventStatus.CONFIRMED, date = today.plusDays(8))
        )

        assertEquals(0.0, derivePendingPaymentBalance(events, emptyList(), today))
    }

    @Test
    fun `events at window boundaries are included`() {
        val events = listOf(
            event("e1", totalAmount = 1000.0, status = EventStatus.CONFIRMED, date = today),
            event("e2", totalAmount = 2000.0, status = EventStatus.CONFIRMED, date = today.plusDays(7))
        )

        assertEquals(3000.0, derivePendingPaymentBalance(events, emptyList(), today))
    }

    @Test
    fun `overpaid event floors at zero and never contributes negative`() {
        val events = listOf(
            event("e1", totalAmount = 1000.0, status = EventStatus.CONFIRMED, date = today),
            event("e2", totalAmount = 500.0, status = EventStatus.CONFIRMED, date = today)
        )
        val payments = listOf(payment("p1", eventId = "e1", amount = 1200.0))

        assertEquals(500.0, derivePendingPaymentBalance(events, payments, today))
    }

    @Test
    fun `multiple confirmed events sum their outstanding balances`() {
        val events = listOf(
            event("e1", totalAmount = 1000.0, status = EventStatus.CONFIRMED, date = today),
            event("e2", totalAmount = 2000.0, status = EventStatus.CONFIRMED, date = today.plusDays(3))
        )
        val payments = listOf(
            payment("p1", eventId = "e1", amount = 300.0),
            payment("p2", eventId = "e2", amount = 500.0)
        )

        assertEquals(2200.0, derivePendingPaymentBalance(events, payments, today))
    }

    @Test
    fun `empty event list yields zero`() {
        assertEquals(0.0, derivePendingPaymentBalance(emptyList(), emptyList(), today))
    }

    @Test
    fun `event with unparseable date is discarded`() {
        val events = listOf(
            event("e1", totalAmount = 1000.0, status = EventStatus.CONFIRMED, dateString = "invalid")
        )

        assertEquals(0.0, derivePendingPaymentBalance(events, emptyList(), today))
    }

    @Test
    fun `payment for unrelated event does not affect balance`() {
        val events = listOf(
            event("e1", totalAmount = 1000.0, status = EventStatus.CONFIRMED, date = today)
        )
        val payments = listOf(payment("p1", eventId = "other", amount = 9999.0))

        assertEquals(1000.0, derivePendingPaymentBalance(events, payments, today))
    }

    private fun event(
        id: String,
        totalAmount: Double,
        status: EventStatus,
        date: LocalDate? = null,
        dateString: String? = null
    ): CachedEvent {
        val rawDate = dateString ?: date.toString()
        return CachedEvent(
            id = id,
            userId = "u1",
            clientId = "c1",
            eventDate = rawDate,
            startTime = null,
            endTime = null,
            serviceType = "photo",
            numPeople = 1,
            status = status,
            discount = 0.0,
            discountType = DiscountType.PERCENT,
            requiresInvoice = false,
            taxRate = 0.0,
            taxAmount = 0.0,
            totalAmount = totalAmount,
            location = null,
            city = null,
            depositPercent = null,
            cancellationDays = null,
            refundPercent = null,
            notes = null,
            photos = null,
            createdAt = rawDate,
            updatedAt = rawDate,
            syncStatus = SyncStatus.SYNCED
        )
    }

    private fun payment(id: String, eventId: String, amount: Double): CachedPayment {
        return CachedPayment(
            id = id,
            eventId = eventId,
            userId = "u1",
            amount = amount,
            paymentDate = today.toString(),
            paymentMethod = "CASH",
            notes = null,
            createdAt = today.toString()
        )
    }

    // --- deriveMonthlyRevenue (server snapshot fallback, #828) ---

    @Test
    fun `monthly revenue includes confirmed and completed events this month`() {
        val events = listOf(
            event("e1", totalAmount = 1000.0, status = EventStatus.CONFIRMED, date = today),
            event("e2", totalAmount = 2000.0, status = EventStatus.COMPLETED, date = today.minusDays(5))
        )

        assertEquals(3000.0, deriveMonthlyRevenue(events, today))
    }

    @Test
    fun `monthly revenue excludes quoted and cancelled events`() {
        val events = listOf(
            event("e1", totalAmount = 1000.0, status = EventStatus.QUOTED, date = today),
            event("e2", totalAmount = 500.0, status = EventStatus.CANCELLED, date = today),
            event("e3", totalAmount = 800.0, status = EventStatus.CONFIRMED, date = today)
        )

        assertEquals(800.0, deriveMonthlyRevenue(events, today))
    }

    @Test
    fun `monthly revenue excludes events from a different month`() {
        val lastMonth = today.minusMonths(1)
        val events = listOf(
            event("e1", totalAmount = 5000.0, status = EventStatus.COMPLETED, date = lastMonth),
            event("e2", totalAmount = 1000.0, status = EventStatus.CONFIRMED, date = today)
        )

        assertEquals(1000.0, deriveMonthlyRevenue(events, today))
    }

    @Test
    fun `monthly revenue returns zero for empty event list`() {
        assertEquals(0.0, deriveMonthlyRevenue(emptyList(), today))
    }

    @Test
    fun `monthly revenue handles month boundary - last day of month included, first of next excluded`() {
        val endOfMonth = LocalDate.of(2026, 7, 31)
        val startOfNextMonth = LocalDate.of(2026, 8, 1)
        val events = listOf(
            event("e1", totalAmount = 1000.0, status = EventStatus.CONFIRMED, date = endOfMonth),
            event("e2", totalAmount = 2000.0, status = EventStatus.COMPLETED, date = startOfNextMonth)
        )

        // Only e1 is in July; e2 is August.
        assertEquals(1000.0, deriveMonthlyRevenue(events, today))
    }

    // --- deriveUpcomingEventsCount (extracted from KpiWidget, #852) ---

    @Test
    fun `upcoming count includes confirmed and quoted future events`() {
        val events = listOf(
            event("e1", totalAmount = 1000.0, status = EventStatus.CONFIRMED, date = today),
            event("e2", totalAmount = 2000.0, status = EventStatus.QUOTED, date = today.plusDays(3))
        )

        assertEquals(2, deriveUpcomingEventsCount(events, today))
    }

    @Test
    fun `upcoming count excludes cancelled events`() {
        val events = listOf(
            event("e1", totalAmount = 1000.0, status = EventStatus.CANCELLED, date = today),
            event("e2", totalAmount = 500.0, status = EventStatus.CONFIRMED, date = today)
        )

        assertEquals(1, deriveUpcomingEventsCount(events, today))
    }

    @Test
    fun `upcoming count excludes past events`() {
        val events = listOf(
            event("e1", totalAmount = 1000.0, status = EventStatus.CONFIRMED, date = today.minusDays(1)),
            event("e2", totalAmount = 500.0, status = EventStatus.CONFIRMED, date = today)
        )

        assertEquals(1, deriveUpcomingEventsCount(events, today))
    }

    @Test
    fun `upcoming count treats today as upcoming`() {
        val events = listOf(
            event("e1", totalAmount = 1000.0, status = EventStatus.COMPLETED, date = today)
        )

        assertEquals(1, deriveUpcomingEventsCount(events, today))
    }

    @Test
    fun `upcoming count returns zero for empty list`() {
        assertEquals(0, deriveUpcomingEventsCount(emptyList(), today))
    }

    @Test
    fun `upcoming count discards events with unparseable dates`() {
        val events = listOf(
            event("e1", totalAmount = 1000.0, status = EventStatus.CONFIRMED, dateString = "invalid"),
            event("e2", totalAmount = 500.0, status = EventStatus.CONFIRMED, date = today)
        )

        assertEquals(1, deriveUpcomingEventsCount(events, today))
    }
}

