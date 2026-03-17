package com.creapolis.solennix.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.glance.*
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.provideContent
import androidx.glance.layout.*
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider

class UpcomingEventsWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            WidgetContent()
        }
    }

    @Composable
    private fun WidgetContent() {
        Column(
            modifier = GlanceModifier
                .fillMaxSize()
                .padding(16.dp),
            verticalAlignment = Alignment.Top,
            horizontalAlignment = Alignment.Start
        ) {
            Text(
                text = "Proximo Evento",
                style = TextStyle(fontWeight = FontWeight.Bold, fontSize = 16.glanceSp)
            )
            Spacer(modifier = GlanceModifier.height(8.dp))
            Box(
                modifier = GlanceModifier
                    .fillMaxWidth()
                    .padding(8.dp)
            ) {
                Column {
                    Text(text = "Boda Perez", style = TextStyle(fontWeight = FontWeight.Medium))
                    Text(text = "15 de Octubre", style = TextStyle(fontSize = 12.glanceSp))
                }
            }
        }
    }
}

private val Int.glanceSp get() = androidx.glance.unit.sp(this)
