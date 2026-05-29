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
    val today = LocalDate.now().toString()
    if (event.eventDate == today && event.status == EventStatus.CONFIRMED) {
        eventDayNotificationManager.showEventNotification(event, client)
    }
}
