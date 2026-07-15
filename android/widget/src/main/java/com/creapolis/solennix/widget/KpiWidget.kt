package com.creapolis.solennix.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.*
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.layout.*
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import com.creapolis.solennix.core.database.SolennixDatabase
import kotlinx.coroutines.flow.first
import java.time.LocalDate

class KpiWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val database = SolennixDatabase.getInstance(context)
        val userId = WidgetAuthProvider.getUserId(context)

        val result = if (userId == null) {
            // Signed out or prefs unreadable: never query Room — fall back to
            // the signed-out state so we cannot surface another tenant's rows (#825).
            KpiResult.State(WidgetState.SIGNED_OUT)
        } else {
            try {
                val events = database.eventDao().getEvents(userId).first()
                val payments = database.paymentDao().getPayments(userId).first()
                val today = LocalDate.now()

                // Server-authoritative KPI snapshot (written by the dashboard after
                // /dashboard/summary). Preferred over client-side derivation for exact
                // parity with the backend's netSalesThisMonth (#828). Null on cold launch
                // before the first dashboard load — falls back to deriveMonthlyRevenue.
                val snapshot = WidgetKpiStore.read(context)

                val upcomingEvents = deriveUpcomingEventsCount(events, today)

                val monthlyRevenue = snapshot?.netSalesThisMonth
                    ?: deriveMonthlyRevenue(events, today)

                val pendingPayments = derivePendingPaymentBalance(events, payments, today)

                KpiResult.Data(
                    KpiData(
                        upcomingEvents = upcomingEvents,
                        monthlyRevenue = monthlyRevenue,
                        pendingPayments = pendingPayments
                    )
                )
            } catch (e: Exception) {
                KpiResult.State(WidgetState.ERROR)
            }
        }

        provideContent {
            WidgetContent(context, result)
        }
    }

    @Composable
    private fun WidgetContent(context: Context, result: KpiResult) {
        when (result) {
            is KpiResult.State -> WidgetStateView(context, result.state)
            is KpiResult.Data -> KpiContent(context, result.kpiData)
        }
    }

    @Composable
    private fun KpiContent(context: Context, kpiData: KpiData) {
        Column(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(WidgetColors.background)
                .padding(12.dp)
                .clickable(actionStartActivity(getLaunchIntent(context))),
            verticalAlignment = Alignment.Top,
            horizontalAlignment = Alignment.Start
        ) {
            // Header
            Text(
                text = context.getString(R.string.widget_kpi_title),
                style = TextStyle(
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = WidgetColors.primary
                )
            )

            Spacer(modifier = GlanceModifier.height(12.dp))

            // KPI Grid
            Row(
                modifier = GlanceModifier.fillMaxWidth(),
                horizontalAlignment = Alignment.Start
            ) {
                // Upcoming Events
                KpiCard(
                    modifier = GlanceModifier.defaultWeight(),
                    value = kpiData.upcomingEvents.toString(),
                    label = context.getString(R.string.widget_kpi_upcoming),
                    accentColor = WidgetColors.primary
                )

                Spacer(modifier = GlanceModifier.width(8.dp))

                // Monthly Revenue
                KpiCard(
                    modifier = GlanceModifier.defaultWeight(),
                    value = WidgetFormatters.formatCurrency(kpiData.monthlyRevenue),
                    label = context.getString(R.string.widget_kpi_this_month),
                    accentColor = WidgetColors.success
                )
            }

            Spacer(modifier = GlanceModifier.height(8.dp))

            // Pending payments row
            Row(
                modifier = GlanceModifier
                    .fillMaxWidth()
                    .background(WidgetColors.card)
                    .cornerRadius(8.dp)
                    .padding(12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalAlignment = Alignment.Start
            ) {
                Column(modifier = GlanceModifier.defaultWeight()) {
                    Text(
                        text = context.getString(R.string.widget_kpi_pending_payments),
                        style = TextStyle(
                            fontSize = 11.sp,
                            color = WidgetColors.textSecondary
                        )
                    )
                }
                Text(
                    text = WidgetFormatters.formatCurrency(kpiData.pendingPayments),
                    style = TextStyle(
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp,
                        color = if (kpiData.pendingPayments > 0.0) WidgetColors.warning else WidgetColors.success
                    )
                )
            }
        }
    }

    @Composable
    private fun KpiCard(
        modifier: GlanceModifier,
        value: String,
        label: String,
        accentColor: ColorProvider
    ) {
        Column(
            modifier = modifier
                .background(WidgetColors.card)
                .cornerRadius(8.dp)
                .padding(12.dp),
            horizontalAlignment = Alignment.Start
        ) {
            Text(
                text = value,
                style = TextStyle(
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    color = accentColor
                )
            )
            Spacer(modifier = GlanceModifier.height(2.dp))
            Text(
                text = label,
                style = TextStyle(
                    fontSize = 11.sp,
                    color = WidgetColors.textSecondary
                )
            )
        }
    }

    private data class KpiData(
        val upcomingEvents: Int,
        val monthlyRevenue: Double,
        val pendingPayments: Double
    )

    /**
     * Sealed result distinguishing widget auth/error states from rendered data.
     * [State] wraps a [WidgetState] (SIGNED_OUT / EMPTY / ERROR); [Data] carries KPI values.
     */
    private sealed interface KpiResult {
        data class State(val state: WidgetState) : KpiResult
        data class Data(val kpiData: KpiData) : KpiResult
    }
}
