package com.creapolis.solennix.feature.products.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.People
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.*
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.extensions.asMXN
import com.creapolis.solennix.feature.products.ProductStrings
import java.time.LocalDate
import java.time.temporal.ChronoUnit

data class DemandDataPoint(
    val eventId: String,
    val eventDate: String, // YYYY-MM-DD
    val clientName: String,
    val quantity: Int,
    val numPeople: Int,
    val unitPrice: Double = 0.0
) {
    val revenue: Double get() = quantity * unitPrice
}

@Composable
fun DemandForecastChart(
    dataPoints: List<DemandDataPoint>,
    productName: String,
    basePrice: Double = 0.0,
    modifier: Modifier = Modifier
) {
    val colors = SolennixTheme.colors

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = MaterialTheme.shapes.medium,
        colors = CardDefaults.cardColors(containerColor = colors.card),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.BarChart,
                        contentDescription = null,
                        tint = colors.primary,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = ProductStrings.demandByDate,
                        style = MaterialTheme.typography.titleMedium,
                        color = colors.primaryText
                    )
                }
                Text(
                    text = ProductStrings.confirmedEvents,
                    style = MaterialTheme.typography.labelSmall,
                    color = colors.secondaryText
                )
            }

            if (dataPoints.isNotEmpty()) {
                DemandBarChart(
                    dataPoints = dataPoints,
                    barColor = colors.primary,
                    labelColor = colors.secondaryText,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(180.dp)
                )

                // Summary stats
                val totalQuantity = dataPoints.sumOf { it.quantity }
                val totalPeople = dataPoints.sumOf { it.numPeople }
                val totalRevenue = dataPoints.sumOf { dp ->
                    if (dp.unitPrice > 0) dp.revenue else dp.quantity * basePrice
                }

                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text(
                        text = ProductStrings.upcomingEventsCount(dataPoints.size),
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Medium,
                        color = colors.primaryText
                    )
                    Text(
                        text = ProductStrings.totalSummary(totalQuantity, totalPeople),
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.secondaryText
                    )
                }

                HorizontalDivider(color = colors.divider)

                // Event list with urgency badges
                val today = LocalDate.now()
                dataPoints.take(5).forEach { point ->
                    DemandEventRow(
                        point = point,
                        basePrice = basePrice,
                        today = today,
                        colors = colors
                    )
                }

                // Total row
                if (totalQuantity > 0) {
                    HorizontalDivider(color = colors.divider)
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(
                                text = ProductStrings.totalDemand,
                                style = MaterialTheme.typography.labelSmall,
                                color = colors.secondaryText
                            )
                            Text(
                                text = ProductStrings.eventCount(dataPoints.size),
                                style = MaterialTheme.typography.bodySmall,
                                color = colors.secondaryText
                            )
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text(
                                text = ProductStrings.quantityUnits(totalQuantity),
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.Bold,
                                color = colors.primaryText
                            )
                            if (totalRevenue > 0) {
                                Text(
                                    text = ProductStrings.estimatedRevenueShort(totalRevenue.asMXN()),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = colors.secondaryText
                                )
                            }
                        }
                    }
                }
            } else {
                DemandEmptyState(colors = colors)
            }
        }
    }
}

@Composable
private fun DemandBarChart(
    dataPoints: List<DemandDataPoint>,
    barColor: Color,
    labelColor: Color,
    modifier: Modifier = Modifier
) {
    val maxQuantity = dataPoints.maxOf { it.quantity }.coerceAtLeast(1)
    val dateFormatter = ProductStrings.shortDateFormatter()

    val textMeasurer = rememberTextMeasurer()
    val labelStyle = TextStyle(
        fontSize = 10.sp,
        color = labelColor
    )
    val valueStyle = TextStyle(
        fontSize = 10.sp,
        color = barColor,
        fontWeight = FontWeight.Bold
    )

    Canvas(modifier = modifier) {
        val barCount = dataPoints.size
        val bottomLabelHeight = 36f
        val topPadding = 20f
        val chartHeight = size.height - bottomLabelHeight - topPadding
        val barSpacing = 12f
        val totalSpacing = barSpacing * (barCount + 1)
        val barWidth = ((size.width - totalSpacing) / barCount).coerceAtMost(48f)
        val totalBarsWidth = barWidth * barCount + barSpacing * (barCount + 1)
        val startX = (size.width - totalBarsWidth) / 2f

        dataPoints.forEachIndexed { index, point ->
            val barHeight = (point.quantity.toFloat() / maxQuantity) * chartHeight
            val x = startX + barSpacing + index * (barWidth + barSpacing)
            val y = topPadding + chartHeight - barHeight

            drawRoundRect(
                color = barColor,
                topLeft = Offset(x, y),
                size = Size(barWidth, barHeight),
                cornerRadius = CornerRadius(4f, 4f)
            )

            val valueText = "${point.quantity}"
            val valueLayout = textMeasurer.measure(valueText, valueStyle)
            drawText(
                textLayoutResult = valueLayout,
                topLeft = Offset(
                    x + (barWidth - valueLayout.size.width) / 2f,
                    y - valueLayout.size.height - 2f
                )
            )

            val dateLabel = try {
                LocalDate.parse(point.eventDate).format(dateFormatter)
            } catch (_: Exception) {
                point.eventDate.takeLast(5)
            }
            val dateLabelLayout = textMeasurer.measure(dateLabel, labelStyle)
            drawText(
                textLayoutResult = dateLabelLayout,
                topLeft = Offset(
                    x + (barWidth - dateLabelLayout.size.width) / 2f,
                    topPadding + chartHeight + 8f
                )
            )
        }
    }
}

@Composable
private fun DemandEventRow(
    point: DemandDataPoint,
    basePrice: Double,
    today: LocalDate,
    colors: com.creapolis.solennix.core.designsystem.theme.SolennixColorScheme
) {
    val dateFormatter = ProductStrings.longDateFormatter()
    val eventDate = try {
        LocalDate.parse(point.eventDate)
    } catch (_: Exception) {
        null
    }
    val formattedDate = eventDate?.format(dateFormatter) ?: point.eventDate
    val diffDays = eventDate?.let { ChronoUnit.DAYS.between(today, it).toInt() } ?: Int.MAX_VALUE
    val isUrgent = diffDays <= 3
    val isThisWeek = diffDays in 4..7

    val bgColor = when {
        isUrgent -> colors.primary.copy(alpha = 0.08f)
        isThisWeek -> Color(0xFFFFF3E0) // warning light
        else -> colors.surfaceGrouped
    }
    val dotColor = when {
        isUrgent -> colors.primary
        isThisWeek -> Color(0xFFFF9800) // warning
        else -> colors.primary.copy(alpha = 0.4f)
    }

    val revenue = if (point.unitPrice > 0) point.revenue else point.quantity * basePrice

    Surface(
        shape = MaterialTheme.shapes.medium,
        color = bgColor,
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Urgency dot
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .clip(CircleShape)
                    .background(dotColor)
            )

            Spacer(modifier = Modifier.width(10.dp))

            Column(modifier = Modifier.weight(1f)) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        text = formattedDate,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium,
                        color = colors.primaryText
                    )
                    // Urgency badge
                    when (diffDays) {
                        0 -> UrgencyBadge(ProductStrings.today, colors.primary)
                        1 -> UrgencyBadge(ProductStrings.tomorrow, Color(0xFFFF9800))
                        in 2..7 -> Text(
                            text = ProductStrings.inDays(diffDays),
                            style = MaterialTheme.typography.labelSmall,
                            color = colors.secondaryText
                        )
                    }
                }
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = point.clientName,
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.secondaryText
                    )
                    if (point.numPeople > 0) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.People,
                                contentDescription = null,
                                modifier = Modifier.size(12.dp),
                                tint = colors.tertiaryText
                            )
                            Spacer(modifier = Modifier.width(2.dp))
                            Text(
                                text = "${point.numPeople}",
                                style = MaterialTheme.typography.labelSmall,
                                color = colors.tertiaryText
                            )
                        }
                    }
                }
            }

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    text = ProductStrings.quantityUnits(point.quantity),
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold,
                    color = colors.primaryText
                )
                if (revenue > 0) {
                    Text(
                        text = revenue.asMXN(),
                        style = MaterialTheme.typography.bodySmall,
                        color = colors.secondaryText
                    )
                }
            }
        }
    }
}

@Composable
private fun UrgencyBadge(text: String, color: Color) {
    Text(
        text = text,
        style = MaterialTheme.typography.labelSmall,
        fontWeight = FontWeight.SemiBold,
        color = color,
        modifier = Modifier
            .background(color.copy(alpha = 0.1f), RoundedCornerShape(4.dp))
            .padding(horizontal = 6.dp, vertical = 2.dp)
    )
}

@Composable
private fun DemandEmptyState(
    colors: com.creapolis.solennix.core.designsystem.theme.SolennixColorScheme
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Icon(
            imageVector = Icons.Default.CalendarMonth,
            contentDescription = null,
            modifier = Modifier.size(32.dp),
            tint = colors.tertiaryText
        )
        Text(
            text = ProductStrings.noUpcomingEvents,
            style = MaterialTheme.typography.bodyMedium,
            color = colors.secondaryText
        )
        Text(
            text = ProductStrings.noUpcomingEventsDescription,
            style = MaterialTheme.typography.bodySmall,
            color = colors.tertiaryText
        )
    }
}
