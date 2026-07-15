package com.creapolis.solennix.widget

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
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
import com.creapolis.solennix.core.model.EventStatus
import kotlinx.coroutines.flow.first
import java.time.LocalDate

class QuickActionsWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val database = SolennixDatabase.getInstance(context)
        val userId = WidgetAuthProvider.getUserId(context)

        val todayData = if (userId == null) {
            // Signed out or prefs unreadable: never query Room — empty state
            // avoids surfacing another tenant's events (#825).
            TodayData(0, emptyList())
        } else {
            try {
                val events = database.eventDao().getEvents(userId).first()
                val today = LocalDate.now().toString()

                val todayEvents = events.filter {
                    it.eventDate.startsWith(today) && it.status != EventStatus.CANCELLED
                }

                TodayData(
                    eventCount = todayEvents.size,
                    events = todayEvents.take(2).map { event ->
                        TodayEvent(
                            time = WidgetFormatters.formatTime(event.eventDate),
                            serviceType = event.serviceType
                        )
                    }
                )
            } catch (e: Exception) {
                TodayData(0, emptyList())
            }
        }

        provideContent {
            WidgetContent(context, userId, todayData)
        }
    }

    @Composable
    private fun WidgetContent(context: Context, userId: String?, todayData: TodayData) {
        // Signed-out users see the auth prompt instead of empty data with no explanation.
        if (userId == null) {
            WidgetStateView(context, WidgetState.SIGNED_OUT)
            return
        }

        Column(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(WidgetColors.background)
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
                        text = WidgetFormatters.formatTodayDate(),
                        style = TextStyle(
                            fontWeight = FontWeight.Bold,
                            fontSize = rememberScaledSp(14f),
                            color = WidgetColors.primary
                        )
                    )
                    if (todayData.eventCount > 0) {
                        Text(
                            text = context.resources.getQuantityString(
                                R.plurals.widget_events_today,
                                todayData.eventCount,
                                todayData.eventCount
                            ),
                            style = TextStyle(
                                fontSize = rememberScaledSp(11f),
                                color = WidgetColors.textSecondary
                            )
                        )
                    } else {
                        Text(
                            text = context.getString(R.string.widget_quick_no_events_today),
                            style = TextStyle(
                                fontSize = rememberScaledSp(11f),
                                color = WidgetColors.textSecondary
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
                            .background(WidgetColors.card)
                            .cornerRadius(6.dp)
                            .padding(horizontal = 8.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = event.time,
                            style = TextStyle(
                                fontWeight = FontWeight.Medium,
                                fontSize = rememberScaledSp(11f),
                                color = WidgetColors.primary
                            )
                        )
                        Spacer(modifier = GlanceModifier.width(6.dp))
                        Text(
                            text = event.serviceType,
                            style = TextStyle(
                                fontSize = rememberScaledSp(11f),
                                color = WidgetColors.textPrimary
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
                        .background(WidgetColors.buttonBg)
                        .cornerRadius(8.dp)
                        .padding(vertical = 8.dp, horizontal = 4.dp)
                        .clickable(actionStartActivity(getDeepLinkIntent(context, "solennix://new-event"))),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = context.getString(R.string.widget_quick_new_event),
                        style = TextStyle(
                            fontWeight = FontWeight.Medium,
                            fontSize = rememberScaledSp(11f),
                            color = WidgetColors.primary
                        )
                    )
                }

                Spacer(modifier = GlanceModifier.width(6.dp))

                // Nueva Cotizacion
                Box(
                    modifier = GlanceModifier
                        .defaultWeight()
                        .background(WidgetColors.buttonBg)
                        .cornerRadius(8.dp)
                        .padding(vertical = 8.dp, horizontal = 4.dp)
                        .clickable(actionStartActivity(getDeepLinkIntent(context, "solennix://quick-quote"))),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = context.getString(R.string.widget_quick_new_quote),
                        style = TextStyle(
                            fontWeight = FontWeight.Medium,
                            fontSize = rememberScaledSp(11f),
                            color = WidgetColors.primary
                        )
                    )
                }

                Spacer(modifier = GlanceModifier.width(6.dp))

                // Ver Calendario
                Box(
                    modifier = GlanceModifier
                        .defaultWeight()
                        .background(WidgetColors.buttonBg)
                        .cornerRadius(8.dp)
                        .padding(vertical = 8.dp, horizontal = 4.dp)
                        .clickable(actionStartActivity(getDeepLinkIntent(context, "solennix://calendar"))),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = context.getString(R.string.widget_quick_calendar),
                        style = TextStyle(
                            fontWeight = FontWeight.Medium,
                            fontSize = rememberScaledSp(11f),
                            color = WidgetColors.primary
                        )
                    )
                }
            }
        }
    }

    private fun getDeepLinkIntent(context: Context, deepLink: String): Intent {
        return Intent(Intent.ACTION_VIEW, Uri.parse(deepLink)).apply {
            setPackage(context.packageName)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
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
