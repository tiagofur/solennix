package com.creapolis.solennix.core.network

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import com.creapolis.solennix.core.model.Client
import com.creapolis.solennix.core.model.Event
import com.creapolis.solennix.core.model.EventStatus
import dagger.hilt.android.qualifiers.ApplicationContext
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Gestiona notificaciones persistentes para eventos del dia.
 * Equivalente Android de iOS Live Activities.
 */
@Singleton
class EventDayNotificationManager @Inject constructor(
    @ApplicationContext private val context: Context
) {

    companion object {
        private const val CHANNEL_ID = "event_day"
        private const val CHANNEL_NAME = "Eventos del Dia"
        private const val CHANNEL_DESCRIPTION = "Notificaciones persistentes para eventos programados hoy"
        private const val NOTIFICATION_TAG = "event_day_notification"
        private const val SOLENNIX_GOLD_ARGB = 0xFFC4A265.toInt()
    }

    private val notificationManager =
        context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

    init {
        createNotificationChannel()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = CHANNEL_DESCRIPTION
                setShowBadge(true)
            }
            notificationManager.createNotificationChannel(channel)
        }
    }

    /**
     * Muestra una notificacion persistente para un evento del dia.
     */
    fun showEventNotification(event: Event, client: Client) {
        val notificationId = event.id.hashCode()

        // Intent para abrir el detalle del evento
        val viewIntent = Intent(Intent.ACTION_VIEW, Uri.parse("solennix://event/${event.id}")).apply {
            setPackage(context.packageName)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val viewPendingIntent = PendingIntent.getActivity(
            context,
            notificationId,
            viewIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // Intent para marcar como finalizado
        val finishIntent = Intent(Intent.ACTION_VIEW, Uri.parse("solennix://event/${event.id}/complete")).apply {
            setPackage(context.packageName)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val finishPendingIntent = PendingIntent.getActivity(
            context,
            notificationId + 1,
            finishIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val startTimeText = event.startTime?.let { "Hoy a las $it" } ?: "Hoy"
        val locationText = event.location ?: event.city ?: ""
        val guestText = "${event.numPeople} invitados"

        val contentParts = listOfNotNull(
            startTimeText,
            locationText.takeIf { it.isNotBlank() },
            guestText
        )
        val contentText = contentParts.joinToString(" \u00b7 ")

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_menu_my_calendar)
            .setContentTitle("${client.name} - ${event.serviceType}")
            .setContentText(contentText)
            .setStyle(NotificationCompat.BigTextStyle().bigText(contentText))
            .setOngoing(true)
            .setAutoCancel(false)
            .setColor(SOLENNIX_GOLD_ARGB)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_STATUS)
            .setContentIntent(viewPendingIntent)
            .addAction(
                android.R.drawable.ic_menu_view,
                "Ver Evento",
                viewPendingIntent
            )
            .addAction(
                android.R.drawable.ic_menu_close_clear_cancel,
                "Finalizar",
                finishPendingIntent
            )
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .build()

        notificationManager.notify(NOTIFICATION_TAG, notificationId, notification)
    }

    /**
     * Actualiza el texto de una notificacion existente para un evento.
     */
    fun updateEventNotification(eventId: String, status: String) {
        val notificationId = eventId.hashCode()

        val notification = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_menu_my_calendar)
            .setContentTitle("Evento en curso")
            .setContentText("Estado: $status")
            .setOngoing(true)
            .setAutoCancel(false)
            .setColor(SOLENNIX_GOLD_ARGB)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_STATUS)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .build()

        notificationManager.notify(NOTIFICATION_TAG, notificationId, notification)
    }

    /**
     * Cancela la notificacion persistente de un evento.
     */
    fun dismissEventNotification(eventId: String) {
        val notificationId = eventId.hashCode()
        notificationManager.cancel(NOTIFICATION_TAG, notificationId)
    }

    /**
     * Verifica los eventos de hoy y muestra notificaciones persistentes
     * para los que estan confirmados.
     */
    fun checkAndShowTodayEvents(events: List<Event>, clients: Map<String, Client>) {
        val today = LocalDate.now().toString() // formato yyyy-MM-dd

        val todayConfirmedEvents = events.filter { event ->
            event.eventDate == today && event.status == EventStatus.CONFIRMED
        }

        // Cancelar notificaciones de eventos que ya no son de hoy o confirmados
        val todayEventIds = todayConfirmedEvents.map { it.id }.toSet()
        events.filter { it.id !in todayEventIds }.forEach { event ->
            dismissEventNotification(event.id)
        }

        // Mostrar notificaciones para eventos confirmados de hoy
        todayConfirmedEvents.forEach { event ->
            val client = clients[event.clientId]
            if (client != null) {
                showEventNotification(event, client)
            }
        }
    }
}
