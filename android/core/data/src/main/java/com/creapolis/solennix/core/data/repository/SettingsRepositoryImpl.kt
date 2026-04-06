package com.creapolis.solennix.core.data.repository

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
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
    private val apiService: ApiService
) : SettingsRepository {

    private val THEME_CONFIG_KEY = stringPreferencesKey("theme_config")

    override val themeConfig: Flow<ThemeConfig> = dataStore.data.map { preferences ->
        val themeString = preferences[THEME_CONFIG_KEY] ?: ThemeConfig.SYSTEM_DEFAULT.name
        try {
            ThemeConfig.valueOf(themeString)
        } catch (e: IllegalArgumentException) {
            ThemeConfig.SYSTEM_DEFAULT
        }
    }

    override suspend fun setThemeConfig(config: ThemeConfig) {
        dataStore.edit { preferences ->
            preferences[THEME_CONFIG_KEY] = config.name
        }
    }

    override suspend fun registerFcmToken(token: String) {
        try {
            apiService.post<Any>(Endpoints.REGISTER_DEVICE, mapOf("token" to token))
        } catch (e: Exception) {
            // Log error but don't fail
            android.util.Log.e("SettingsRepository", "Failed to register FCM token", e)
        }
    }
}
