package com.creapolis.solennix.widget

import android.content.Context
import android.content.Intent
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.*
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.provideContent
import androidx.glance.appwidget.cornerRadius
import androidx.glance.layout.*
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import com.creapolis.solennix.core.database.SolennixDatabase
import com.creapolis.solennix.core.model.EventStatus
import kotlinx.coroutines.flow.first
import java.text.NumberFormat
import java.time.LocalDate
import java.util.Locale

class KpiWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val database = SolennixDatabase.getInstance(context)
        val userId = WidgetAuthProvider.getUserId(context)

        val kpiData = try {
            val events = if (userId != null) {
                database.eventDao().getEvents(userId).first()
            } else {
                database.eventDao().getEvents().first()
            }
            val today = LocalDate.now().toString()
            val thisMonth = LocalDate.now().withDayOfMonth(1).toString()

            // Calculate KPIs
            val upcomingEvents = events.count {
                it.eventDate >= today && it.status != EventStatus.CANCELLED
            }

            val monthlyRevenue = events
                .filter { it.eventDate >= thisMonth && it.status == EventStatus.COMPLETED }
                .sumOf { it.totalAmount }

            val pendingPayments = events
                .filter { it.status == EventStatus.CONFIRMED || it.status == EventStatus.QUOTED }
                .size

            KpiData(
                upcomingEvents = upcomingEvents,
                monthlyRevenue = monthlyRevenue,
                pendingPayments = pendingPayments
            )
        } catch (e: Exception) {
            KpiData(0, 0.0, 0)
        }

        provideContent {
            WidgetContent(context, kpiData)
        }
    }

    @Composable
    private fun WidgetContent(context: Context, kpiData: KpiData) {
        val primaryColor = Color(0xFFC4A265)
        val backgroundColor = Color(0xFFFAF9F6)
        val textPrimary = Color(0xFF1A1A1A)
        val textSecondary = Color(0xFF7A7670)
        val successColor = Color(0xFF22C55E)
        val warningColor = Color(0xFFF59E0B)

        Column(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(ColorProvider(backgroundColor))
                .padding(12.dp)
                .clickable(actionStartActivity(getLaunchIntent(context))),
            verticalAlignment = Alignment.Top,
            horizontalAlignment = Alignment.Start
        ) {
            // Header
            Text(
                text = "Resumen",
                style = TextStyle(
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    color = ColorProvider(primaryColor)
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
                    label = "Próximos",
                    accentColor = primaryColor,
                    textPrimary = textPrimary,
                    textSecondary = textSecondary
                )

                Spacer(modifier = GlanceModifier.width(8.dp))

                // Monthly Revenue
                KpiCard(
                    modifier = GlanceModifier.defaultWeight(),
                    value = formatCurrency(kpiData.monthlyRevenue),
                    label = "Este mes",
                    accentColor = successColor,
                    textPrimary = textPrimary,
                    textSecondary = textSecondary
                )
            }

            Spacer(modifier = GlanceModifier.height(8.dp))

            // Pending payments row
            Row(
                modifier = GlanceModifier
                    .fillMaxWidth()
                    .background(ColorProvider(Color.White))
                    .cornerRadius(8.dp)
                    .padding(12.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalAlignment = Alignment.Start
            ) {
                Column(modifier = GlanceModifier.defaultWeight()) {
                    Text(
                        text = "Pagos pendientes",
                        style = TextStyle(
                            fontSize = 11.sp,
                            color = ColorProvider(textSecondary)
                        )
                    )
                }
                Text(
                    text = kpiData.pendingPayments.toString(),
                    style = TextStyle(
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp,
                        color = ColorProvider(if (kpiData.pendingPayments > 0) warningColor else successColor)
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
        accentColor: Color,
        textPrimary: Color,
        textSecondary: Color
    ) {
        Column(
            modifier = modifier
                .background(ColorProvider(Color.White))
                .cornerRadius(8.dp)
                .padding(12.dp),
            horizontalAlignment = Alignment.Start
        ) {
            Text(
                text = value,
                style = TextStyle(
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp,
                    color = ColorProvider(accentColor)
                )
            )
            Spacer(modifier = GlanceModifier.height(2.dp))
            Text(
                text = label,
                style = TextStyle(
                    fontSize = 11.sp,
                    color = ColorProvider(textSecondary)
                )
            )
        }
    }

    private fun getLaunchIntent(context: Context): Intent {
        return context.packageManager.getLaunchIntentForPackage(context.packageName)
            ?: Intent()
    }

    private fun formatCurrency(amount: Double): String {
        return if (amount >= 1000) {
            val thousands = amount / 1000
            String.format(Locale("es", "MX"), "$%.1fk", thousands)
        } else {
            NumberFormat.getCurrencyInstance(Locale("es", "MX"))
                .format(amount)
                .replace(".00", "")
        }
    }

    private data class KpiData(
        val upcomingEvents: Int,
        val monthlyRevenue: Double,
        val pendingPayments: Int
    )
}
