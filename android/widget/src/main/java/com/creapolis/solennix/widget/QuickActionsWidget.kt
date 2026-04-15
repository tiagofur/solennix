package com.creapolis.solennix.widget

import android.content.Context
import android.content.Intent
import android.net.Uri
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
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

class QuickActionsWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val database = SolennixDatabase.getInstance(context)
        val userId = WidgetAuthProvider.getUserId(context)

        val todayData = try {
            val events = if (userId != null) {
                database.eventDao().getEvents(userId).first()
            } else {
                database.eventDao().getEvents().first()
            }
            val today = LocalDate.now().toString()

            val todayEvents = events.filter {
                it.eventDate.startsWith(today) && it.status != EventStatus.CANCELLED
            }

            TodayData(
                eventCount = todayEvents.size,
                events = todayEvents.take(2).map { event ->
                    TodayEvent(
                        time = formatTime(event.eventDate),
                        serviceType = event.serviceType
                    )
                }
            )
        } catch (e: Exception) {
            TodayData(0, emptyList())
        }

        provideContent {
            WidgetContent(context, todayData)
        }
    }

    @Composable
    private fun WidgetContent(context: Context, todayData: TodayData) {
        val primaryColor = Color(0xFFC4A265)
        val backgroundColor = Color(0xFFFAF9F6)
        val textPrimary = Color(0xFF1A1A1A)
        val textSecondary = Color(0xFF7A7670)
        val buttonBackground = Color(0xFFF5F0E8)

        Column(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(ColorProvider(backgroundColor))
                .padding(12.dp)
                .clickable(actionStartActivity(getLaunchIntent(context))),
            verticalAlignment = Alignment.Top,
            horizontalAlignment = Alignment.Start
        ) {
            // Header with today's date
            Row(
                modifier = GlanceModifier.fillMaxWidth(),
                horizontalAlignment = Alignment.Start,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = GlanceModifier.defaultWeight()) {
                    Text(
                        text = formatTodayDate(),
                        style = TextStyle(
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp,
                            color = ColorProvider(primaryColor)
                        )
                    )
                    if (todayData.eventCount > 0) {
                        Text(
                            text = "${todayData.eventCount} evento${if (todayData.eventCount > 1) "s" else ""} hoy",
                            style = TextStyle(
                                fontSize = 11.sp,
                                color = ColorProvider(textSecondary)
                            )
                        )
                    } else {
                        Text(
                            text = "Sin eventos hoy",
                            style = TextStyle(
                                fontSize = 11.sp,
                                color = ColorProvider(textSecondary)
                            )
                        )
                    }
                }
            }

            Spacer(modifier = GlanceModifier.height(8.dp))

            // Today's events (compact list)
            if (todayData.events.isNotEmpty()) {
                todayData.events.forEach { event ->
                    Row(
                        modifier = GlanceModifier
                            .fillMaxWidth()
                            .background(ColorProvider(Color.White))
                            .cornerRadius(6.dp)
                            .padding(horizontal = 8.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = event.time,
                            style = TextStyle(
                                fontWeight = FontWeight.Medium,
                                fontSize = 11.sp,
                                color = ColorProvider(primaryColor)
                            )
                        )
                        Spacer(modifier = GlanceModifier.width(6.dp))
                        Text(
                            text = event.serviceType,
                            style = TextStyle(
                                fontSize = 11.sp,
                                color = ColorProvider(textPrimary)
                            ),
                            maxLines = 1
                        )
                    }
                    Spacer(modifier = GlanceModifier.height(4.dp))
                }
            }

            Spacer(modifier = GlanceModifier.defaultWeight())

            // Quick action buttons
            Row(
                modifier = GlanceModifier.fillMaxWidth(),
                horizontalAlignment = Alignment.Start
            ) {
                // Nuevo Evento
                Box(
                    modifier = GlanceModifier
                        .defaultWeight()
                        .background(ColorProvider(buttonBackground))
                        .cornerRadius(8.dp)
                        .padding(vertical = 8.dp, horizontal = 4.dp)
                        .clickable(actionStartActivity(getDeepLinkIntent(context, "solennix://new-event"))),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "＋ Evento",
                        style = TextStyle(
                            fontWeight = FontWeight.Medium,
                            fontSize = 11.sp,
                            color = ColorProvider(primaryColor)
                        )
                    )
                }

                Spacer(modifier = GlanceModifier.width(6.dp))

                // Nueva Cotizacion
                Box(
                    modifier = GlanceModifier
                        .defaultWeight()
                        .background(ColorProvider(buttonBackground))
                        .cornerRadius(8.dp)
                        .padding(vertical = 8.dp, horizontal = 4.dp)
                        .clickable(actionStartActivity(getDeepLinkIntent(context, "solennix://quick-quote"))),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "＋ Cotizar",
                        style = TextStyle(
                            fontWeight = FontWeight.Medium,
                            fontSize = 11.sp,
                            color = ColorProvider(primaryColor)
                        )
                    )
                }

                Spacer(modifier = GlanceModifier.width(6.dp))

                // Ver Calendario
                Box(
                    modifier = GlanceModifier
                        .defaultWeight()
                        .background(ColorProvider(buttonBackground))
                        .cornerRadius(8.dp)
                        .padding(vertical = 8.dp, horizontal = 4.dp)
                        .clickable(actionStartActivity(getDeepLinkIntent(context, "solennix://calendar"))),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Calendario",
                        style = TextStyle(
                            fontWeight = FontWeight.Medium,
                            fontSize = 11.sp,
                            color = ColorProvider(primaryColor)
                        )
                    )
                }
            }
        }
    }

    private fun getLaunchIntent(context: Context): Intent {
        return context.packageManager.getLaunchIntentForPackage(context.packageName)
            ?: Intent()
    }

    private fun getDeepLinkIntent(context: Context, deepLink: String): Intent {
        return Intent(Intent.ACTION_VIEW, Uri.parse(deepLink)).apply {
            setPackage(context.packageName)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
    }

    private fun formatTodayDate(): String {
        val today = LocalDate.now()
        val formatter = DateTimeFormatter.ofPattern("EEEE d 'de' MMMM", Locale("es", "MX"))
        return today.format(formatter).replaceFirstChar { it.uppercase() }
    }

    private fun formatTime(dateString: String): String {
        return try {
            // Expected format: 2026-03-20T15:30:00 or similar
            if (dateString.contains("T") && dateString.length >= 16) {
                dateString.substring(11, 16)
            } else {
                ""
            }
        } catch (e: Exception) {
            ""
        }
    }

    private data class TodayData(
        val eventCount: Int,
        val events: List<TodayEvent>
    )

    private data class TodayEvent(
        val time: String,
        val serviceType: String
    )
}
