package com.creapolis.solennix.feature.events.ui

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.EventStatus
import com.creapolis.solennix.core.model.UnavailableDate
import com.creapolis.solennix.feature.events.R
import com.creapolis.solennix.core.model.extensions.parseFlexibleDate
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.TextStyle
import java.util.Locale

/**
 * Reusable calendar grid component extracted from CalendarScreen.
 * Displays monthly calendar with event indicators, unavailable date highlighting,
 * and support for date selection and long-press interactions.
 *
 * @param currentMonth Month to display
 * @param selectedDate Currently selected date
 * @param onDateSelected Callback when a date is tapped
 * @param events List of events to show indicators for
 * @param unavailableDates List of unavailable date ranges
 * @param onDateLongPress Optional callback when a date is long-pressed (for block/unblock dialogs)
 * @param modifier Optional modifier
 */
@OptIn(ExperimentalFoundationApi::class)
@Composable
fun CalendarGrid(
    currentMonth: YearMonth,
    selectedDate: LocalDate,
    onDateSelected: (LocalDate) -> Unit,
    events: List<Event>,
    unavailableDates: List<UnavailableDate> = emptyList(),
    onDateLongPress: (LocalDate) -> Unit = {},
    modifier: Modifier = Modifier
) {
    val daysInMonth = currentMonth.lengthOfMonth()
    val firstDayOfMonth = currentMonth.atDay(1).dayOfWeek.value % 7 // Sunday = 0
    val days = (1..daysInMonth).toList()
    val previousMonthDays = (0 until firstDayOfMonth).map { null }
    val allDays = previousMonthDays + days

    val errorColor = SolennixTheme.colors.error
    val today = LocalDate.now()
    val haptic = LocalHapticFeedback.current

    Column(modifier = Modifier.padding(horizontal = 8.dp)) {
        // Day of week headers
        Row(modifier = Modifier.fillMaxWidth()) {
            listOf("D", "L", "M", "M", "J", "V", "S").forEach { day ->
                Text(
                    text = day,
                    modifier = Modifier.weight(1f),
                    textAlign = TextAlign.Center,
                    style = MaterialTheme.typography.labelMedium,
                    color = SolennixTheme.colors.secondaryText
                )
            }
        }

        Spacer(modifier = Modifier.height(8.dp))

        // Calendar grid
        LazyVerticalGrid(
            columns = GridCells.Fixed(7),
            modifier = modifier.height(280.dp)
        ) {
            items(allDays) { day ->
                if (day != null) {
                    val date = currentMonth.atDay(day)
                    val isSelected = date == selectedDate
                    val isToday = date == today
                    val dateStr = date.toString()
                    val isBlocked = unavailableDates.any { ud ->
                        dateStr >= ud.startDate && dateStr <= ud.endDate
                    }
                    val eventsOnDate = events.filter {
                        parseFlexibleDate(it.eventDate) == date
                    }
                    val hasEvents = eventsOnDate.isNotEmpty()

                    // Calculate overflow for events count display
                    val uniqueDotsCount = eventsOnDate.groupBy { it.status }.values.size.coerceAtMost(3)
                    val overflow = maxOf(0, eventsOnDate.size - uniqueDotsCount)

                    val bgColor = when {
                        isSelected -> SolennixTheme.colors.primary
                        isToday -> SolennixTheme.colors.primaryLight
                        isBlocked -> errorColor.copy(alpha = 0.15f)
                        else -> Color.Transparent
                    }

                    Box(
                        modifier = Modifier
                            .aspectRatio(1f)
                            .padding(4.dp)
                            .clip(CircleShape)
                            .background(bgColor)
                            .combinedClickable(
                                onClick = { onDateSelected(date) },
                                onLongClick = {
                                    // Haptic feedback when long-pressing
                                    haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                                    onDateLongPress(date)
                                }
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = day.toString(),
                                color = when {
                                    isSelected -> Color.White
                                    isToday -> SolennixTheme.colors.primary
                                    isBlocked -> errorColor
                                    else -> SolennixTheme.colors.primaryText
                                },
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = when {
                                    isSelected -> FontWeight.Bold
                                    isToday -> FontWeight.Bold
                                    isBlocked -> FontWeight.SemiBold
                                    else -> FontWeight.Normal
                                }
                            )
                            if (hasEvents && !isSelected) {
                                // Up to 3 colored dots by event status
                                Row(
                                    horizontalArrangement = Arrangement.spacedBy(2.dp),
                                    modifier = Modifier.padding(top = 2.dp)
                                ) {
                                    eventsOnDate.take(3).forEach { event ->
                                        Box(
                                            modifier = Modifier
                                                .size(4.dp)
                                                .clip(CircleShape)
                                                .background(getStatusColor(event.status.name))
                                        )
                                    }
                                }
                                // "+N más" overflow when more than 3 events
                                if (overflow > 0) {
                                    Text(
                                        text = "+$overflow",
                                        fontSize = 8.sp,
                                        color = SolennixTheme.colors.secondaryText,
                                        maxLines = 1
                                    )
                                }
                            }
                        }
                    }
                } else {
                    // Empty cell for padding days
                    Box(modifier = Modifier.aspectRatio(1f))
                }
            }
        }
    }
}

/**
 * Calendar header with month navigation controls.
 *
 * @param currentMonth Currently displayed month
 * @param onPreviousMonth Callback for previous month button
 * @param onNextMonth Callback for next month button
 * @param onGoToToday Optional callback for "Today" button
 */
@Composable
fun CalendarHeader(
    currentMonth: YearMonth,
    onPreviousMonth: () -> Unit,
    onNextMonth: () -> Unit,
    onGoToToday: () -> Unit = {}
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        IconButton(onClick = onPreviousMonth) {
            Icon(
                Icons.AutoMirrored.Filled.KeyboardArrowLeft,
                contentDescription = "Mes anterior"
            )
        }
        Text(
            text = "${currentMonth.month.getDisplayName(TextStyle.FULL, Locale.getDefault()).replaceFirstChar { it.uppercase() }} ${currentMonth.year}",
            style = MaterialTheme.typography.titleLarge,
            color = SolennixTheme.colors.primaryText
        )
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            OutlinedButton(
                onClick = onGoToToday,
                contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                border = ButtonDefaults.outlinedButtonBorder(enabled = true).copy(
                    brush = androidx.compose.ui.graphics.SolidColor(SolennixTheme.colors.primary)
                ),
                modifier = Modifier.height(32.dp)
            ) {
                Text(
                    "Hoy",
                    style = MaterialTheme.typography.labelMedium,
                    color = SolennixTheme.colors.primary,
                    fontWeight = FontWeight.SemiBold
                )
            }
            IconButton(onClick = onNextMonth) {
                Icon(
                    Icons.AutoMirrored.Filled.KeyboardArrowRight,
                    contentDescription = "Mes siguiente"
                )
            }
        }
    }
}

/**
 * Get status color for event indicators.
 */
@Composable
private fun getStatusColor(status: String): Color {
    return when (status) {
        "QUOTED" -> SolennixTheme.colors.statusQuoted
        "CONFIRMED" -> SolennixTheme.colors.statusConfirmed
        "COMPLETED" -> SolennixTheme.colors.statusCompleted
        "CANCELLED" -> SolennixTheme.colors.statusCancelled
        else -> SolennixTheme.colors.secondaryText
    }
}
