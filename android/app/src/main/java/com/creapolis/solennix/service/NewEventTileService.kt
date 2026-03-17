package com.creapolis.solennix.service

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
        startActivityAndCollapse(intent)
    }
}
