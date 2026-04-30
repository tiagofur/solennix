package com.creapolis.solennix.core.data.repository

import com.creapolis.solennix.core.model.ThemeConfig
import kotlinx.coroutines.flow.Flow

interface SettingsRepository {
    val themeConfig: Flow<ThemeConfig>
    val appLanguage: Flow<String>
    suspend fun setThemeConfig(config: ThemeConfig)
    suspend fun setAppLanguage(language: String)
    suspend fun registerFcmToken(token: String)
}
