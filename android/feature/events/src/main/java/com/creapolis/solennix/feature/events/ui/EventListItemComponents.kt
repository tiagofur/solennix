package com.creapolis.solennix.feature.events.ui

import android.content.Context
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.ExperimentalSharedTransitionApi
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarToday
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.creapolis.solennix.core.designsystem.component.SkeletonLoading
import com.creapolis.solennix.core.designsystem.component.StatusBadge
import com.creapolis.solennix.core.designsystem.theme.SolennixTheme
import com.creapolis.solennix.core.designsystem.util.LocalNavAnimatedVisibilityScope
import com.creapolis.solennix.core.designsystem.util.LocalSharedTransitionScope
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.EventStatus
import com.creapolis.solennix.core.model.extensions.asMXN
import com.creapolis.solennix.core.model.extensions.parseFlexibleDate
import com.creapolis.solennix.feature.events.R
import kotlinx.coroutines.delay
import java.time.format.DateTimeFormatter
import java.util.Locale
import androidx.compose.material.icons.filled.*
import androidx.compose.ui.hapticfeedback.HapticFeedbackType

@Composable
fun EventListSkeleton() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(top = 8.dp)
    ) {
        repeat(5) {
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
                shape = MaterialTheme.shapes.medium
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        SkeletonLoading(
                            modifier = Modifier
                                .height(20.dp)
                                .fillMaxWidth(0.45f)
                        )
                        SkeletonLoading(
                            modifier = Modifier
                                .height(24.dp)
                                .width(92.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))
                    SkeletonLoading(
                        modifier = Modifier
                            .height(16.dp)
                            .fillMaxWidth(0.7f)
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    SkeletonLoading(
                        modifier = Modifier
                            .height(16.dp)
                            .fillMaxWidth(0.55f)
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    HorizontalDivider(color = SolennixTheme.colors.divider)
                    Spacer(modifier = Modifier.height(12.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        SkeletonLoading(
                            modifier = Modifier
                                .height(16.dp)
                                .width(110.dp)
                        )
                        SkeletonLoading(
                            modifier = Modifier
                                .height(20.dp)
                                .width(90.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun AnimatedEventListItem(
    index: Int,
    event: Event,
    clientName: String?,
    isUpdatingStatus: Boolean,
    onClick: () -> Unit,
    onLongClick: () -> Unit
) {
    var visible by remember(event.id) { mutableStateOf(false) }

    val context = LocalContext.current
    val durationScale = remember {
        android.provider.Settings.Global.getFloat(
            context.contentResolver,
            android.provider.Settings.Global.ANIMATOR_DURATION_SCALE,
            1f
        )
    }

    LaunchedEffect(event.id) {
        if (durationScale > 0f) {
            delay((index.coerceAtMost(5) * 45L * durationScale).toLong())
        }
        visible = true
    }

    AnimatedVisibility(
        visible = visible,
        enter = fadeIn() + slideInVertically(initialOffsetY = { it / 6 }),
        label = "eventListItemVisibility"
    ) {
        EventListItem(
            event = event,
            clientName = clientName,
            isUpdatingStatus = isUpdatingStatus,
            onClick = onClick,
            onLongClick = onLongClick
        )
    }
}

@OptIn(ExperimentalSharedTransitionApi::class, ExperimentalFoundationApi::class)
@Composable
private fun EventListItem(
    event: Event,
    clientName: String?,
    isUpdatingStatus: Boolean,
    onClick: () -> Unit,
    onLongClick: () -> Unit
) {
    val context = LocalContext.current
    val allDayLabel = stringResource(R.string.events_list_all_day)
    val clientFallback = stringResource(R.string.events_list_client_fallback)
    val eventDate = remember(event.eventDate) {
        val dateFormatter = DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.getDefault())
        parseFlexibleDate(event.eventDate)?.format(dateFormatter) ?: event.eventDate
    }
    val timeLabel = remember(event.startTime, event.endTime, allDayLabel) {
        val start = event.startTime
        when {
            start.isNullOrEmpty() -> allDayLabel
            !event.endTime.isNullOrEmpty() -> "${start.take(5)} - ${event.endTime!!.take(5)}"
            else -> start.take(5)
        }
    }
    val locationLabel = remember(event.location, event.city) {
        listOfNotNull(event.location?.takeIf { it.isNotEmpty() }, event.city?.takeIf { it.isNotEmpty() }).joinToString(", ")
    }
    val accessibilitySummary = remember(event, clientName, eventDate, locationLabel, timeLabel) {
        eventCardTalkBackLabel(
            context = context,
            event = event,
            clientName = clientName,
            formattedDate = eventDate,
            timeLabel = timeLabel,
            locationLabel = locationLabel
        )
    }
    val haptic = LocalHapticFeedback.current

    val sharedTransitionScope = LocalSharedTransitionScope.current
    val animatedVisibilityScope = LocalNavAnimatedVisibilityScope.current
    val baseModifier = Modifier
        .fillMaxWidth()
        .padding(horizontal = 16.dp, vertical = 4.dp)
        .semantics(mergeDescendants = true) { contentDescription = accessibilitySummary }
    val cardModifier = if (sharedTransitionScope != null && animatedVisibilityScope != null) {
        with(sharedTransitionScope) {
            Modifier.sharedBounds(
                rememberSharedContentState(key = "event_card_${event.id}"),
                animatedVisibilityScope = animatedVisibilityScope
            ).then(baseModifier)
        }
    } else baseModifier

    Card(
        modifier = cardModifier.combinedClickable(
            onClick = onClick,
            onLongClick = {
                haptic.performHapticFeedback(HapticFeedbackType.LongPress)
                onLongClick()
            }
        ),
        colors = CardDefaults.cardColors(containerColor = SolennixTheme.colors.card),
        shape = MaterialTheme.shapes.medium
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = clientName ?: clientFallback,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold,
                    color = SolennixTheme.colors.primaryText,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f).padding(end = 8.dp)
                )
                if (isUpdatingStatus) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(16.dp),
                        strokeWidth = 2.dp,
                        color = SolennixTheme.colors.primary
                    )
                } else {
                    StatusBadge(status = event.status.name.lowercase())
                }
            }

            Text(
                text = event.serviceType,
                style = MaterialTheme.typography.bodySmall,
                color = SolennixTheme.colors.secondaryText,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.CalendarToday,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
                        tint = SolennixTheme.colors.secondaryText
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = eventDate,
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.secondaryText
                    )
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.Schedule,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
                        tint = SolennixTheme.colors.secondaryText
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = timeLabel,
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.secondaryText
                    )
                }
            }

            event.location?.takeIf { it.isNotEmpty() }?.let {
                Spacer(modifier = Modifier.height(4.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.LocationOn,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
                        tint = SolennixTheme.colors.secondaryText
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = locationLabel,
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.secondaryText,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))
            HorizontalDivider(color = SolennixTheme.colors.divider)
            Spacer(modifier = Modifier.height(8.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.People,
                        contentDescription = null,
                        modifier = Modifier.size(14.dp),
                        tint = SolennixTheme.colors.secondaryText
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = stringResource(R.string.events_list_people_count, event.numPeople),
                        style = MaterialTheme.typography.bodySmall,
                        color = SolennixTheme.colors.secondaryText
                    )
                }
                Text(
                    text = event.totalAmount.asMXN(),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = SolennixTheme.colors.primary
                )
            }
        }
    }
}

private fun localizedEventStatus(context: Context, status: EventStatus): String = when (status) {
    EventStatus.QUOTED -> context.getString(R.string.events_list_status_quoted)
    EventStatus.CONFIRMED -> context.getString(R.string.events_list_status_confirmed)
    EventStatus.COMPLETED -> context.getString(R.string.events_list_status_completed)
    EventStatus.CANCELLED -> context.getString(R.string.events_list_status_cancelled)
}

internal fun eventCardTalkBackLabel(
    context: Context,
    event: Event,
    clientName: String?,
    formattedDate: String,
    timeLabel: String,
    locationLabel: String
): String {
    val resolvedClient = clientName?.takeIf { it.isNotBlank() }
        ?: context.getString(R.string.events_list_client_fallback)
    val localizedStatus = localizedEventStatus(context, event.status)
    val total = event.totalAmount.asMXN()

    return if (locationLabel.isNotBlank()) {
        context.getString(
            R.string.events_list_a11y_summary,
            event.serviceType,
            localizedStatus,
            formattedDate,
            timeLabel,
            resolvedClient,
            locationLabel,
            event.numPeople,
            total
        )
    } else {
        context.getString(
            R.string.events_list_a11y_summary_no_location,
            event.serviceType,
            localizedStatus,
            formattedDate,
            timeLabel,
            resolvedClient,
            event.numPeople,
            total
        )
    }
}