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
import com.creapolis.solennix.core.database.entity.asExternalModel
import com.creapolis.solennix.core.model.Event
import kotlinx.coroutines.flow.first
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

class UpcomingEventsWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        // Fetch upcoming events from database
        val database = SolennixDatabase.getInstance(context)
        val events = try {
            database.eventDao().getUpcomingEvents(3).first()
                .map { it.asExternalModel() }
        } catch (e: Exception) {
            emptyList()
        }

        provideContent {
            WidgetContent(context, events)
        }
    }

    @Composable
    private fun WidgetContent(context: Context, events: List<Event>) {
        val primaryColor = Color(0xFFC4A265)
        val backgroundColor = Color(0xFFFAF9F6)
        val textPrimary = Color(0xFF1A1A1A)
        val textSecondary = Color(0xFF7A7670)

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
                        color = ColorProvider(primaryColor)
                    )
                )
            }

            Spacer(modifier = GlanceModifier.height(8.dp))

            if (events.isEmpty()) {
                Box(
                    modifier = GlanceModifier
                        .fillMaxWidth()
                        .defaultWeight(),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "Sin eventos próximos",
                        style = TextStyle(
                            fontSize = 12.sp,
                            color = ColorProvider(textSecondary)
                        )
                    )
                }
            } else {
                Column(
                    modifier = GlanceModifier.fillMaxWidth()
                ) {
                    events.take(3).forEach { event ->
                        EventRow(event, textPrimary, textSecondary, primaryColor)
                        if (event != events.last()) {
                            Spacer(modifier = GlanceModifier.height(6.dp))
                        }
                    }
                }
            }
        }
    }

    @Composable
    private fun EventRow(
        event: Event,
        textPrimary: Color,
        textSecondary: Color,
        accentColor: Color
    ) {
        val formattedDate = formatEventDate(event.eventDate)

        Row(
            modifier = GlanceModifier
                .fillMaxWidth()
                .background(ColorProvider(Color.White))
                .cornerRadius(8.dp)
                .padding(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Date indicator
            Column(
                modifier = GlanceModifier
                    .background(ColorProvider(accentColor.copy(alpha = 0.15f)))
                    .cornerRadius(6.dp)
                    .padding(horizontal = 8.dp, vertical = 4.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = formattedDate.day,
                    style = TextStyle(
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp,
                        color = ColorProvider(accentColor)
                    )
                )
                Text(
                    text = formattedDate.month,
                    style = TextStyle(
                        fontSize = 10.sp,
                        color = ColorProvider(accentColor)
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
                        color = ColorProvider(textPrimary)
                    ),
                    maxLines = 1
                )
                Text(
                    text = "${event.numPeople} personas",
                    style = TextStyle(
                        fontSize = 10.sp,
                        color = ColorProvider(textSecondary)
                    ),
                    maxLines = 1
                )
            }
        }
    }

    private fun getLaunchIntent(context: Context): Intent {
        return context.packageManager.getLaunchIntentForPackage(context.packageName)
            ?: Intent()
    }

    private fun formatEventDate(dateString: String): FormattedDate {
        return try {
            val date = LocalDate.parse(dateString.take(10))
            val dayFormatter = DateTimeFormatter.ofPattern("d")
            val monthFormatter = DateTimeFormatter.ofPattern("MMM", Locale("es", "MX"))
            FormattedDate(
                day = date.format(dayFormatter),
                month = date.format(monthFormatter).uppercase()
            )
        } catch (e: Exception) {
            FormattedDate("--", "---")
        }
    }

    private data class FormattedDate(val day: String, val month: String)
}
