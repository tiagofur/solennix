package com.creapolis.solennix.feature.events.viewmodel

import com.creapolis.solennix.core.model.Client
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.EventStatus
import java.time.LocalDate

fun EventDetailViewModel.startEventDayNotification() {
    val event = _event.value ?: return
    val client = _client.value ?: return
    eventDayNotificationManager.showEventNotification(event, client)
}

fun EventDetailViewModel.stopEventDayNotification() {
    eventDayNotificationManager.dismissEventNotification(eventId)
}

internal fun EventDetailViewModel.checkAndShowEventDayNotification(event: Event?, client: Client?) {
    if (event == null || client == null) return
    // Take only the date part (yyyy-MM-dd) before comparing: eventDate may carry a
    // time/UTC suffix from the server, which would cause the equality check to fail.
    val today = LocalDate.now().toString()
    if (event.eventDate.take(10) == today && event.status == EventStatus.CONFIRMED) {
        eventDayNotificationManager.showEventNotification(event, client)
    }
}
