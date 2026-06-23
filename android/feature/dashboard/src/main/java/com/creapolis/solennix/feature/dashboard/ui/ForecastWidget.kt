package com.creapolis.solennix.feature.dashboard.ui

import android.content.Context
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.ForecastDataPoint
import com.creapolis.solennix.core.model.extensions.asMXNCompact
import com.creapolis.solennix.feature.dashboard.R
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import java.util.Locale

@Composable
fun ForecastWidget(
    forecast: List<ForecastDataPoint>,
    isLoading: Boolean,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val locale = remember(context) {
        context.resources.configuration.locales[0] ?: Locale.getDefault()
    }
    val monthFormatter = remember(locale) {
        DateTimeFormatter.ofPattern("MMM yyyy", locale)
    }

    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.large
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                stringResource(R.string.dashboard_widget_forecast_title),
                style = MaterialTheme.typography.titleSmall,
                color = SolennixTheme.colors.primaryText,
                fontWeight = FontWeight.SemiBold
            )

            when {
                isLoading -> {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        repeat(2) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(48.dp)
                                    .background(
                                        SolennixTheme.colors.surfaceAlt,
                                        RoundedCornerShape(8.dp)
                                    )
                            )
                        }
                    }
                }
                forecast.isEmpty() -> {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 16.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            stringResource(R.string.dashboard_widget_forecast_empty),
                            style = MaterialTheme.typography.bodySmall,
                            color = SolennixTheme.colors.secondaryText
                        )
                    }
                }
                else -> {
                    // Summary grid side-by-side
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Column(
                            modifier = Modifier
                                .weight(1f)
                                .background(SolennixTheme.colors.surfaceAlt, RoundedCornerShape(8.dp))
                                .padding(12.dp)
                        ) {
                            Text(
                                text = stringResource(R.string.dashboard_widget_forecast_projected_revenue),
                                style = MaterialTheme.typography.labelSmall,
                                color = SolennixTheme.colors.secondaryText
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            val totalRevenue = forecast.sumOf { it.confirmedRevenue }
                            Text(
                                text = totalRevenue.asMXNCompact(),
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.SemiBold,
                                color = SolennixTheme.colors.primaryText
                            )
                        }

                        Column(
                            modifier = Modifier
                                .weight(1f)
                                .background(SolennixTheme.colors.surfaceAlt, RoundedCornerShape(8.dp))
                                .padding(12.dp)
                        ) {
                            Text(
                                text = stringResource(R.string.dashboard_widget_forecast_confirmed_events),
                                style = MaterialTheme.typography.labelSmall,
                                color = SolennixTheme.colors.secondaryText
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            val totalEvents = forecast.sumOf { it.confirmedEvents }
                            Text(
                                text = totalEvents.toString(),
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.SemiBold,
                                color = SolennixTheme.colors.primaryText
                            )
                        }
                    }

                    // Monthly list (first 6 items, matching iOS's forecast.prefix(6))
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        forecast.take(6).forEach { point ->
                            val monthLabel = try {
                                val parsed = YearMonth.parse(point.month)
                                parsed.format(monthFormatter).replaceFirstChar { it.uppercase() }
                            } catch (_: Exception) {
                                point.month
                            }

                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(SolennixTheme.colors.surfaceAlt, RoundedCornerShape(8.dp))
                                    .padding(12.dp)
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Text(
                                        text = monthLabel,
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.Medium,
                                        color = SolennixTheme.colors.primaryText
                                    )
                                    Text(
                                        text = point.confirmedRevenue.asMXNCompact(),
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.SemiBold,
                                        color = SolennixTheme.colors.primaryText
                                    )
                                }
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = pluralStringResource(
                                        R.plurals.dashboard_widget_forecast_events,
                                        point.confirmedEvents,
                                        point.confirmedEvents
                                    ),
                                    style = MaterialTheme.typography.labelSmall,
                                    color = SolennixTheme.colors.secondaryText
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
