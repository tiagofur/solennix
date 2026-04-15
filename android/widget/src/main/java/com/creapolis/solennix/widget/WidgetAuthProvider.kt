package com.creapolis.solennix.widget

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/**
 * Provides the current logged-in user ID to widgets.
 *
 * Widgets cannot use Hilt DI, so this helper recreates the same
 * EncryptedSharedPreferences used by [AuthManager] to read the cached user.
 */
object WidgetAuthProvider {

    private const val PREFS_NAME = "solennix_secure_prefs"
    private const val KEY_USER_JSON = "current_user"

    private val json = Json { ignoreUnknownKeys = true }

    fun getUserId(context: Context): String? {
        return try {
            val prefs = getEncryptedPrefs(context)
            val userJson = prefs.getString(KEY_USER_JSON, null) ?: return null
            val jsonObj = json.parseToJsonElement(userJson).jsonObject
            jsonObj["id"]?.jsonPrimitive?.content
        } catch (_: Exception) {
            null
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
