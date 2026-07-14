package com.creapolis.solennix.core.data.security

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * Single source of truth for creating [EncryptedSharedPreferences] instances.
 *
 * Consolidates 4 duplicated MasterKey + EncryptedSharedPreferences.create(...)
 * call sites that had drifted across modules (#854):
 * - [NetworkModule](com.creapolis.solennix.core.network.di.NetworkModule) (auth tokens)
 * - [WidgetAuthProvider](com.creapolis.solennix.widget.WidgetAuthProvider) (user ID)
 * - [WidgetKpiStore](com.creapolis.solennix.widget.WidgetKpiStore) (KPI snapshot)
 * - EventChecklistViewModel (checklist tick state)
 *
 * All sites used the identical scheme (AES256_GCM / AES256_SIV / AES256_GCM);
 * only the file name differed. This object caches one instance per file name
 * (keyed by application context) so the expensive key-load happens once per
 * process lifetime, which also improves the widget hot path that previously
 * rebuilt MasterKey on every read.
 *
 * Designed for use both with and without Hilt DI: the widget module has no
 * Hilt plugin, so it calls [get] directly with a Context. Hilt modules can
 * delegate to this object inside a @Provides binding.
 */
object SecurePrefsProvider {

    /** Shared auth/user prefs — written by AuthManager, read by the widget. */
    const val FILE_AUTH = "solennix_secure_prefs"

    /** Per-event checklist tick state. */
    const val FILE_CHECKLIST = "checklist_prefs_encrypted"

    private val cache = mutableMapOf<String, SharedPreferences>()

    /**
     * Returns a cached [EncryptedSharedPreferences] instance for [fileName].
     * Thread-safe via synchronized on the cache map.
     */
    @Synchronized
    fun get(context: Context, fileName: String = FILE_AUTH): SharedPreferences {
        val appContext = context.applicationContext
        return cache.getOrPut(fileName) {
            val masterKey = MasterKey.Builder(appContext)
                .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                .build()
            EncryptedSharedPreferences.create(
                appContext,
                fileName,
                masterKey,
                EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            )
        }
    }
}
