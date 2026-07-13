package com.creapolis.solennix.core.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Server-authoritative KPI snapshot persisted for the home-screen widget, mirroring iOS
 * App Group `widget_kpis`. The dashboard writes this after each `/dashboard/summary` fetch;
 * the widget prefers it over client-side derivation to guarantee parity with the backend's
 * `netSalesThisMonth` (issue #828).
 *
 * All fields default to zero so a freshly-installed app (no snapshot yet) degrades cleanly:
 * the widget falls back to a cache-derived sum.
 *
 * @property netSalesThisMonth matches backend `net_sales_this_month` (confirmed + completed
 *           events in the current calendar month, post-discount `totalAmount` sum).
 * @property eventsThisMonth matches backend `events_this_month`.
 * @property updatedAt ISO timestamp of the last write, for staleness/debugging.
 */
@Serializable
data class WidgetKpiSnapshot(
    @SerialName("net_sales_this_month") val netSalesThisMonth: Double = 0.0,
    @SerialName("events_this_month") val eventsThisMonth: Int = 0,
    @SerialName("updated_at") val updatedAt: String = ""
)
