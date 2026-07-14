package com.creapolis.solennix.widget

import android.content.Context
import com.creapolis.solennix.core.data.security.SecurePrefsProvider
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/**
 * Provides the current logged-in user ID to widgets.
 *
 * Widgets cannot use Hilt DI, so this helper reads the cached user from
 * the shared encrypted prefs via [SecurePrefsProvider].
 */
object WidgetAuthProvider {

    private const val KEY_USER_JSON = "current_user"

    private val json = Json { ignoreUnknownKeys = true }

    fun getUserId(context: Context): String? {
        return try {
            val prefs = SecurePrefsProvider.get(context)
            parseUserIdFromUserJson(prefs.getString(KEY_USER_JSON, null))
        } catch (_: Exception) {
            null
        }
    }

    internal fun parseUserIdFromUserJson(userJson: String?): String? {
        if (userJson.isNullOrBlank()) return null
        return try {
            val jsonObj = json.parseToJsonElement(userJson).jsonObject
            jsonObj["id"]?.jsonPrimitive?.content
        } catch (_: Exception) {
            null
        }
    }
}
