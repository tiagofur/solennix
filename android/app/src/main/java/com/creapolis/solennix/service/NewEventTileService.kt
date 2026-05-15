package com.creapolis.solennix.service

import android.app.PendingIntent
import android.content.Intent
import android.net.Uri
import android.service.quicksettings.TileService
import com.creapolis.solennix.MainActivity

class NewEventTileService : TileService() {
    override fun onClick() {
        val intent = Intent(this, MainActivity::class.java).apply {
            action = Intent.ACTION_VIEW
            data = Uri.parse("solennix://new-event")
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        startActivityAndCollapse(pendingIntent)
    }
}
