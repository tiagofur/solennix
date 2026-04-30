package com.creapolis.solennix.core.data.repository

import android.util.Log
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.creapolis.solennix.core.data.locale.AppLocaleManager
import com.creapolis.solennix.core.model.ThemeConfig
import com.creapolis.solennix.core.network.ApiService
import com.creapolis.solennix.core.network.Endpoints
import com.creapolis.solennix.core.network.post
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SettingsRepositoryImpl @Inject constructor(
    private val dataStore: DataStore<Preferences>,
    private val apiService: ApiService,
    @dagger.hilt.android.qualifiers.ApplicationContext private val context: android.content.Context
) : SettingsRepository {

    private val THEME_CONFIG_KEY = stringPreferencesKey("theme_config")
    private val APP_LANGUAGE_KEY = stringPreferencesKey("app_language")

    override val themeConfig: Flow<ThemeConfig> = dataStore.data.map { preferences ->
        val themeString = preferences[THEME_CONFIG_KEY] ?: ThemeConfig.SYSTEM_DEFAULT.name
        try {
            ThemeConfig.valueOf(themeString)
        } catch (e: IllegalArgumentException) {
            ThemeConfig.SYSTEM_DEFAULT
        }
    }

    override val appLanguage: Flow<String> = dataStore.data.map { preferences ->
        preferences[APP_LANGUAGE_KEY] ?: ""
    }

    override suspend fun setThemeConfig(config: ThemeConfig) {
        dataStore.edit { preferences ->
            preferences[THEME_CONFIG_KEY] = config.name
        }
    }

    override suspend fun setAppLanguage(language: String) {
        val normalized = language.trim().lowercase().takeIf { it == "es" || it == "en" } ?: ""
        dataStore.edit { preferences ->
            preferences[APP_LANGUAGE_KEY] = normalized
        }
        AppLocaleManager.applyLanguage(context, normalized)
    }

    override suspend fun registerFcmToken(token: String) {
        try {
            apiService.post<Any>(Endpoints.REGISTER_DEVICE, mapOf("token" to token))
        } catch (e: Exception) {
            // Log error but don't fail
            Log.e("SettingsRepository", "Failed to register FCM token", e)
        }
    }
}
