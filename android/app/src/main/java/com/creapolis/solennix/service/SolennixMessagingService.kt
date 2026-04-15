package com.creapolis.solennix.service

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import com.creapolis.solennix.MainActivity
import com.creapolis.solennix.core.data.repository.SettingsRepository
import com.creapolis.solennix.core.network.AuthManager
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.android.EntryPointAccessors
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

class SolennixMessagingService : FirebaseMessagingService() {

    @EntryPoint
    @InstallIn(SingletonComponent::class)
    interface ServiceEntryPoint {
        fun settingsRepository(): SettingsRepository
        fun authManager(): AuthManager
    }

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)

        val deepLinkUri = buildDeepLinkUriFromData(message.data)
        
        message.notification?.let {
            showNotification(this, it.title ?: "Solennix", it.body ?: "", deepLinkUri)
        } ?: run {
            // Handle data-only messages
            val title = message.data["title"] ?: "Solennix"
            val body = message.data["body"] ?: ""
            if (body.isNotEmpty()) {
                showNotification(this, title, body, deepLinkUri)
            }
        }
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        
        val entryPoint = EntryPointAccessors.fromApplication(
            applicationContext,
            ServiceEntryPoint::class.java
        )
        val authManager = entryPoint.authManager()
        val settingsRepository = entryPoint.settingsRepository()

        authManager.storeFcmToken(token)
        
        serviceScope.launch {
            if (authManager.authState.value == AuthManager.AuthState.Authenticated) {
                settingsRepository.registerFcmToken(token)
            }
        }
    }

    private fun showNotification(context: Context, title: String, body: String, deepLinkUri: Uri?) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channelId = "solennix_notifications"

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "Notificaciones Generales",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Notificaciones de eventos, pagos y sistema"
            }
            notificationManager.createNotificationChannel(channel)
        }

        val intent = Intent(context, MainActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
            deepLinkUri?.let { data = it }
        }
        val pendingIntent = PendingIntent.getActivity(
            context, 0, intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val notification = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setContentIntent(pendingIntent)
            .build()

        notificationManager.notify(System.currentTimeMillis().toInt(), notification)
    }

    private fun buildDeepLinkUriFromData(data: Map<String, String>): Uri? {
        val deeplink = data["deeplink"] ?: data["deep_link"]
        if (!deeplink.isNullOrBlank()) {
            return Uri.parse(deeplink)
        }

        val rawType = data["type"] ?: data["entity_type"] ?: data["target"] ?: return null
        val type = rawType.lowercase()
        val id = data["id"] ?: data["entity_id"] ?: data["event_id"] ?: data["client_id"] ?: data["product_id"]
        val query = data["query"] ?: data["q"]

        return when (type) {
            "event", "event_detail" -> id?.let { Uri.parse("solennix://event/$it") }
            "event_checklist", "checklist" -> id?.let { Uri.parse("solennix://event/$it/checklist") }
            "event_finances", "finances" -> id?.let { Uri.parse("solennix://event/$it/finances") }
            "event_payments", "payments" -> id?.let { Uri.parse("solennix://event/$it/payments") }
            "event_products" -> id?.let { Uri.parse("solennix://event/$it/products") }
            "event_extras" -> id?.let { Uri.parse("solennix://event/$it/extras") }
            "event_equipment" -> id?.let { Uri.parse("solennix://event/$it/equipment") }
            "event_supplies" -> id?.let { Uri.parse("solennix://event/$it/supplies") }
            "event_shopping", "shopping" -> id?.let { Uri.parse("solennix://event/$it/shopping") }
            "event_photos", "photos" -> id?.let { Uri.parse("solennix://event/$it/photos") }
            "event_contract", "contract" -> id?.let { Uri.parse("solennix://event/$it/contract") }
            "event_complete", "complete" -> id?.let { Uri.parse("solennix://event/$it/complete") }
            "client", "client_detail" -> id?.let { Uri.parse("solennix://client/$it") }
            "product", "product_detail" -> id?.let { Uri.parse("solennix://product/$it") }
            "inventory", "inventory_detail" -> id?.let { Uri.parse("solennix://inventory/$it") }
            "calendar" -> Uri.parse("solennix://calendar")
            "settings" -> Uri.parse("solennix://settings")
            "pricing" -> Uri.parse("solennix://pricing")
            "search" -> {
                if (query.isNullOrBlank()) Uri.parse("solennix://search")
                else Uri.parse("solennix://search?query=$query")
            }
            "new_event", "new-event" -> Uri.parse("solennix://new-event")
            "quick_quote", "quick-quote" -> {
                if (id.isNullOrBlank()) {
                    Uri.parse("solennix://quick-quote")
                } else {
                    Uri.parse("solennix://quick-quote/$id")
                }
            }
            "reset_password", "reset-password" -> {
                val token = data["token"] ?: return null
                Uri.parse("solennix://reset-password?token=$token")
            }
            else -> null
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        serviceScope.cancel()
    }
}
