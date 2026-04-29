package com.creapolis.solennix.feature.dashboard.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.TrendingUp
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.ForecastDataPoint
import com.creapolis.solennix.core.model.extensions.asMXNCompact

@Composable
fun ForecastWidget(
    forecast: List<ForecastDataPoint>,
    isLoading: Boolean,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.large
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                "Pronóstico de Ingresos",
                style = MaterialTheme.typography.titleSmall,
                color = SolennixTheme.colors.primaryText,
                fontWeight = FontWeight.SemiBold
            )
            Spacer(modifier = Modifier.height(12.dp))

            when {
                isLoading -> {
                    repeat(3) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp)
                                .padding(vertical = 4.dp)
                                .background(
                                    SolennixTheme.colors.surfaceAlt,
                                    RoundedCornerShape(8.dp)
                                )
                        )
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
                            "No hay datos aún",
                            style = MaterialTheme.typography.bodySmall,
                            color = SolennixTheme.colors.secondaryText
                        )
                    }
                }
                else -> {
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(forecast) { point ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(8.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(
                                    modifier = Modifier.weight(1f),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    Icon(
                                        Icons.Default.TrendingUp,
                                        contentDescription = null,
                                        tint = SolennixTheme.colors.kpiGreen,
                                        modifier = Modifier.size(20.dp)
                                    )
                                    Column {
                                        Text(
                                            point.month,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = SolennixTheme.colors.primaryText,
                                            fontWeight = FontWeight.Medium
                                        )
                                        Text(
                                            "${point.confirmedEvents} eventos proyectados",
                                            style = MaterialTheme.typography.labelSmall,
                                            color = SolennixTheme.colors.secondaryText
                                        )
                                    }
                                }
                                Text(
                                    point.confirmedRevenue.asMXNCompact(),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = SolennixTheme.colors.kpiGreen,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
