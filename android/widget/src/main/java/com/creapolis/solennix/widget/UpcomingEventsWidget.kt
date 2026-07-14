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
import com.creapolis.solennix.core.database.entity.asExternalModel
import com.creapolis.solennix.core.model.Event
import kotlinx.coroutines.flow.first

class UpcomingEventsWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        // Fetch upcoming events from database
        val database = SolennixDatabase.getInstance(context)
        val userId = WidgetAuthProvider.getUserId(context)
        val events = if (userId == null) {
            // Signed out or prefs unreadable: never query Room — empty list
            // avoids surfacing another tenant's events (#825).
            emptyList()
        } else {
            try {
                // Pass local-calendar today — SQLite date('now') is UTC and would miss
                // today's events for LATAM users (e.g. UTC-6 where date('now') jumps
                // ahead at 18:00 local). Mirrors iOS Calendar.current.startOfDay (#834).
                val today = java.time.LocalDate.now().toString()
                database.eventDao().getUpcomingEvents(userId, today, 3)
                    .first()
                    .map { it.asExternalModel() }
            } catch (e: Exception) {
                emptyList()
            }
        }

        provideContent {
            WidgetContent(context, userId, events)
        }
    }

    @Composable
    private fun WidgetContent(context: Context, userId: String?, events: List<Event>) {
        val state = determineWidgetState(userId, hasData = events.isNotEmpty())
        if (state != null) {
            WidgetStateView(context, state)
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
            // Header
            Row(
                modifier = GlanceModifier.fillMaxWidth(),
                horizontalAlignment = Alignment.Start,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Próximos Eventos",
                    style = TextStyle(
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                        color = WidgetColors.primary
                    )
                )
            }

            Spacer(modifier = GlanceModifier.height(8.dp))

            Column(
                modifier = GlanceModifier.fillMaxWidth()
            ) {
                events.take(3).forEach { event ->
                    EventRow(event)
                    if (event != events.last()) {
                        Spacer(modifier = GlanceModifier.height(6.dp))
                    }
                }
            }
        }
    }

    @Composable
    private fun EventRow(event: Event) {
        val formattedDate = WidgetFormatters.formatEventDate(event.eventDate)

        Row(
            modifier = GlanceModifier
                .fillMaxWidth()
                .background(WidgetColors.card)
                .cornerRadius(8.dp)
                .padding(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Date indicator
            Column(
                modifier = GlanceModifier
                    .background(WidgetColors.dateChipBg)
                    .cornerRadius(6.dp)
                    .padding(horizontal = 8.dp, vertical = 4.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = formattedDate.day,
                    style = TextStyle(
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = WidgetColors.primary
                    )
                )
                Text(
                    text = formattedDate.month,
                    style = TextStyle(
                        fontSize = 10.sp,
                        color = WidgetColors.primary
                    )
                )
            }

            Spacer(modifier = GlanceModifier.width(8.dp))

            // Event info
            Column(modifier = GlanceModifier.defaultWeight()) {
                Text(
                    text = event.serviceType,
                    style = TextStyle(
                        fontWeight = FontWeight.Medium,
                        fontSize = 12.sp,
                        color = WidgetColors.textPrimary
                    ),
                    maxLines = 1
                )
                Text(
                    text = "${event.numPeople} personas",
                    style = TextStyle(
                        fontSize = 10.sp,
                        color = WidgetColors.textSecondary
                    ),
                    maxLines = 1
                )
            }
        }
    }
}
