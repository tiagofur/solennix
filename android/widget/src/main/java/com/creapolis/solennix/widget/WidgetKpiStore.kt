package com.creapolis.solennix.widget

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.creapolis.solennix.core.model.WidgetKpiSnapshot
import kotlinx.serialization.json.Json

/**
 * Persists the server-authoritative [WidgetKpiSnapshot] to the same encrypted prefs file
 * shared between the app and widget processes (same `applicationId` / UID). The dashboard
 * writes after each `/dashboard/summary` fetch; the widget reads in `provideGlance`.
 *
 * Mirrors the iOS App Group `widget_kpis` UserDefaults bridge. Storing KPIs in encrypted
 * prefs (rather than a separate plain file) keeps the snapshot under the same sandbox as
 * the user identity and avoids introducing a new shared-storage surface.
 *
 * All operations are best-effort: a read failure returns null (the widget falls back to a
 * cache-derived sum), a write failure is logged and swallowed (the widget keeps the
 * previous snapshot or falls back).
 */
object WidgetKpiStore {

    private const val PREFS_NAME = "solennix_secure_prefs"
    private const val KEY_KPI_SNAPSHOT = "widget_kpi_snapshot"

    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

    /**
     * Reads the last persisted snapshot, or null if none exists / decode fails / prefs are
     * unreadable. Safe to call from the widget process.
     */
    fun read(context: Context): WidgetKpiSnapshot? {
        return try {
            val raw = getEncryptedPrefs(context).getString(KEY_KPI_SNAPSHOT, null)
            if (raw.isNullOrBlank()) null
            else json.decodeFromString(WidgetKpiSnapshot.serializer(), raw)
        } catch (_: Exception) {
            null
        }
    }

    /**
     * Persists [snapshot]. Called from the app process after a successful dashboard summary
     * fetch. Uses [SharedPreferences.edit] + `apply()` (async, safe on the main thread).
     */
    fun write(context: Context, snapshot: WidgetKpiSnapshot) {
        try {
            val raw = json.encodeToString(WidgetKpiSnapshot.serializer(), snapshot)
            getEncryptedPrefs(context).edit().putString(KEY_KPI_SNAPSHOT, raw).apply()
        } catch (_: Exception) {
            // Swallow: the widget will keep using the previous snapshot (or fall back).
        }
    }

    /** Removes the snapshot — called on logout so the widget doesn't show stale KPIs. */
    fun clear(context: Context) {
        try {
            getEncryptedPrefs(context).edit().remove(KEY_KPI_SNAPSHOT).apply()
        } catch (_: Exception) {
            // Swallow: best-effort cleanup.
        }
    }

    private fun getEncryptedPrefs(context: Context): SharedPreferences {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        return EncryptedSharedPreferences.create(
            context,
            PREFS_NAME,
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }
}
